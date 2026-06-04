# Daily Feed + Video pipeline (canonical)

Every Coastal Directory site has a `/daily-feed` page that reads the **shared**
content pool and shows it in four lanes: **News · Social · Video · Blog**, with
an **All** view. One pipeline feeds every site; each site just filters to its
own category.

This folder is the copy-paste kit for adding the Daily Feed (and especially the
**video** lane) to any directory. See the `directory-video-feed` skill to do it
on demand.

## The shared content pool

- **Supabase project:** `vtlgfwldogsdueiahidp` (CollectiblesFind / CF).
- **Table:** `cf_content_items`. One row per item, shared by all sites.
- **Read access:** the site uses the **anon** key (read-only). Rows with
  `status='approved'` are public; `pending`/`rejected` never show on a site.

Key columns a site reads:

| column | notes |
|---|---|
| `type` | `news`, `social`, `video`, or `blog` — drives the lane filter |
| `category` | **Title-Case label** (e.g. `Coins`, `Comics`, `Sports Cards`). Must match the site's category exactly. |
| `title`, `summary`, `url`, `image_url`, `source_name`, `published_at` | display fields |
| `status` | only `approved` is shown on sites |
| `quality_score` | 1–10 from the Haiku classifier |
| `url_hash` | **GENERATED ALWAYS AS `md5(url)`** — dedup key. NEVER write it on insert; the DB computes it. |

## How content gets in

- **News** — n8n "CF News Agent" (RSS → Haiku → insert `type=news`).
- **Video** — n8n "CF YouTube Video Agent" (YouTube search → Haiku → insert
  `type=video`), twice daily across 12 categories. Workflow JSON is in this
  folder: `cf-youtube-agent.workflow.json`.
- **Auto-post rule (both agents):** `quality_score >= 5` → `approved` (goes
  live); below 5 or off-topic → `pending` (held for review, never deleted).
- **Review queue:** `admin-cf-r7k2p9q.html` (Collectiblefind repo) — password
  gated; filter by Status, **Type** (News/Video/Social), and Category.

## How a site's daily-feed.html works

It fetches all approved rows for its category (all types), then filters by lane
client-side so the pills are instant and the lane is shareable via `?type=`:

```
GET {SUPABASE_URL}/rest/v1/cf_content_items
    ?select=*&status=eq.approved&category=eq.{Category}
    &order=published_at.desc.nullslast,created_at.desc&limit=500
```

Drop-in code lives next to this file:
- `filter-bar.snippet.html` — the lane pill bar markup + CSS.
- `lane-filter.snippet.js` — `loadFeed` (all types) + `laneItems` +
  `updateLaneCounts` + `setLane` + the click handler.

## Add the Daily Feed video feed to a new directory

1. **Pick the category label** the site uses (must match a `category` value in
   `cf_content_items`, Title-Case — e.g. `Coins`). Add it as a pill on the site
   too if it has category pills.
2. **Cover it in the video agent:** open the n8n "CF YouTube Video Agent" →
   `Config` node → add a `{ label: "<Category>", queries: [...3 terms] }` entry
   to `CATEGORIES`. Save and **Publish** (n8n needs Publish, not just active).
3. **Wire the site's `daily-feed.html`:** paste `filter-bar.snippet.html` right
   before `<main ... id="df-feed">`, and replace `loadFeed`/`renderFeed` with
   `lane-filter.snippet.js` (set `category=eq.<Category>` and the slug). Match
   the site's accent color in the existing `.df-pill` CSS.
4. **Deploy:** commit just `daily-feed.html` and push (Netlify auto-builds).

## Gotchas (learned the hard way, 2026-06-03)

- `url_hash` is generated (`md5(url)`) — sending it on insert returns Postgres
  `428C9`. Let the DB compute it. The agent still computes `md5(url)` locally
  for its own dedup lookup, which matches.
- n8n Code-node sandbox has **no `URLSearchParams`** and may block
  `require('crypto')` — build query strings manually and use a pure-JS md5.
- `category` must be an **exact Title-Case match**; the site filters on it.
- YouTube Data API quota is **10,000 units/day per project**; each search =
  100 units. Current agent: 36 searches × 2 runs = 7,200/day.
- n8n: schedule only fires when the workflow shows **Published** (green).
