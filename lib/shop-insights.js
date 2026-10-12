// ============================================================
// shop-insights.js — per-shop facts computed from data we already have
// ============================================================
//
// Added 2026-10-12. Most shop pages were near-copies of each other: the same
// template sentences, and an "Other shops in <state>" grid that showed the
// SAME first four shops (alphabetical) on every page in the state. Google
// reads that as thin, duplicate content (Comics: ~5.6k indexed vs ~14k
// "crawled/discovered – not indexed"). These helpers turn data each shop
// already has (coordinates, hours, rating, reviews, socials) into facts
// that are different on every page:
//
//   nearestShops()   the closest other shops, with real distances
//   parseHours()     "Monday: 9 AM to 5 PM; Tuesday: …" → rows (null if freeform)
//   hourFacts()      "Open Saturdays", "Closed Sundays", "Open 6 days a week"
//   cityRank()       "#2 of 23 rated shops in Houston" (rating weighted by reviews)
//   upcomingShows()  next shows in the shop's state, same city first
//
// Pure functions, no I/O. Everything returns null/[] when the data isn't
// there, so a page simply omits that fact rather than showing a placeholder.

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }

function milesBetween(a, b) {
  const la1 = num(a.lat), lo1 = num(a.lng), la2 = num(b.lat), lo2 = num(b.lng);
  if (la1 == null || lo1 == null || la2 == null || lo2 == null) return null;
  const R = 3958.8, rad = Math.PI / 180;
  const dLat = (la2 - la1) * rad, dLng = (lo2 - lo1) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1 * rad) * Math.cos(la2 * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function sameShop(a, b) {
  return a === b || (a.id != null && a.id === b.id) || (a.slug && a.slug === b.slug);
}

// Closest other shops in the pool (normally the state). Shops without
// coordinates fall back to "same city" so the block never comes up empty
// when there are neighbours to show.
function nearestShops(shop, pool, n = 4) {
  const others = (pool || []).filter(s => !sameShop(s, shop));
  const withDist = others
    .map(s => ({ shop: s, miles: milesBetween(shop, s) }))
    .filter(x => x.miles != null)
    .sort((a, b) => a.miles - b.miles);
  if (withDist.length) return withDist.slice(0, n);
  const city = String(shop.city || '').toLowerCase();
  return others.filter(s => String(s.city || '').toLowerCase() === city).slice(0, n).map(s => ({ shop: s, miles: null }));
}

function fmtMiles(m) {
  if (m == null) return '';
  if (m < 0.1) return 'under 0.1 mi';
  if (m < 10) return m.toFixed(1) + ' mi';
  return Math.round(m) + ' mi';
}

// Google-style "Monday: 9 AM to 5 PM; Tuesday: …" (";" or "|" separated).
// Returns [{day, text}] in Monday→Sunday order, or null for free-form text.
function parseHours(raw) {
  if (!raw || !/^\s*Monday\s*:/i.test(String(raw))) return null;
  const rows = {};
  for (const part of String(raw).split(/\s*[;|]\s*/)) {
    const m = part.match(/^\s*(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s*:\s*(.+?)\s*$/i);
    if (m) rows[m[1][0].toUpperCase() + m[1].slice(1).toLowerCase()] = m[2].replace(/\s+/g, ' ');
  }
  const out = DAYS.filter(d => rows[d]).map(d => ({ day: d, text: rows[d] }));
  return out.length >= 5 ? out : null;
}

function isClosed(t) { return /^closed$/i.test(String(t).trim()); }

function hourFacts(rows) {
  if (!rows) return [];
  if (rows.every(r => /24 hours/i.test(r.text))) return ['Open 24 hours, 7 days a week'];
  const facts = [];
  const open = rows.filter(r => !isClosed(r.text));
  const byDay = Object.fromEntries(rows.map(r => [r.day, r.text]));
  if (open.length === 7) facts.push('Open 7 days a week');
  else if (open.length) facts.push(`Open ${open.length} day${open.length === 1 ? '' : 's'} a week`);
  if (byDay.Saturday) facts.push(isClosed(byDay.Saturday) ? 'Closed Saturdays' : `Open Saturdays (${byDay.Saturday})`);
  if (byDay.Sunday) facts.push(isClosed(byDay.Sunday) ? 'Closed Sundays' : `Open Sundays (${byDay.Sunday})`);
  return facts;
}

// Rating weighted by review count (Bayesian average): a shop needs ~25
// reviews before its own average outweighs the typical 4.5.
const PRIOR_M = 25, PRIOR_C = 4.5, MIN_REVIEWS = 10;
function weighted(s) {
  const r = num(s.totalScore != null ? s.totalScore : s.total_score);
  const n = num(s.reviewsCount != null ? s.reviewsCount : s.reviews_count);
  if (r == null || n == null || n < MIN_REVIEWS) return null;
  return (n / (n + PRIOR_M)) * r + (PRIOR_M / (n + PRIOR_M)) * PRIOR_C;
}

// Rank among rated shops in the same city. Only reported when at least 3
// shops in the city qualify (so "#1 of 1" never appears) and the shop is in
// the top half.
function cityRank(shop, pool) {
  const city = String(shop.city || '').toLowerCase();
  const mine = weighted(shop);
  if (mine == null) return null;
  const rated = (pool || [])
    .filter(s => String(s.city || '').toLowerCase() === city)
    .map(s => ({ s, w: weighted(s) }))
    .filter(x => x.w != null)
    .sort((a, b) => b.w - a.w);
  if (rated.length < 3) return null;
  const idx = rated.findIndex(x => sameShop(x.s, shop));
  // Only report a rank in the top half: "#4 of 4" helps nobody.
  if (idx === -1 || idx + 1 > Math.ceil(rated.length / 2)) return null;
  return { rank: idx + 1, total: rated.length };
}

function upcomingShows(shop, stateEvents, n = 2, today) {
  const t = today || new Date().toISOString().slice(0, 10);
  const city = String(shop.city || '').toLowerCase();
  const seen = new Set();
  return (stateEvents || [])
    .filter(e => e && e.name && e.start_date && (e.end_date || e.start_date) >= t)
    .filter(e => { const k = e.name + e.start_date; if (seen.has(k)) return false; seen.add(k); return true; })
    .map(e => ({ e, here: String(e.city || '').toLowerCase() === city ? 0 : 1, miles: milesBetween(shop, e) }))
    .sort((a, b) => a.e.start_date.localeCompare(b.e.start_date) || a.here - b.here)
    .slice(0, n)
    .map(x => x.e);
}

function fmtDate(iso) {
  const d = new Date(String(iso).slice(0, 10) + 'T12:00:00Z');
  if (isNaN(d)) return String(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

module.exports = { milesBetween, nearestShops, fmtMiles, parseHours, hourFacts, cityRank, weighted, upcomingShows, fmtDate };
