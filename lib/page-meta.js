// ============================================================
// page-meta.js — share tags and title length
// ============================================================
//
// SEO audit 2026-10-19 template warnings, fixed after the build so it covers
// hand-written pages (homepage, /about, /faq, guides) as well as generated
// ones. Called by applyFreshness() (lib/freshness.js); no site repo edits.
//
// 1. Share tags: any page with a <head> but no og:image gets og:image
//    (<site>/og-default.png, which every site has), and the missing ones of
//    og:title / og:description / og:url / og:type, plus twitter:card and
//    twitter:image. The audit found 21 of 25 Comics core pages and every
//    sampled Comics and Cards blog post without them.
// 2. Titles over 60 characters on root pages and blog/: the " | <Brand>"
//    suffix is dropped (Google cuts titles near 60 characters, so the brand
//    was the part hidden anyway). Nothing else in a title is changed.
//
// Long meta descriptions are deliberately NOT trimmed: Google shows the first
// ~160 characters anyway, and an automatic cut dropped the selling points
// from sales pages (e.g. the price and "Instant PDF" on /card-guide-2026).
//
// Shop, city, state and event pages are generated with tags and lengths
// already in range, so (2) leaves them alone. Idempotent. Never throws:
// errors are logged and pages stay as built.

const fs = require('fs');
const path = require('path');
const { escAttr } = require('./util');

function readIfExists(f) {
  try { return fs.readFileSync(f, 'utf8'); } catch (e) { return null; }
}

function unescape(s) {
  return String(s || '').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

function metaContent(html, attr, name) {
  const re = new RegExp('<meta\\s+' + attr + '="' + name + '"\\s+content="([^"]*)"', 'i');
  const m = html.match(re);
  return m ? m[1] : null;
}

function hasMeta(html, attr, name) {
  return new RegExp('<meta\\s+' + attr + '="' + name + '"', 'i').test(html);
}

// 1. Missing share tags, inserted just before </head>. Only tags the page
// lacks are added; an existing og:image is reused for twitter:image.
function addShareTags(html, site) {
  if (!html.includes('</head>')) return html;
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  const desc = metaContent(html, 'name', 'description') || '';
  const canon = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1] || '';
  const img = metaContent(html, 'property', 'og:image') || site + '/og-default.png';
  const tags = [];
  if (!hasMeta(html, 'property', 'og:title') && title) tags.push('<meta property="og:title" content="' + title + '">');
  if (!hasMeta(html, 'property', 'og:description') && desc) tags.push('<meta property="og:description" content="' + desc + '">');
  if (!hasMeta(html, 'property', 'og:url') && canon) tags.push('<meta property="og:url" content="' + canon + '">');
  if (!hasMeta(html, 'property', 'og:type')) tags.push('<meta property="og:type" content="website">');
  if (!hasMeta(html, 'property', 'og:image')) tags.push('<meta property="og:image" content="' + img + '">');
  if (!hasMeta(html, 'name', 'twitter:card')) tags.push('<meta name="twitter:card" content="summary_large_image">');
  if (!hasMeta(html, 'name', 'twitter:image')) tags.push('<meta name="twitter:image" content="' + img + '">');
  if (!tags.length) return html;
  const i = html.indexOf('</head>');
  return html.slice(0, i) + tags.join('\n') + '\n' + html.slice(i);
}

// 2. Drop a trailing " | <Brand>" from titles over 60 characters.
function shortenTitle(html, brandNames) {
  const m = html.match(/<title>([^<]*)<\/title>/);
  if (!m) return html;
  const t = unescape(m[1]);
  if (t.length <= 60) return html;
  for (const b of brandNames) {
    const suffix = new RegExp('\\s*[|\\u2013\\u2014-]\\s*' + b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'i');
    if (suffix.test(t)) {
      const short = t.replace(suffix, '');
      if (short.length >= 20) return html.replace(m[0], () => '<title>' + escAttr(short) + '</title>');
    }
  }
  return html;
}

function applyPageMeta(rootDir, config) {
  try {
    const site = String((config && config.brand && config.brand.fullUrl) || '').replace(/\/$/, '');
    if (!site) return;
    const brand = (config.brand && config.brand.name) || '';
    const domain = site.replace(/^https?:\/\//, '');
    // "ComicStoresNearMe.com", "ComicStoresNearMe", "comicstoresnearme.com" all count.
    const brandNames = [...new Set([brand + '.' + domain.split('.').pop(), brand, domain].filter(Boolean))];
    let share = 0, titles = 0;
    const visit = (f, lengths) => {
      const html = readIfExists(f);
      if (!html || !html.includes('</head>')) return;
      let out = addShareTags(html, site);
      if (out !== html) share++;
      if (lengths) {
        const t = shortenTitle(out, brandNames); if (t !== out) { titles++; out = t; }
      }
      if (out !== html) fs.writeFileSync(f, out);
    };
    const walk = (d, lengths) => {
      if (!fs.existsSync(d)) return;
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p, lengths); else if (e.name.endsWith('.html')) visit(p, lengths);
      }
    };
    for (const e of fs.readdirSync(rootDir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      const p = path.join(rootDir, e.name);
      if (e.isFile() && e.name.endsWith('.html')) visit(p, e.name !== '404.html');
      else if (e.isDirectory()) walk(p, e.name === 'blog');
    }
    console.log('  page-meta: share tags added on ' + share + ' pages, ' + titles + ' titles shortened');
  } catch (e) {
    console.log('  page-meta: skipped (' + (e && e.message ? e.message : e) + ')');
  }
}

module.exports = { applyPageMeta, addShareTags, shortenTitle };
