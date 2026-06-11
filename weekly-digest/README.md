# Weekly Digest Kit (week-in-review blog + email + social)

Canonical, reusable engine for the network's **weekly "week in review"** roundups.
First deployed live on **ComicStoresNearMe** (workflow "CSNM Comics Weekly Digest", runs Sunday 9 PM).
Clone this to spin up the same system for **CoinsNearMe** (Coins) and **CollectiblesFamous**.

## What it does (one n8n workflow, 7 nodes)

`Schedule (Sun 21:00) -> Get Week's Comics -> Write Digest (Claude) -> Assemble Pages -> Publish to GitHub -> [Post to Facebook] + [Email me the digest]`

- **Get** — pulls the past 7 days of `status='approved'` items from Supabase `cf_content_items` for the category (top ~10 news + ~4 videos), builds date labels + slug.
- **Write Digest** — Claude writes a deep, anti-slop roundup as strict JSON (per-story 4-6 sentence collector commentary + source links, videos, FAQ, social copy). `options.maxTokens=4096` (required — default 1024 truncates the JSON).
- **Assemble Pages** — turns the JSON into the full branded blog post HTML + an index card + the Axios "Smart Brevity" email HTML. (Also builds an index shell, currently unused — see Publish.)
- **Publish to GitHub** — commits the post to the site repo via the GitHub Contents API (Netlify auto-deploys). **Self-creates `blog/news/index.html`** if missing (inline shell, lists the new post) and inserts the card after `<!--NEWS-POSTS-->` on subsequent runs.
- **Post to Facebook** — GHL Social Planner, matches the site's FB page by name regex.
- **Email me the digest** — Outlook, sends the newsletter preview + X copy to marketing@ (subscriber send is a separate GHL piece, not in this kit yet).

## Files

| file | what to change per site |
|------|------------------------|
| `node-get.js` | `category` ('Comics'->'Coins'; CF = all), slug prefix (`comic-news-week-of-`), Supabase URL/anon key (same project) |
| `prompt.txt` | brand voice/topic (comics->coins/collectibles), site name, hashtags |
| `node-assemble.js` | site URL (`comicstoresnearme.com`), brand name, accent color (`#c03030` red -> CNM navy `#1a3a5c` / CF gold `#B8872A`), header/footer chrome, gtag ID (`G-3LKP95PGDN`), nav paths (`/shops` -> `/dealers` etc.), subscribe list |
| `node-publish.js` | `OWNER`/`REPO` (`admin-coastaldirectory`/`comicstore` -> `coinsnearme` / `Collectiblefind`), `TOKEN` (paste a fine-grained PAT with Contents:read+write on that repo) |
| `build-weekly-workflow.js` (fbCode) | FB page match regex (`/comic/i` -> `/coin/i`), `GHL_TOKEN` (social), schedule day/hour |

## Setup for a new site

1. Copy this folder, edit the swap points above.
2. `node build-weekly-workflow.js` -> produces `weekly-digest.workflow.json`.
3. Import the JSON into n8n (file_upload to the hidden `workflow-import-input`; the canvas/import is flaky — see gotchas).
4. In the **Publish to GitHub** node, paste the GitHub PAT (replace `PASTE_FINE_GRAINED_PAT_HERE`). In **Post to Facebook**, paste the GHL social token (replace `PASTE_GHL_SOCIAL_TOKEN`). Anthropic + Outlook credentials reuse the existing n8n creds.
5. Add a "News Roundups" link card on the site's `/blog` page pointing to `/blog/news/` (one commit).
6. Publish/activate the workflow.

## Secrets

This kit ships with **placeholders** (`PASTE_FINE_GRAINED_PAT_HERE`, `PASTE_GHL_SOCIAL_TOKEN`). The Supabase **anon** key in `node-get.js` is public (same key embedded in the public site pages) and safe to keep. Never commit real PATs here.

## Gotchas (learned the hard way, 2026-06)

- **maxTokens** on the Claude node must be >= 4096 or the JSON truncates -> "Unterminated string in JSON".
- The `%%POSTURL%%` token in `prompt.txt` is intentional (NOT `{{ }}`) so n8n's expression engine doesn't try to evaluate it; `node-assemble.js` substitutes it after the slug is known.
- n8n cloud "Publish" model: editing makes an unpublished draft; the live schedule runs the old version until you Publish/activate. The editor canvas was very unstable in practice — prefer the `/rest` API (sync XHR with header `browser-id` from `localStorage['n8n-browserId']`) for edits/patches.
- The site repos auto-update (shop/event pages), so a manual push needs `git pull --no-edit` first.
- This (`coastal-directory-shared`) repo's CLI git index is flaky on the OneDrive clone — commit via **GitHub Desktop**, not the command line.
