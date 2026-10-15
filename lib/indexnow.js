// ============================================================
// indexnow.js — ping IndexNow with the listing pages that changed
// ============================================================
//
// Added 2026-10-15. IndexNow is how Bing (and through Bing, Copilot and
// ChatGPT search), Yandex, Seznam and Naver hear about new, changed and
// deleted pages within minutes instead of waiting for a recrawl. Google does
// not use it.
//
// What gets pinged: compare the URLs in this build's listing sitemaps (with
// their data-driven <lastmod>) against the sitemaps that are live right now.
//   - changed: the live sitemap has the URL with a different (or no) lastmod
//   - new:     not in the live sitemaps
//   - gone:    in the live state/city/shop sitemaps but not in this build
//              (hidden or closed shops), so engines drop them
//
// The first run after lastmod was added sends every listing URL once,
// because the live sitemaps have no lastmod yet. After that only real data
// changes are sent. Requests are batched at 10,000 URLs (the protocol limit).
//
// Key: config.indexNow.key if set, otherwise the one <32 hex>.txt file at the
// site root whose content is its own name. The key is public by design:
// engines verify ownership by fetching /<key>.txt from the site.
//
// Runs on Netlify production deploys only (CONTEXT=production), or anywhere
// with INDEXNOW_FORCE=1. It never throws: a failed ping must not fail a build.

const fs = require('fs');
const path = require('path');

const ENDPOINT = 'https://api.indexnow.org/indexnow';
const BATCH = 10000;

function findKey(outDir) {
  try {
    const keys = fs.readdirSync(outDir)
      .filter(f => /^[a-f0-9]{32}\.txt$/.test(f))
      .filter(f => fs.readFileSync(path.join(outDir, f), 'utf8').trim() === f.slice(0, 32));
    if (keys.length === 1) return keys[0].slice(0, 32);
    if (keys.length > 1) console.log('  IndexNow: ' + keys.length + ' key files found; set config.indexNow.key to choose one');
  } catch (e) { /* fall through */ }
  return null;
}

async function fetchText(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'coastal-directory-build' } });
    return r.ok ? await r.text() : null;
  } finally { clearTimeout(t); }
}

// loc -> lastmod ('' when the live entry has none), from the live listing sitemaps.
async function liveListingUrls(siteUrl) {
  const idx = await fetchText(siteUrl + '/sitemap.xml');
  if (!idx) return null;
  const files = (idx.match(/<loc>[^<]+<\/loc>/g) || [])
    .map(m => m.replace(/<\/?loc>/g, ''))
    .filter(u => /\/sitemap-(states|shops-\d+)\.xml$/.test(u));
  const live = new Map();
  for (const f of files) {
    const xml = await fetchText(f);
    if (!xml) return null; // incomplete picture: better to skip than to call everything "gone"
    for (const m of xml.match(/<url>.*?<\/url>/gs) || []) {
      const loc = (m.match(/<loc>([^<]+)<\/loc>/) || [])[1];
      const lm = (m.match(/<lastmod>([^<]+)<\/lastmod>/) || [])[1] || '';
      if (loc) live.set(loc, lm);
    }
  }
  return live;
}

async function post(host, key, siteUrl, urlList) {
  const body = JSON.stringify({ host, key, keyLocation: siteUrl + '/' + key + '.txt', urlList });
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 30000);
  try {
    const r = await fetch(ENDPOINT, {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }, body,
    });
    return r.status;
  } finally { clearTimeout(t); }
}

async function pingChanged({ outDir, siteUrl, urls, key }) {
  try {
    if (process.env.CONTEXT !== 'production' && process.env.INDEXNOW_FORCE !== '1') {
      console.log('\nIndexNow: skipped (context=' + (process.env.CONTEXT || 'local') + ')');
      return;
    }
    const k = key || findKey(outDir);
    if (!k) { console.log('\nIndexNow: skipped (no key file found)'); return; }

    console.log('\nIndexNow: comparing with the live sitemaps...');
    const live = await liveListingUrls(siteUrl);
    if (!live) { console.log('  IndexNow: could not read the live sitemaps, skipped'); return; }

    const now = new Set();
    let changed = 0, added = 0;
    const send = [];
    for (const u of urls) {
      const loc = typeof u === 'string' ? u : u.loc;
      const lm = (typeof u === 'string' ? '' : u.lastmod) || '';
      now.add(loc);
      if (live.has(loc)) {
        if (live.get(loc) !== lm) { send.push(loc); changed++; }
      } else {
        send.push(loc); added++;
      }
    }
    let gone = 0;
    for (const loc of live.keys()) {
      if (!now.has(loc)) { send.push(loc); gone++; }
    }
    console.log('  IndexNow: ' + changed + ' changed, ' + added + ' new, ' + gone + ' gone');
    if (!send.length) return;

    const host = new URL(siteUrl).host;
    for (let i = 0; i < send.length; i += BATCH) {
      const batch = send.slice(i, i + BATCH);
      const status = await post(host, k, siteUrl, batch);
      console.log('  IndexNow: HTTP ' + status + ' for ' + batch.length + ' URL(s)');
    }
  } catch (e) {
    console.log('  IndexNow: ' + (e && e.message ? e.message : e));
  }
}

module.exports = { pingChanged, findKey };
