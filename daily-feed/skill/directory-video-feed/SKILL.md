---
name: directory-video-feed
description: >-
  Wire a Coastal Directory site's Daily Feed to the shared content pool with
  News/Social/Video/Blog lane filters — especially the YouTube video lane. Use
  when the user says things like "add the video feed to <site>", "set up the
  daily feed for <new directory>", "add video to <site>'s feed", "give <site>
  the news/video lanes", or wants a new directory to pull videos for its
  category. Covers editing the site's daily-feed.html, ensuring the n8n YouTube
  agent covers the category, and deploying. Do NOT use for the n8n agent's
  internal bug fixes or the CollectiblesFamous admin review queue.
metadata:
  version: 1.0.0
---

# Directory Video Feed

Adds (or repairs) the Daily Feed + video pipeline on a Coastal Directory site so
its `/daily-feed` page shows the shared content pool, filtered to that site's
category, with **All / News / Social / Video / Blog** lane pills.

Canonical kit + full reference: `coastal-directory-shared/daily-feed/`
(`README.md`, `filter-bar.snippet.html`, `lane-filter.snippet.js`,
`cf-youtube-agent.workflow.json`). Read it if the repo is mounted; otherwise the
code below is self-contained.

## What you need first

Ask the user (only what's missing):
- **Which site / repo** (e.g. `Collectibles/CoinsNearMe`, domain `coinsnearme.co`).
- **Category label** — exact Title-Case value in `cf_content_items.category`
  (e.g. `Coins`, `Comics`, `Sports Cards`). And its **slug** as the site's
  `categorySlug()` produces it (usually lowercase, hyphenated).
- **Brand accent color** if the site has no `.df-pill` styles yet.

## Key facts (shared pool)

- Supabase project `vtlgfwldogsdueiahidp`, table `cf_content_items`, **anon key**
  for read. Show only `status='approved'`.
- `type` is one of `news|social|video|blog`. `category` is Title-Case and must
  match exactly. `url_hash` is **GENERATED `md5(url)`** — never write it.
- Video rows come from the n8n **CF YouTube Video Agent** (twice daily). New
  verticals must be added to that agent's `Config` node `CATEGORIES` array
  (`{ label, queries[] }`) and the workflow **Published**.

## Procedure

1. **Confirm content exists.** If the Supabase MCP is available:
   `select type, count(*) from cf_content_items where category='<Label>' and
   status='approved' group by type;`. If there are no `video` rows and the
   vertical is new, add it to the n8n agent's Config `CATEGORIES` (via Chrome)
   and Publish — videos appear after the next run.

2. **Edit the site's `daily-feed.html`.**
   - Paste the filter bar right before `<main ... id="df-feed">`:
     ```html
     <nav class="df-filters" id="df-lanes">
       <button class="df-pill" data-lane="all">All <span class="df-pill-count"></span></button>
       <button class="df-pill" data-lane="news">News <span class="df-pill-count"></span></button>
       <button class="df-pill" data-lane="social">Social <span class="df-pill-count"></span></button>
       <button class="df-pill" data-lane="video">Video <span class="df-pill-count"></span></button>
       <button class="df-pill" data-lane="blog">Blog <span class="df-pill-count"></span></button>
     </nav>
     ```
   - Ensure CSS exists (add if missing, using the site accent var):
     ```css
     .df-filters{margin:40px 0 20px;display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
     .df-pill{padding:7px 14px;border:1px solid #ddd;background:#fff;border-radius:999px;cursor:pointer;font-size:13px;color:#666;transition:all .15s}
     .df-pill:hover{border-color:var(--accent);color:var(--accent)}
     .df-pill.active{background:var(--accent);color:#fff;border-color:var(--accent)}
     .df-pill-count{opacity:.55;font-size:11px;margin-left:3px}
     ```
   - Replace `loadFeed()`/`renderFeed()` with the lane-filter block from
     `lane-filter.snippet.js`, setting `CATEGORY_LABEL` and `CATEGORY_SLUG` for
     this site. It loads ALL approved rows for the category once, filters lanes
     client-side, syncs `?type=`, and shows per-lane counts.

3. **Verify.** Extract the inline `<script>` containing `loadFeed` and
   `node --check` it. The site/n8n VM mount can be stale — trust host Read/Grep
   over `bash cat/wc`. Confirm `#df-lanes` + 5 pills + the new functions are
   present and old hardcoded `type=eq.news` is gone.

4. **Deploy.** Stage ONLY `daily-feed.html` (these repos carry CRLF-noise that
   must NOT be committed), commit, push; Netlify auto-builds. Give the user the
   PowerShell (sandbox git is unreliable on these repos):
   ```powershell
   cd "<repo path>"
   git add daily-feed.html
   git commit -m "Daily Feed: News/Social/Video/Blog lane filter"
   git push
   ```
   If push is rejected (these repos get auto-updated), `git pull --no-edit`
   then `git push`. If `git pull` reports CONFLICT, stop and resolve with the user.

5. **Confirm live** via Claude in Chrome: open `https://<domain>/daily-feed`,
   check pills + counts, click **Video**, confirm only `video` items show and
   the URL becomes `?type=video`.

## Notes / gotchas

- Social/Blog lanes can read 0 until that content exists — fine, leave the pills.
- n8n Code-node sandbox has no `URLSearchParams` and may block
  `require('crypto')`; the browser-side `daily-feed.html` is unaffected, but the
  agent code is not.
- YouTube quota: 10,000 units/day per Google project (each search = 100).
