// ============================================================
// link-boost.js — internal links that point Google at city pages
// ============================================================
//
// SEO audit 2026-10-19, fix #5. Called by applyFreshness() (lib/freshness.js)
// after the build, so no site repo needs editing.
//
// Why: a link map of all three sites (2026-10-20) showed the homepage — the
// strongest page a directory has — links to state pages and 12 shops but to
// no city page at all, and each shop page links to exactly one city page
// (its own). Most shop and city pages sit in "Discovered - currently not
// indexed", so they need more paths from pages Google already crawls.
//
// Two blocks, both plain <a href> links in the HTML:
//
// 1. Homepage: "Top cities for <shops>" — the TOP_HOME biggest indexable
//    city pages. Goes between <!-- TOP-CITIES:START/END --> markers, which
//    are written right after the Popular shops block (home-popular.js) on
//    the first build, then replaced in place on later builds.
// 2. Every shop page: "More <shops> in <State>" — the TOP_STATE biggest
//    indexable city pages in the shop's state, excluding its own city.
//    Goes just before </main>, between <!-- STATE-CITIES:START/END -->.
//
// "Indexable" = the city page as built has no noindex robots tag, so thin
// city pages (trim-thin-city-pages.js) are never promoted. City names and
// counts are read from the built city pages (h1 + eyebrow), so links always
// match pages that exist in this deploy.
//
// Idempotent. Never throws: errors are logged and pages stay as built.

const fs = require('fs');
const path = require('path');
const { escHtml } = require('./util');

const TOP_HOME = 24;
const TOP_STATE = 6;
const H_START = '<!-- TOP-CITIES:START -->';
const H_END = '<!-- TOP-CITIES:END -->';
const S_START = '<!-- STATE-CITIES:START -->';
const S_END = '<!-- STATE-CITIES:END -->';
const POPULAR_END = '<!-- POPULAR-SHOPS:END -->';
const HOME_ANCHOR = /<section class="block"[^>]*>\s*<div class="section-head"><div><h2>Browse by US state<\/h2>/;

function readIfExists(f) {
  try { return fs.readFileSync(f, 'utf8'); } catch (e) { return null; }
}

function titleCase(slug) {
  return String(slug).split('-').map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ');
}

// Every indexable city page in the build: { st, city, href, name, stateName, n }.
// name/stateName are taken from the page's own h1 ("Coin Shops in Minot,
// North Dakota"), already HTML-escaped as written there.
function collectCities(rootDir) {
  const out = [];
  const shopsDir = path.join(rootDir, 'shops');
  if (!fs.existsSync(shopsDir)) return out;
  for (const st of fs.readdirSync(shopsDir)) {
    const sDir = path.join(shopsDir, st);
    if (!fs.statSync(sDir).isDirectory()) continue;
    for (const city of fs.readdirSync(sDir)) {
      const html = readIfExists(path.join(sDir, city, 'index.html'));
      if (!html) continue;
      const m = html.match(/<div class="eyebrow">(\d+) [^<]*<\/div>/);
      if (!m || !html.includes('<main class="content content-wide">')) continue;
      if (/<meta name="robots" content="noindex/i.test(html)) continue;
      const h = html.match(/<h1>[^<]*? in ([^<]+)<\/h1>/);
      let name = titleCase(city), stateName = titleCase(st);
      if (h) {
        const i = h[1].lastIndexOf(', ');
        if (i > 0) { name = h[1].slice(0, i); stateName = h[1].slice(i + 2); } else { name = h[1]; }
      }
      out.push({ st, city, href: `/shops/${st}/${city}/`, name, stateName, n: parseInt(m[1], 10) });
    }
  }
  return out.sort((a, b) => b.n - a.n || a.href.localeCompare(b.href));
}

function pluralLower(config) {
  const niche = (config && config.niche) || {};
  return niche.shopTypePluralCapitalized
    ? niche.shopTypePluralCapitalized.toLowerCase()
    : ((niche.shopType || 'shop') + 's');
}

const PILL = 'display:inline-block;margin:0 8px 8px 0;padding:6px 12px;border:1px solid currentColor;border-radius:999px;text-decoration:none;font-size:14px';

function homeBlock(cities, plural) {
  const links = cities.map(c => '<a href="' + c.href + '" style="' + PILL + '">' + c.name + ', ' + c.stateName
    + ' <span style="opacity:.7">(' + c.n + ')</span></a>').join('\n');
  return H_START + '\n<section class="block" style="padding-top:20px" id="top-cities">\n'
    + ' <div class="section-head"><div><h2>Top cities for ' + escHtml(plural) + '</h2>'
    + '<div class="sub">The cities with the most ' + escHtml(plural) + ' in the directory.</div></div>'
    + '<a href="/shops/" class="view-all">Browse every state →</a></div>\n'
    // Same centered 1100px column as .section-head / .card-grid on the homepage.
    + ' <div style="max-width:1100px;margin:0 auto">' + links + '</div>\n</section>\n' + H_END;
}

function stateBlock(cities, plural, stateName) {
  const items = cities.map(c => '<li style="margin:0 0 6px"><a href="' + c.href + '">' + c.name + '</a> <span style="opacity:.7">('
    + c.n + ' ' + escHtml(plural) + ')</span></li>').join('');
  return S_START + '<div class="state-cities" style="margin-top:28px"><h2>More ' + escHtml(plural) + ' in ' + stateName + '</h2>'
    + '<ul style="columns:220px 2;column-gap:24px;padding-left:18px;margin:8px 0 0">' + items + '</ul></div>' + S_END;
}

// Replace an existing marked block, or insert a new one with `insert`.
function upsert(html, start, end, block, insert) {
  const a = html.indexOf(start), b = html.indexOf(end);
  if (a !== -1 && b > a) return html.slice(0, a) + block + html.slice(b + end.length);
  return insert(html);
}

function applyHomeCities(rootDir, cities, plural) {
  const file = path.join(rootDir, 'index.html');
  const html = readIfExists(file);
  if (!html) return 0;
  const top = cities.slice(0, TOP_HOME);
  if (top.length < 6) { console.log('  link-boost: homepage skipped (only ' + top.length + ' indexable cities)'); return 0; }
  const block = homeBlock(top, plural);
  const out = upsert(html, H_START, H_END, block, h => {
    const i = h.indexOf(POPULAR_END);
    if (i !== -1) return h.slice(0, i + POPULAR_END.length) + '\n' + block + h.slice(i + POPULAR_END.length);
    if (HOME_ANCHOR.test(h)) return h.replace(HOME_ANCHOR, m => block + '\n' + m);
    return null;
  });
  if (!out) { console.log('  link-boost: homepage skipped (no anchor)'); return 0; }
  if (out !== html) fs.writeFileSync(file, out);
  return top.length;
}

function applyShopStateCities(rootDir, cities, plural) {
  const byState = {};
  for (const c of cities) (byState[c.st] = byState[c.st] || []).push(c);
  const shopsDir = path.join(rootDir, 'shops');
  let pages = 0;
  for (const st of fs.readdirSync(shopsDir)) {
    const list = byState[st] || [];
    const sDir = path.join(shopsDir, st);
    if (!list.length || !fs.statSync(sDir).isDirectory()) continue;
    for (const city of fs.readdirSync(sDir)) {
      const cDir = path.join(sDir, city);
      if (!fs.statSync(cDir).isDirectory()) continue;
      const pick = list.filter(c => c.city !== city).slice(0, TOP_STATE);
      if (pick.length < 2) continue;
      const block = stateBlock(pick, plural, pick[0].stateName);
      for (const slug of fs.readdirSync(cDir)) {
        const f = path.join(cDir, slug, 'index.html');
        const html = readIfExists(f);
        // Shop pages only: city pages carry the eyebrow count.
        if (!html || html.includes('<div class="eyebrow">')) continue;
        const out = upsert(html, S_START, S_END, block, h => {
          const i = h.indexOf('</main>');
          return i === -1 ? null : h.slice(0, i) + block + '\n' + h.slice(i);
        });
        if (!out) continue;
        if (out !== html) fs.writeFileSync(f, out);
        pages++;
      }
    }
  }
  return pages;
}

function applyLinkBoost(rootDir, config) {
  try {
    const cities = collectCities(rootDir);
    if (!cities.length) { console.log('  link-boost: skipped (no indexable city pages)'); return; }
    const plural = pluralLower(config);
    const home = applyHomeCities(rootDir, cities, plural);
    const shops = applyShopStateCities(rootDir, cities, plural);
    console.log('  link-boost: ' + home + ' cities linked from the homepage, state-city links on ' + shops + ' shop pages');
  } catch (e) {
    console.log('  link-boost: skipped (' + (e && e.message ? e.message : e) + ')');
  }
}

// ------------------------------------------------------------
// Cross-site "Also listed on" links (added 2026-10-20, SEO audit fix #5)
// ------------------------------------------------------------
//
// The same business is often listed on two sister sites (2026-10-20 count:
// 1,095 shops on both ComicStores and LocalCardShops, 61 on Cards and Coins,
// 13 on Comics and Coins). Each such shop page gets one line pointing at the
// same shop on the sister site — useful to the visitor (a comic shop that
// also sells cards) and a crawl path between the three domains.
//
// Matching: state + city + shop name, from the URL slugs. The sister's URLs
// come from its LIVE shop sitemaps (sitemap-shops-N.xml), so only pages the
// sister itself asks Google to index are linked. A sister that can't be
// fetched is skipped. Never fails the build.

const SISTERS = [
  { url: 'https://comicstoresnearme.com', name: 'ComicStoresNearMe', what: 'comic shop' },
  { url: 'https://localcardshopsnearme.com', name: 'LocalCardShopsNearMe', what: 'card shop' },
  { url: 'https://coinsnearme.co', name: 'CoinsNearMe', what: 'coin shop' },
];
const A_START = '<!-- ALSO-ON:START -->';
const A_END = '<!-- ALSO-ON:END -->';

// "green-brother-s-comics-arab-al-x3hvl" (Cards) and "green-brother-s-comics-arab"
// (Comics/Coins) both become "green-brother-s-comics".
function shopKey(st, city, slug) {
  let s = String(slug).replace(/-[a-z]{2}-[a-z0-9]{5}$/, '').replace(/-(ca|us)$/, '');
  if (s.endsWith('-' + city)) s = s.slice(0, -(city.length + 1));
  s = s.replace(/-(inc|llc|ltd|co|the)\b/g, '').replace(/^the-/, '');
  return st + '/' + city + '/' + s;
}

async function fetchText(url, ms = 20000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    return r.ok ? await r.text() : null;
  } catch (e) { return null; } finally { clearTimeout(t); }
}

// key -> absolute shop URL, from the sister's live shop sitemaps.
async function sisterIndex(sister) {
  const idx = await fetchText(sister.url + '/sitemap.xml');
  if (!idx) return null;
  const subs = [...idx.matchAll(/<loc>([^<]*\/sitemap-shops-\d+\.xml)<\/loc>/g)].map(m => m[1]);
  const map = new Map();
  for (const sm of subs) {
    const xml = await fetchText(sm);
    if (!xml) return null; // partial data would drop real matches; skip this sister
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const p = m[1].replace(/^https?:\/\/[^/]+/, '').split('/').filter(Boolean);
      if (p.length === 4 && p[0] === 'shops') map.set(shopKey(p[1], p[2], p[3]), m[1]);
    }
  }
  return map.size ? map : null;
}

async function applyAlsoOn(rootDir, config) {
  try {
    const own = String((config && config.brand && config.brand.fullUrl) || '').replace(/\/$/, '');
    const sisters = SISTERS.filter(s => s.url !== own);
    if (sisters.length === SISTERS.length) { console.log('  also-on: skipped (site not in the sister list)'); return; }
    const maps = [];
    for (const s of sisters) {
      const m = await sisterIndex(s);
      if (m) maps.push({ s, m }); else console.log('  also-on: ' + s.name + ' sitemaps unavailable, skipped');
    }
    if (!maps.length) return;
    const shopsDir = path.join(rootDir, 'shops');
    let pages = 0, links = 0;
    for (const st of fs.readdirSync(shopsDir)) {
      const sDir = path.join(shopsDir, st);
      if (!fs.statSync(sDir).isDirectory()) continue;
      for (const city of fs.readdirSync(sDir)) {
        const cDir = path.join(sDir, city);
        if (!fs.statSync(cDir).isDirectory()) continue;
        for (const slug of fs.readdirSync(cDir)) {
          const f = path.join(cDir, slug, 'index.html');
          const html = readIfExists(f);
          if (!html || html.includes('<div class="eyebrow">')) continue;
          const key = shopKey(st, city, slug);
          const hits = maps.map(({ s, m }) => m.has(key) ? { s, href: m.get(key) } : null).filter(Boolean);
          let out;
          if (hits.length) {
            const parts = hits.map(h => '<a href="' + h.href + '">' + h.s.name + '</a>, the ' + h.s.what + ' directory');
            const block = A_START + '<p class="also-on" style="margin-top:24px">Also listed on ' + parts.join(', and on ') + '.</p>' + A_END;
            out = upsert(html, A_START, A_END, block, h => {
              const i = h.indexOf(S_START) !== -1 ? h.indexOf(S_START) : h.indexOf('</main>');
              return i === -1 ? null : h.slice(0, i) + block + '\n' + h.slice(i);
            });
            if (out) { pages++; links += hits.length; }
          } else {
            // No longer matched (shop removed from the sister): drop a stale line.
            const a = html.indexOf(A_START), b = html.indexOf(A_END);
            out = a !== -1 && b > a ? html.slice(0, a) + html.slice(b + A_END.length) : null;
          }
          if (out && out !== html) fs.writeFileSync(f, out);
        }
      }
    }
    console.log('  also-on: ' + links + ' sister-site links on ' + pages + ' shop pages');
  } catch (e) {
    console.log('  also-on: skipped (' + (e && e.message ? e.message : e) + ')');
  }
}

module.exports = { applyLinkBoost, applyAlsoOn, collectCities, shopKey };
