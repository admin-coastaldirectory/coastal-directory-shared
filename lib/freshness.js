// ============================================================
// freshness.js — dates, review summaries and IndexNow, after the build
// ============================================================
//
// Added 2026-10-15. Each site's generate.js calls this LAST, after the shared
// build and every site script has written its pages and sitemaps:
//
//   const { applyFreshness } = require('coastal-directory-shared/lib/freshness');
//   build(config).then(...).then(() => applyFreshness(config, __dirname));
//
// It does four things, all from the shop data in Supabase:
//
// 1. Shop pages: a "Listing checked against Google Maps: October 2026" line
//    under the location, a "<Shop> reviews" section (the real Google rating,
//    review count, city rank and how it compares with the city average, plus
//    a link to read the reviews on Google Maps; no review text is copied),
//    the matching "Is <Shop> well reviewed?" FAQ entry, and a WebPage
//    JSON-LD block with dateModified.
// 2. City pages: an "Updated October 2026" line (with "every listing was
//    checked against Google Maps" when that is true for every listing) and a
//    CollectionPage JSON-LD block with dateModified.
// 3. Sitemaps: <lastmod> on every state, city and shop URL, and on the
//    sub-sitemap entries in sitemap.xml.
// 4. IndexNow: pings the listing URLs that are new, changed or gone compared
//    with the live sitemaps (see lib/indexnow.js). Production deploys only.
//
// Every date comes from the data (last_verified_at, updated_at,
// owner_verified_at, created_at), never from the build clock, so a rebuild
// that changes nothing does not claim an update. Google and Bing both learn
// to ignore a site whose lastmod moves on every deploy.
//
// last_verified_at is set whenever a listing is checked against Google Maps
// (first set by the October 2026 closed-shop check; the 60-day recheck and
// any later check update it).
//
// Never fails the build: any error is logged and the pages stay as built.
// Idempotent: pages already carrying data-fresh are left alone.

const fs = require('fs');
const path = require('path');
const { fetchAll } = require('./fetch-supabase');
const { slugify, escHtml, escAttr, normalizeShop, countDataFields } = require('./util');
const { stateName } = require('./states');
const insights = require('./shop-insights');
const indexnow = require('./indexnow');

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

function isoDay(v) {
  if (!v) return null;
  const s = String(v).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}
function maxDay(days) {
  const d = (days || []).filter(Boolean).sort();
  return d.length ? d[d.length - 1] : null;
}
function shopLastmod(s) {
  return maxDay([s.last_verified_at, s.updated_at, s.owner_verified_at, s.created_at].map(isoDay));
}
function verifiedDay(s) { return isoDay(s.last_verified_at); }
function monthYear(day) {
  if (!day) return '';
  const [y, m] = day.split('-').map(Number);
  return MONTHS[m - 1] + ' ' + y;
}
function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function score(s) { return num(s.totalScore != null ? s.totalScore : s.total_score); }
function reviews(s) { return num(s.reviewsCount != null ? s.reviewsCount : s.reviews_count); }

function ldTag(obj) {
  return '<script type="application/ld+json">' + JSON.stringify(obj) + '</script>';
}

function webPageLd(type, url, name, dateModified, config) {
  const o = { '@context': 'https://schema.org', '@type': type, '@id': url + '#webpage', url, name };
  if (dateModified) o.dateModified = dateModified;
  o.isPartOf = { '@type': 'WebSite', url: config.brand.fullUrl + '/', name: config.brand.name };
  o.inLanguage = 'en';
  return o;
}

// Insert right after the first <p class="lede">…</p>.
function afterLede(html, snippet) {
  const i = html.indexOf('<p class="lede">');
  if (i < 0) return null;
  const j = html.indexOf('</p>', i);
  if (j < 0) return null;
  return html.slice(0, j + 4) + '\n  ' + snippet + html.slice(j + 4);
}

function addLd(html, obj) {
  const i = html.indexOf('</head>');
  return i < 0 ? html : html.slice(0, i) + ldTag(obj) + '\n' + html.slice(i);
}

// Append one Q&A to the page's FAQPage JSON-LD (the visible copy is in the
// reviews section, so schema and page match).
function addFaq(html, q, a) {
  const re = /<script type="application\/ld\+json">(\{"@context":"https:\/\/schema\.org","@type":"FAQPage".*?\})<\/script>/s;
  const m = html.match(re);
  if (!m) return html;
  try {
    const o = JSON.parse(m[1]);
    o.mainEntity.push({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } });
    return html.replace(m[0], () => ldTag(o));
  } catch (e) { return html; }
}

function reviewsBlock(shop, stateShops, config) {
  const sc = score(shop), rv = reviews(shop);
  if (!(sc > 0 && rv > 0)) return null;
  const niche = config.niche || {};
  const plural = niche.shopTypePluralCapitalized
    ? niche.shopTypePluralCapitalized.toLowerCase() : (niche.shopType || 'shop') + 's';
  const cityKey = String(shop.city || '').toLowerCase();
  // Same pool as cityRank (shops with enough reviews to compare), so the
  // "#2 of 7" and "the 7 rated shops" numbers always agree.
  const peers = stateShops.filter(o => String(o.city || '').toLowerCase() === cityKey && insights.weighted(o) != null);
  const rank = insights.cityRank(shop, stateShops);
  const parts = [shop.name + ' has a ' + sc.toFixed(1) + '-star average from ' + rv.toLocaleString('en-US')
    + ' Google review' + (rv === 1 ? '' : 's') + '.'];
  if (rank) parts.push('That ranks #' + rank.rank + ' of ' + rank.total + ' rated ' + plural + ' in ' + shop.city
    + ' once the number of reviews is taken into account.');
  if (peers.length >= 3) {
    const avg = peers.reduce((a, o) => a + score(o), 0) / peers.length;
    const diff = sc - avg;
    const cmp = Math.abs(diff) < 0.1 ? 'about the same as' : (diff > 0 ? 'above' : 'below');
    parts.push('The average for the ' + peers.length + ' rated ' + plural + ' in ' + shop.city + ' is '
      + avg.toFixed(1) + ' stars, so ' + shop.name + ' is ' + cmp + ' the local average.');
  }
  if (rv < 10) parts.push('With fewer than 10 reviews, the rating can still move a lot.');
  const answer = parts.join(' ');
  const g = shop.google_maps || shop.googleMaps;
  const link = g ? ' <a href="' + escAttr(g) + '" target="_blank" rel="noopener">Read the reviews on Google Maps &rarr;</a>' : '';
  const q = 'Is ' + shop.name + ' well reviewed?';
  const html = '<div class="shop-reviews" style="margin-top:24px"><h2>' + escHtml(shop.name) + ' reviews</h2>'
    + '<h3>' + escHtml(q) + '</h3><p>' + escHtml(answer) + link + '</p></div>';
  return { html, q, a: answer };
}

function shopPath(shop) {
  const st = slugify(stateName(shop.state));
  const city = slugify(shop.city || 'Other') || 'other';
  const slug = shop.slug || slugify((shop.name || '') + '-' + (shop.city || ''));
  return { st, city, slug };
}

function patchShopPage(file, shop, stateShops, config) {
  if (!fs.existsSync(file)) return false;
  let html = fs.readFileSync(file, 'utf8');
  if (html.includes('data-fresh')) return false;
  const v = verifiedDay(shop), lm = shopLastmod(shop);
  const line = v
    ? '<p class="updated" data-fresh style="font-size:13px;opacity:.8;margin:8px 0 0">Listing checked against Google Maps: <time datetime="' + v + '">' + monthYear(v) + '</time></p>'
    : (lm ? '<p class="updated" data-fresh style="font-size:13px;opacity:.8;margin:8px 0 0">Listing updated <time datetime="' + lm + '">' + monthYear(lm) + '</time></p>' : '');
  if (line) { const out = afterLede(html, line); if (out) html = out; }

  const rb = reviewsBlock(shop, stateShops, config);
  if (rb) {
    const markers = ['<h2>Frequently asked questions about', '<h2>' + escHtml((config.niche || {}).shopTypePluralCapitalized || 'Shops') + ' near', '</main>'];
    for (const mk of markers) {
      const i = html.indexOf(mk);
      if (i >= 0) { html = html.slice(0, i) + rb.html + '\n ' + html.slice(i); break; }
    }
    html = addFaq(html, rb.q, rb.a);
  }
  const canon = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
  if (canon) html = addLd(html, webPageLd('WebPage', canon, shop.name + ' — ' + shop.city + ', ' + stateName(shop.state), lm, config));
  fs.writeFileSync(file, html);
  return true;
}

function patchCityPage(file, shops, config) {
  if (!fs.existsSync(file)) return false;
  let html = fs.readFileSync(file, 'utf8');
  if (html.includes('data-fresh') || !html.includes('<div class="eyebrow">')) return false;
  const lm = maxDay(shops.map(shopLastmod));
  const allV = shops.length > 0 && shops.every(verifiedDay);
  const v = allV ? maxDay(shops.map(verifiedDay)) : null;
  const line = v
    ? '<p class="updated" data-fresh style="font-size:13px;opacity:.85;margin:10px 0 0">Updated <time datetime="' + v + '">' + monthYear(v) + '</time>. Every listing on this page was checked against Google Maps for closures.</p>'
    : (lm ? '<p class="updated" data-fresh style="font-size:13px;opacity:.85;margin:10px 0 0">Updated <time datetime="' + lm + '">' + monthYear(lm) + '</time>.</p>' : '');
  if (line) { const out = afterLede(html, line); if (out) html = out; }
  const canon = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
  const h1 = (html.match(/<h1>([^<]+)<\/h1>/) || [])[1] || '';
  if (canon) html = addLd(html, webPageLd('CollectionPage', canon, h1.replace(/&amp;/g, '&'), lm, config));
  fs.writeFileSync(file, html);
  return true;
}

// Add <lastmod> to every <url> whose <loc> is in the map; returns newest date.
function stampSitemap(file, lastmods) {
  if (!fs.existsSync(file)) return null;
  const xml = fs.readFileSync(file, 'utf8');
  let newest = null;
  const out = xml.replace(/<url><loc>([^<]+)<\/loc>(?:<lastmod>[^<]*<\/lastmod>)?/g, (whole, loc) => {
    const lm = lastmods.get(loc);
    if (!lm) return whole;
    if (!newest || lm > newest) newest = lm;
    return '<url><loc>' + loc + '</loc><lastmod>' + lm + '</lastmod>';
  });
  if (out !== xml) fs.writeFileSync(file, out);
  return newest;
}

async function applyFreshness(config, rootDir) {
  try {
    console.log('\nfreshness: dates, review summaries, sitemap lastmod, IndexNow');
    const raw = await fetchAll(config.supabase, config.supabase.tables.shops,
      'status=eq.published&or=(vertical_status.eq.confirmed,vertical_status.is.null)');
    const minFields = (config.thresholds && config.thresholds.minDataFieldsForShopPage) || 2;
    const shops = raw.map(normalizeShop).filter(s => s.state && s.city);
    const siteUrl = config.brand.fullUrl;

    const byState = {};
    for (const s of shops) (byState[String(s.state).toUpperCase()] = byState[String(s.state).toUpperCase()] || []).push(s);

    const lastmods = new Map();
    let shopN = 0, cityN = 0;
    for (const code of Object.keys(byState)) {
      const stShops = byState[code];
      const stSlug = slugify(stateName(code));
      lastmods.set(siteUrl + '/shops/' + stSlug + '/', maxDay(stShops.map(shopLastmod)));
      const byCity = {};
      for (const s of stShops) {
        const p = shopPath(s);
        (byCity[p.city] = byCity[p.city] || []).push(s);
        lastmods.set(siteUrl + '/shops/' + p.st + '/' + p.city + '/' + p.slug + '/', shopLastmod(s));
        if (countDataFields(s) >= minFields
          && patchShopPage(path.join(rootDir, 'shops', p.st, p.city, p.slug, 'index.html'), s, stShops, config)) shopN++;
      }
      for (const [city, cs] of Object.entries(byCity)) {
        lastmods.set(siteUrl + '/shops/' + stSlug + '/' + city + '/', maxDay(cs.map(shopLastmod)));
        if (patchCityPage(path.join(rootDir, 'shops', stSlug, city, 'index.html'), cs, config)) cityN++;
      }
    }
    console.log('  freshness: ' + shopN + ' shop pages, ' + cityN + ' city pages updated');

    // Sitemaps: per-URL lastmod, then per-file lastmod in the index.
    const files = fs.readdirSync(rootDir).filter(f => /^sitemap-(states|top-cities|shops-\d+)\.xml$/.test(f));
    const fileNewest = {};
    for (const f of files) fileNewest[f] = stampSitemap(path.join(rootDir, f), lastmods);
    const idxFile = path.join(rootDir, 'sitemap.xml');
    if (fs.existsSync(idxFile)) {
      const idx = fs.readFileSync(idxFile, 'utf8').replace(
        /<sitemap><loc>([^<]*\/(sitemap-[a-z0-9-]+\.xml))<\/loc><lastmod>[^<]*<\/lastmod><\/sitemap>/g,
        (whole, loc, name) => fileNewest[name] ? '<sitemap><loc>' + loc + '</loc><lastmod>' + fileNewest[name] + '</lastmod></sitemap>' : whole);
      fs.writeFileSync(idxFile, idx);
    }
    console.log('  freshness: lastmod stamped in ' + files.join(', '));

    // IndexNow: the URLs this deploy publishes in the listing sitemaps.
    const published = [];
    for (const f of files.filter(f => f !== 'sitemap-top-cities.xml')) {
      const xml = fs.readFileSync(path.join(rootDir, f), 'utf8');
      for (const m of xml.matchAll(/<url><loc>([^<]+)<\/loc>(?:<lastmod>([^<]*)<\/lastmod>)?/g)) {
        published.push({ loc: m[1], lastmod: m[2] || '' });
      }
    }
    await indexnow.pingChanged({ outDir: rootDir, siteUrl, urls: published, key: config.indexNow && config.indexNow.key });
  } catch (e) {
    console.log('freshness: skipped (' + (e && e.message ? e.message : e) + ')');
  }
}

module.exports = { applyFreshness, shopLastmod };
