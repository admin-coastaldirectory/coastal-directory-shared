// ============================================================
// gone-redirects.js — 301 removed listings to the nearest live page
// ============================================================
//
// Added 2026-10-17. Called by applyFreshness() (lib/freshness.js) after the
// build, so no site repo needs editing.
//
// Why: the October listing cleanups (closed shops, big-box stores, wrong
// vertical, duplicates) and thin-city trimming removed hundreds of pages that
// Google had already crawled. Search Console lists them as "Not found (404)"
// (227 on Comics, 309 on Coins). A 404 throws away whatever the page had
// earned, and sends a visitor from an old link to a dead end.
//
// What it does: for every shop or city URL we can compute from the data that
// has NO page in this build, it writes a 301 to the nearest page that does
// exist: city page, then state page, then /shops/. The rules are prepended to
// the build's _redirects file. Netlify never applies a non-forced rule when a
// file exists at that path, so a live page can never be shadowed.
//
// Sources:
//   - public.gone_listings() RPC: slug/name/city/state of unpublished rows
//     (hidden_*, merged_duplicate, moved_to_cards, ...). Anon can call it; it
//     exposes nothing a published page didn't already show.
//   - Published shops whose page wasn't generated (too little data).
//   - Coins only (opt-out with config.redirectNameOnlySlugs = false): the
//     pre-2026 URL used the name without the city suffix
//     (/shops/connecticut/seymour/valley-coins-of-seymour); 301 that to the
//     current slug (...-seymour-seymour/). Search Console showed these as 404s.
//
// Never throws: any error is logged and _redirects stays as built.

const fs = require('fs');
const path = require('path');
const { slugify } = require('./util');
const { stateName } = require('./states');

const HEAD = '# Removed listings and cities -> nearest live page (lib/gone-redirects.js, written at build time)\n';

async function fetchGone(sb) {
  // PostgREST caps a response at 1,000 rows, so page through with offset.
  let all = [];
  for (let offset = 0; ; offset += 1000) {
    const res = await fetch(sb.url + '/rest/v1/rpc/gone_listings?order=slug.asc&limit=1000&offset=' + offset, {
      method: 'POST',
      headers: { apikey: sb.key, Authorization: 'Bearer ' + sb.key, 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (!res.ok) throw new Error('gone_listings ' + res.status);
    const rows = await res.json();
    all = all.concat(rows);
    if (rows.length < 1000) break;
  }
  return all;
}

function exists(rootDir, urlPath) {
  return fs.existsSync(path.join(rootDir, urlPath, 'index.html'));
}

async function applyGoneRedirects(rootDir, publishedShops, config) {
  try {
    let gone = [];
    try { gone = await fetchGone(config.supabase); } catch (e) {
      console.log('  gone-redirects: RPC unavailable (' + e.message + '), using published shops only');
    }
    const rules = new Map(); // from -> to
    const target = (st, city) => {
      if (city && exists(rootDir, '/shops/' + st + '/' + city + '/')) return '/shops/' + st + '/' + city + '/';
      if (st && exists(rootDir, '/shops/' + st + '/')) return '/shops/' + st + '/';
      return '/shops/';
    };
    const add = (from, to) => {
      if (!from || from === to || exists(rootDir, from) || rules.has(from)) return;
      rules.set(from, to);
    };
    // A merged duplicate ("Third Planet Sci-Fi" -> "Third Planet Sci-Fi
    // Superstore") 301s to its surviving listing, not the city page, so the
    // old URL's links and history carry over (added 2026-10-26). Match: one
    // live shop in the same city whose name starts with the gone name or vice
    // versa. Two or more candidates (a chain's branches) -> city page as before.
    const norm = n => String(n || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
    const liveByCity = new Map();
    for (const s of publishedShops) {
      if (!s || !s.state) continue;
      const st = slugify(stateName(s.state));
      const city = slugify(s.city || 'Other') || 'other';
      const url = '/shops/' + st + '/' + city + '/' + (s.slug || slugify((s.name || '') + '-' + (s.city || ''))) + '/';
      if (!st || !exists(rootDir, url)) continue;
      const k = st + '/' + city;
      if (!liveByCity.has(k)) liveByCity.set(k, []);
      liveByCity.get(k).push({ n: norm(s.name), url });
    }
    const survivor = (st, city, name) => {
      const g = norm(name);
      if (g.length < 5) return null;
      const hits = (liveByCity.get(st + '/' + city) || []).filter(x => x.n && (x.n.startsWith(g) || g.startsWith(x.n)) && Math.min(x.n.length, g.length) >= 5);
      return hits.length === 1 ? hits[0].url : null;
    };
    let toSurvivor = 0;
    const visit = (s, isGone) => {
      if (!s || !s.state) return;
      const st = slugify(stateName(s.state));
      if (!st) return;
      const city = slugify(s.city || 'Other') || 'other';
      const slug = s.slug || slugify((s.name || '') + '-' + (s.city || ''));
      if (!exists(rootDir, '/shops/' + st + '/' + city + '/')) add('/shops/' + st + '/' + city + '/', target(st, null));
      if (isGone || !exists(rootDir, '/shops/' + st + '/' + city + '/' + slug + '/')) {
        const from = '/shops/' + st + '/' + city + '/' + slug + '/';
        const live = isGone ? survivor(st, city, s.name) : null;
        const before = rules.size;
        add(from, live && live !== from ? live : target(st, city));
        if (live && live !== from && rules.size > before) toSurvivor++;
      }
    };
    for (const s of gone) visit(s, true);
    for (const s of publishedShops) visit(s, false);

    const aliasOn = config.redirectNameOnlySlugs != null
      ? !!config.redirectNameOnlySlugs
      : /coinsnearme/.test((config.brand && config.brand.fullUrl) || '');
    let aliasN = 0;
    if (aliasOn) {
      for (const s of publishedShops) {
        const st = slugify(stateName(s.state));
        const city = slugify(s.city || 'Other') || 'other';
        const slug = s.slug || '';
        const suffix = '-' + city;
        if (!st || !slug.endsWith(suffix)) continue;
        const live = '/shops/' + st + '/' + city + '/' + slug + '/';
        if (!exists(rootDir, live)) continue;
        const before = rules.size;
        add('/shops/' + st + '/' + city + '/' + slug.slice(0, -suffix.length) + '/', live);
        if (rules.size > before) aliasN++;
      }
    }

    if (!rules.size) { console.log('  gone-redirects: nothing to redirect'); return 0; }
    // Netlify normalises the trailing slash before matching redirect rules
    // (/a and /a/ are the same rule), so one line per URL is enough. That keeps
    // _redirects small even with the Coins name-only aliases.
    const lines = [];
    for (const [from, to] of rules) lines.push(from.replace(/\/$/, '') + '  ' + to + '  301');
    const rf = path.join(rootDir, '_redirects');
    const prev = fs.existsSync(rf) ? fs.readFileSync(rf, 'utf8') : '';
    fs.writeFileSync(rf, HEAD + lines.join('\n') + '\n' + prev);
    console.log('  gone-redirects: ' + rules.size + ' URLs 301 to a live page (' + aliasN + ' old name-only slugs, ' + toSurvivor + ' to a same-name listing)');
    return rules.size;
  } catch (e) {
    console.log('  gone-redirects: skipped (' + (e && e.message ? e.message : e) + ')');
    return 0;
  }
}

module.exports = { applyGoneRedirects };
