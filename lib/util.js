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

// Truncate a title to maxLen, preferring a word boundary in the last 15 chars.
// Title-tag SEO best practice: keep under 60 chars to avoid Google truncation.
function truncateTitle(s, maxLen = 60) {
  s = String(s || '');
  if (s.length <= maxLen) return s;
  const cut = s.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return lastSpace > maxLen - 15 ? cut.slice(0, lastSpace) : cut;
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
  mkdirp,
  writeFile,
  countDataFields,
  normalizeShop,
};
// both forms.
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
  mkdirp,
  writeFile,
  countDataFields,
  normalizeShop,
};
