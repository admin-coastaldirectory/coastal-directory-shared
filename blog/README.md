# Blog page pattern — Coastal Directory sites

Canonical structure for the `/blog` page and the daily-feed blog lane on every
Coastal Directory site. Established 2026-06-12 when CoinsNearMe's blog page was
rebuilt to match ComicStoresNearMe's. New sites (collectibles or otherwise)
should follow this spec from day one.

Live references:
- https://comicstoresnearme.com/blog
- https://coinsnearme.co/blog
- https://comicstoresnearme.com/daily-feed?type=blog
- https://coinsnearme.co/daily-feed?type=blog

## /blog page structure (top to bottom)

1. **Head:** SEO title "[Vertical] Shop Guides & Collector Resources | [SiteName]",
   meta description, canonical, `robots: index, follow`, og tags incl.
   `og:site_name`, CollectionPage schema, BreadcrumbList schema.
2. **Page intro:** breadcrumb (Home / Blog), eyebrow ("The [Vertical] Blog"),
   H1 "[Vertical] shop guides & collector resources", one-line lede.
3. **Intro paragraph:** one sentence citing the verified-shop count, one
   sentence saying what each city guide does. No filler.
4. **City guide card grid** (`guide-grid` / `guide-card` CSS in
   `guide-grid.snippet.css`): one card per live city guide, sorted by shop
   count descending. Card = city title, one-line description, "[N] shops in
   the directory »". Only link guides that are actually live.
5. **"More city guides are on the way"** line with hello@coastaldirectoryllc.com.
6. **Weekly news card** linking to `/blog/news/`, followed by the digest bot's
   `#latest-roundups` div + Supabase fetch script. **The digest bot owns this
   block** — see Gotchas.
7. **Collector resources list:** links to the site's own evergreen pages
   (grading, values/appraisal, sell pages, events, full directory).
8. Standard pcta band, network band, footer.

## Daily-feed blog lane links

The daily-feed page shows two link cards above the feed when the Blog lane is
active (`?type=blog`): city guides → `/blog`, weekly roundups → `/blog/news/`.
Snippets: `blog-links.snippet.html` + `blog-links.snippet.js` (+ CSS in the
HTML snippet header comment). Wire `updateBlogLinks()` into the lane-filter
`setLane()` and call it once at load.

## Copy rules

Plain and specific. Use real numbers from the directory (shop counts).
Active voice, short sentences. No "delve / comprehensive / landscape /
game-changer", no "The best part?" hooks, no "it's worth noting".
City-guide H1s target real searches ("Where to Sell Coins in [City]",
"Best Comic Shops in [City]").

## Gotchas (learned the hard way)

- **The blog digest bots (n8n) commit directly to each site's GitHub repo.**
  Always `git pull --rebase origin main` before pushing CNM/CSNM. A push
  without pulling will be rejected; an edit to blog.html can conflict with
  the bot's latest-roundups commits.
- The bot's `#latest-roundups` block lives on both blog pages. Don't remove
  or duplicate it when editing blog.html — check for it first.
- CoinsNearMe city guides live at root (`/sell-coins-[city]`); CSNM's live
  under `/blog/best-comic-shops-in-[city]/`. Either is fine; the blog page
  cards just point wherever the guides actually are.
- This shared repo's OneDrive working copy has a stale git index — commit
  from a fresh GitHub clone, not the Collectibles copy.
