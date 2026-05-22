// ============================================================
// util.js — small helpers used everywhere
// ============================================================

const fs = require('fs');
const path = require('path');

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}

function escHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escAttr(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Title-case a string ("coin shop" → "Coin Shop", "comic book store" →
// "Comic Book Store"). Lower-cases short connector words like "of"/"and".
function titleCase(s) {
  const small = new Set(['of', 'and', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for']);
  return String(s || '')
    .split(/(\s+)/)
    .map((token, i) => {
      if (/^\s+$/.test(token)) return token;
      if (i > 0 && small.has(token.toLowerCase())) return token.toLowerCase();
      return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    })
    .join('');
}

// Truncate a title to maxLen at a word boundary, never leaving a dangling
// comma, connector, or partial word. Title-tag SEO best practice: keep
// under ~60 chars to avoid Google truncation.
function truncateTitle(s, maxLen = 60) {
  s = String(s || '').trim();
  if (s.length <= maxLen) return s;
  const cut = s.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  const out = lastSpace > maxLen - 15 ? cut.slice(0, lastSpace) : cut;
  return out.replace(/[\s,;:.\-–—&]+$/, '');
}

// Build an SEO title for a shop page: "<Name> — <ShopType> in <City>, <State>".
// When the whole string is too long, the SHOP NAME is shortened (whole words
// dropped first) while the location suffix is kept intact — so the title
// always ends cleanly on the keyword-rich city + state.
function buildShopTitle(name, shopType, city, state, maxLen = 60) {
  name = String(name || '').trim();
  city = String(city || '').trim();
  const suffix = ' — ' + shopType + ' in ' + city + ', ' + state;
  if ((name + suffix).length <= maxLen) return name + suffix;

  const room = maxLen - suffix.length;
  if (room >= 6) {
    let kept = '';
    for (const word of name.split(/\s+/)) {
      const candidate = kept ? kept + ' ' + word : word;
      if (candidate.length > room) break;
      kept = candidate;
    }
    if (kept) return kept.replace(/[\s,;:.\-–—&]+$/, '') + suffix;
    // First word alone is longer than room — hard-cut it with an ellipsis.
    return name.slice(0, Math.max(1, room - 1)).replace(/[\s,;:.\-–—&]+$/, '') + '…' + suffix;
  }
  // Location suffix alone is too long (very rare): fall back to a clean cut.
  return truncateTitle(name + suffix, maxLen);
}

// Truncate prose for a <meta name="description">. Never ends mid-word or on a
// dangling comma/connector. Prefers a sentence boundary when one falls in a
// sensible range; otherwise cuts at a word boundary and appends an ellipsis.
function clampText(s, maxLen = 160) {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  if (s.length <= maxLen) return s;
  const cut = s.slice(0, maxLen);
  const lastPeriod = cut.lastIndexOf('. ');
  if (lastPeriod >= maxLen * 0.55) return cut.slice(0, lastPeriod + 1);
  let out = cut.slice(0, cut.lastIndexOf(' '));
  out = out.replace(/[\s,;:.\-–—&]+$/, '');
  out = out.replace(/\s+\b(and|or|the|a|an|with|to|for|of|in|on|at|by)\b$/i, '');
  return out + '…';
}

function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeFile(filepath, content) {
  mkdirp(path.dirname(filepath));
  fs.writeFileSync(filepath, content, 'utf8');
}

// Count "interesting" data fields on a shop. Used to filter out
// shops that would render as thin/useless pages.
function countDataFields(s) {
  let c = 0;
  if (s.website) c++;
  if (s.phone) c++;
  if (s.address) c++;
  if (s.description) c++;
  if (s.hours) c++;
  if (s.services && s.services.length > 0) c++;
  if (s.totalScore || s.total_score) c++;
  return c;
}

// Normalize fieldnames between repos (CSNM uses camelCase for some,
// CNM uses snake_case). Returns a shallow-copied shop with both forms.
function normalizeShop(s) {
  const out = Object.assign({}, s);
  out.totalScore = s.totalScore != null ? s.totalScore : s.total_score;
  out.reviewsCount = s.reviewsCount != null ? s.reviewsCount : s.reviews_count;
  out.googleMaps = s.googleMaps || s.google_maps;
  out.ownerVerified = s.ownerVerified != null ? s.ownerVerified : s.owner_verified;
  out.stateFull = s.stateFull || s.state_full;
  return out;
}

module.exports = {
  slugify,
  escHtml,
  escAttr,
  titleCase,
  truncateTitle,
  buildShopTitle,
  clampText,
  mkdirp,
  writeFile,
  countDataFields,
  normalizeShop,
};
