// ============================================================
// priority-sitemap.js: one small sitemap of each site's best pages.
// ============================================================
//
// SEO audit 2026-10-19, fix #4. Most Cards and Coins pages sit in
// "Discovered - currently not indexed": Google knows they exist and has
// not crawled them. Cards' 25-URL gsc-allowlist sitemap was fully
// indexed, so this builds the same kind of short list, per site, of the
// pages most worth Google's time:
//
//   - city pages with the most shops        (up to CITY_N)
//   - "Best ___ shops in <city>" guides and
//     Coins' sell-coins-<city> pages         (up to GUIDE_N)
//   - best-reviewed shop pages               (fills the rest, MAX total)
//
// Only pages that are indexable in this build are listed: anything with
// a noindex robots tag (thin city pages, Tier B shops) is skipped. The
// pages stay in their normal sitemaps too; this file gives them their own
// line in Search Console so we can watch how many Google takes.
//
// Writes sitemap-priority.xml and adds it to the sitemap.xml index. Call
// it after every script that writes pages or sitemaps, and before
// applyFreshness (which stamps its <lastmod>s). Idempotent. Never fails
// the build.

const fs = require('fs');
const path = require('path');

const MAX = 500;
const CITY_N = 150;
const GUIDE_N = 100;
const FILE = 'sitemap-priority.xml';

function readIfExists(f) {
  try { return fs.readFileSync(f, 'utf8'); } catch (e) { return null; }
}

function isNoindex(html) {
  return /<meta name="robots" content="noindex/i.test(html);
}

// Usage, in a site's generate.js (same shape as applyFreshness):
//   buildPrioritySitemap(config, __dirname)
// The URLs come from config.brand.fullUrl, the same base freshness.js uses
// for <lastmod>, so the two always agree.
function buildPrioritySitemap(config, rootDir) {
  try {
    const site = String((config && config.brand && config.brand.fullUrl) || '').replace(/\/$/, '');
    if (!site) return console.log('priority-sitemap: no site URL, skipped');
    const shopsDir = path.join(rootDir, 'shops');
    if (!fs.existsSync(shopsDir)) return console.log('priority-sitemap: no shops/ folder, skipped');

    const cities = [];   // { url, slug, n }
    const shops = [];    // { url, rating, reviews }
    for (const st of fs.readdirSync(shopsDir)) {
      const sDir = path.join(shopsDir, st);
      if (!fs.statSync(sDir).isDirectory()) continue;
      for (const city of fs.readdirSync(sDir)) {
        const cDir = path.join(sDir, city);
        if (!fs.statSync(cDir).isDirectory()) continue;
        const cHtml = readIfExists(path.join(cDir, 'index.html'));
        // City pages carry <div class="eyebrow">27 card shops</div>; shop pages don't.
        const m = cHtml && cHtml.match(/<div class="eyebrow">(\d+) [^<]*<\/div>/);
        if (m && cHtml.includes('<main class="content content-wide">') && !isNoindex(cHtml)) {
          cities.push({ url: `${site}/shops/${st}/${city}/`, slug: city, n: parseInt(m[1], 10) });
        }
        for (const slug of fs.readdirSync(cDir)) {
          const sHtml = readIfExists(path.join(cDir, slug, 'index.html'));
          if (!sHtml || isNoindex(sHtml)) continue;
          // Visible text on every rated shop page: "4.8 stars from 64 Google reviews".
          const r = sHtml.match(/([0-9.]+) stars from ([0-9,]+) Google reviews/);
          if (!r) continue;
          shops.push({ url: `${site}/shops/${st}/${city}/${slug}/`, rating: parseFloat(r[1]), reviews: parseInt(r[2].replace(/,/g, ''), 10) });
        }
      }
    }

    // Guides: blog posts named best-*-in-<city>, plus Coins' root sell-coins-<city>.html
    // pages (served without .html). Ranked by the size of the city they cover.
    const cityShops = {};
    for (const c of cities) cityShops[c.slug] = Math.max(cityShops[c.slug] || 0, c.n);
    const guides = [];
    const blogDir = path.join(rootDir, 'blog');
    if (fs.existsSync(blogDir)) {
      for (const d of fs.readdirSync(blogDir)) {
        const g = d.match(/^best-.+-in-([a-z0-9-]+)$/);
        if (!g) continue;
        const html = readIfExists(path.join(blogDir, d, 'index.html'));
        if (!html || isNoindex(html)) continue;
        guides.push({ url: `${site}/blog/${d}/`, n: cityShops[g[1]] || 0 });
      }
    }
    for (const f of fs.readdirSync(rootDir)) {
      const g = f.match(/^sell-coins-([a-z0-9-]+)\.html$/);
      if (!g) continue;
      const html = readIfExists(path.join(rootDir, f));
      if (!html || isNoindex(html)) continue;
      guides.push({ url: `${site}/${f.replace(/\.html$/, '')}`, n: cityShops[g[1]] || 0 });
    }

    cities.sort((a, b) => b.n - a.n || a.url.localeCompare(b.url));
    guides.sort((a, b) => b.n - a.n || a.url.localeCompare(b.url));
    // Shops: well-rated first (4.0+), then by review count, then rating.
    shops.sort((a, b) => (b.rating >= 4) - (a.rating >= 4) || b.reviews - a.reviews || b.rating - a.rating || a.url.localeCompare(b.url));

    const pick = [];
    const seen = new Set();
    const add = (list, n) => {
      for (const x of list) {
        if (pick.length >= MAX || n <= 0) break;
        if (seen.has(x.url)) continue;
        seen.add(x.url); pick.push(x.url); n--;
      }
    };
    add(cities, CITY_N);
    add(guides, GUIDE_N);
    add(shops, MAX);

    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
      + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
      + pick.map(u => `<url><loc>${u}</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>`).join('\n')
      + (pick.length ? '\n' : '') + '</urlset>\n';
    fs.writeFileSync(path.join(rootDir, FILE), xml);

    const idxFile = path.join(rootDir, 'sitemap.xml');
    const idx = readIfExists(idxFile);
    if (idx && !idx.includes(FILE) && idx.includes('</sitemapindex>')) {
      const today = new Date().toISOString().slice(0, 10);
      fs.writeFileSync(idxFile, idx.replace('</sitemapindex>', `<sitemap><loc>${site}/${FILE}</loc><lastmod>${today}</lastmod></sitemap>\n</sitemapindex>`));
    }
    const nCity = Math.min(cities.length, CITY_N);
    const nGuide = Math.min(guides.length, GUIDE_N);
    console.log(`priority-sitemap: ${pick.length} URLs -> ${FILE} (${nCity} cities, ${nGuide} guides, ${pick.length - nCity - nGuide} shops)`);
  } catch (e) {
    console.log('priority-sitemap: skipped (' + e.message + ')');
  }
}

module.exports = { buildPrioritySitemap };
