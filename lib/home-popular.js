// ============================================================
// home-popular.js — server-rendered "Popular shops" block on the homepage
// ============================================================
//
// Added 2026-10-17. Called by applyFreshness() (lib/freshness.js) after the
// build, so no site repo needs editing.
//
// Why: each homepage loads its "Featured shops" grid with JavaScript, so the
// HTML that crawlers read links to state pages but to no shop page at all.
// This block puts plain <a href> links to the shops Google already shows
// ("winners", gsc_impr_90d from Search Console) and shops with a written
// description on the homepage, which is the strongest internal link a
// directory has.
//
// Where it goes: between <!-- POPULAR-SHOPS:START --> and
// <!-- POPULAR-SHOPS:END --> if a homepage has those markers; otherwise it is
// inserted just before the "Browse by US state" section, and the markers are
// written around it so later builds replace it instead of adding a second one.
// If neither anchor exists the homepage is left alone.
//
// Never throws: any error is logged and the homepage stays as built.

const fs = require('fs');
const path = require('path');
const { slugify, escHtml, escAttr, isIndexable } = require('./util');
const { stateName } = require('./states');

const START = '<!-- POPULAR-SHOPS:START -->';
const END = '<!-- POPULAR-SHOPS:END -->';
const ANCHOR = /<section class="block"[^>]*>\s*<div class="section-head"><div><h2>Browse by US state<\/h2>/;

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

// First sentence of the shop's description, trimmed to ~150 chars.
function snippet(desc) {
  const d = String(desc || '').trim();
  if (!d) return '';
  const m = d.match(/^(.{40,220}?[.!?])(\s|$)/);
  let s = m ? m[1] : d;
  if (s.length > 150) s = s.slice(0, 147).replace(/\s+\S*$/, '') + '…';
  return s;
}

function pickShops(shops, n) {
  return shops
    .filter(s => isIndexable(s))
    .filter(s => num(s.gsc_impr_90d) > 0 || (s.description && String(s.description).trim()))
    .sort((a, b) =>
      (num(b.gsc_impr_90d) - num(a.gsc_impr_90d))
      || ((b.description ? 1 : 0) - (a.description ? 1 : 0))
      || (num(b.reviewsCount != null ? b.reviewsCount : b.reviews_count) - num(a.reviewsCount != null ? a.reviewsCount : a.reviews_count))
      || String(a.name || '').localeCompare(String(b.name || '')))
    .slice(0, n);
}

function renderBlock(picked, config) {
  const niche = config.niche || {};
  const plural = niche.shopTypePluralCapitalized
    ? niche.shopTypePluralCapitalized.toLowerCase()
    : ((niche.shopType || 'shop') + 's');
  const cards = picked.map(s => {
    const st = slugify(stateName(s.state));
    const city = slugify(s.city || 'Other') || 'other';
    const slug = s.slug || slugify((s.name || '') + '-' + (s.city || ''));
    const href = '/shops/' + st + '/' + city + '/' + slug + '/';
    const sn = snippet(s.description);
    return '<a href="' + escAttr(href) + '" class="shop-card"><h3>' + escHtml(s.name) + '</h3>'
      + '<div class="loc">' + escHtml(s.city || '') + ', ' + escHtml(stateName(s.state)) + '</div>'
      + (sn ? '<p style="margin:8px 0 0;font-size:14px;line-height:1.45">' + escHtml(sn) + '</p>' : '')
      + '</a>';
  }).join('\n');
  return START + '\n<section class="block" style="padding-top:20px" id="popular-shops">\n'
    + ' <div class="section-head"><div><h2>Popular ' + escHtml(plural) + ' right now</h2>'
    + '<div class="sub">The ' + escHtml(plural) + ' collectors find most often when they search, with a quick look at what each one carries.</div></div>'
    + '<a href="/shops/" class="view-all">Browse all ' + escHtml(plural) + ' →</a></div>\n'
    + ' <div class="card-grid">' + cards + '</div>\n</section>\n' + END + '\n';
}

function applyHomePopular(rootDir, shops, config, n = 12) {
  try {
    const file = path.join(rootDir, 'index.html');
    if (!fs.existsSync(file)) return false;
    const picked = pickShops(shops, n);
    if (picked.length < 4) { console.log('  home-popular: skipped (only ' + picked.length + ' shops qualify)'); return false; }
    const block = renderBlock(picked, config);
    let html = fs.readFileSync(file, 'utf8');
    const a = html.indexOf(START), b = html.indexOf(END);
    if (a !== -1 && b > a) {
      html = html.slice(0, a) + block.trimEnd() + html.slice(b + END.length);
    } else if (ANCHOR.test(html)) {
      html = html.replace(ANCHOR, m => block + '\n' + m);
    } else {
      console.log('  home-popular: skipped (no anchor on homepage)');
      return false;
    }
    fs.writeFileSync(file, html);
    console.log('  home-popular: ' + picked.length + ' shops linked from the homepage');
    return true;
  } catch (e) {
    console.log('  home-popular: skipped (' + (e && e.message ? e.message : e) + ')');
    return false;
  }
}

module.exports = { applyHomePopular, pickShops, snippet };
