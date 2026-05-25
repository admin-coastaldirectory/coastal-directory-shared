// ============================================================
// templates/shell.js — page shell (head, header, footer, CTA, cards)
// ============================================================
//
// `pageShell` wraps any page body in the canonical <html><head><body>...
// structure with brand-colored CSS variables, GA tag, meta + OG tags,
// JSON-LD schema injection, and the full CSNM-style inline stylesheet.
//
// Everything is inlined per page (no external stylesheet) so the
// generated /shops/... pages render identically to the hand-written
// static pages (homepage, /about, /faq, etc.).
//
// `header`, `footer`, `ctaBanner`, `cdnBand` build the chrome from the
// site config. `shopCard` and `eventCard` are the small grid items
// reused across listing pages.
//
// Config inputs the shell understands (all optional, with sensible
// defaults so older configs still work):
//
//   config.brand.{name,legalName,fullUrl,domain}
//   config.colors.{accent,accentDark,accentHover,secondary}
//   config.analytics.gtag
//   config.nav            — flat array OR array with .dropdown children
//   config.footerLinks    — flat array (used as fallback)
//   config.footerColumns  — [{ heading, links: [{label, href, external}] }]
//   config.footerAbout    — short paragraph under the brand mark
//   config.sisterSite     — { label, href }
//   config.cdn            — { columns: [{ heading, items: [{name,tag,href,external,current}] }] }
//   config.cta            — { headline, body, primaryButton, secondaryButton }

const { escHtml, escAttr } = require('../util');

// ------------------------------------------------------------
// pageShell — outermost wrapper
// ------------------------------------------------------------
//
// Args:
//   config:       site config (for brand, colors, gtag, nav, etc.)
//   title:        page title (already truncated)
//   description:  meta description (already truncated to ~155 chars)
//   canonical:    full https URL of the page
//   schema:       array of JSON-LD objects (or single object)
//   body:         HTML string of the page body
//   ogImage:      optional path/URL to og:image (defaults to /og-default.png)

function pageShell({ config, title, description, canonical, schema, body, ogImage }) {
  const brand = config.brand;
  const colors = config.colors || {};
  const ga = config.analytics && config.analytics.gtag;

  const accent = colors.accent || '#1a3a5c';
  const accentDark = colors.accentDark || '#0f2740';
  const accentHover = colors.accentHover || accentDark;
  const secondary = colors.secondary || '#c9a227';

  const schemaTags = (Array.isArray(schema) ? schema : [schema])
    .filter(Boolean)
    .map(s => `<script type="application/ld+json">${JSON.stringify(s)}</script>`)
    .join('\n');

  const gaSnippet = ga ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${escAttr(ga)}"></script>
<script>
window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());
gtag('config','${escAttr(ga)}');
</script>` : '';

  const ogImg = ogImage || `${brand.fullUrl}/og-default.png`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${gaSnippet}
<title>${escAttr(title)}</title>
<meta name="description" content="${escAttr(description)}">
<link rel="canonical" href="${escAttr(canonical)}">
<meta name="robots" content="index, follow">
<meta property="og:title" content="${escAttr(title)}">
<meta property="og:description" content="${escAttr(description)}">
<meta property="og:url" content="${escAttr(canonical)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${escAttr(brand.name)}">
<meta property="og:image" content="${escAttr(ogImg)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escAttr(title)}">
<meta name="twitter:description" content="${escAttr(description)}">
<meta name="twitter:image" content="${escAttr(ogImg)}">
${schemaTags}
<style>${inlineCss({ accent, accentDark, accentHover, secondary })}</style>
</head>
<body>
${header(config)}
${body}
${ctaBanner(config)}
${cdnBand(config)}
${footer(config)}
<script>${dropdownNavScript()}</script>
</body>
</html>`;
}

// ------------------------------------------------------------
// inlineCss — full CSNM-style inline stylesheet, brand-colorized
// ------------------------------------------------------------

function inlineCss({ accent, accentDark, accentHover, secondary }) {
  return `
*,*::before,*::after{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#222;background:#fafaf7;line-height:1.5;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
button{font-family:inherit;cursor:pointer}

/* Header */
.site-header{background:#fff;border-bottom:1px solid #ebebeb;position:sticky;top:0;z-index:50}
.site-header .inner{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;max-width:1100px;margin:0 auto;gap:20px;flex-wrap:wrap}
.brand{display:flex;flex-direction:column}
.brand-mark{font-size:19px;font-weight:500;color:#111;letter-spacing:-0.3px;font-family:Georgia,'Times New Roman',serif;line-height:1}
.brand-rule{height:3px;width:42px;background:${secondary};margin-top:5px}
nav.primary{display:flex;gap:22px;font-size:14px;color:#444;align-items:center;position:relative}
nav.primary a{transition:color .15s}
nav.primary a:hover{color:${accent}}
nav.primary .cta{padding:9px 16px;border-radius:8px;font-weight:500;font-size:13px;transition:all .15s}
nav.primary .cta.outline{background:#fff;color:${accent};border:1px solid ${accent}}
nav.primary .cta.outline:hover{background:${accent};color:#fff}
nav.primary .cta.filled{background:${accent};color:#fff;border:1px solid ${accent}}
nav.primary .cta.filled:hover{background:${accentHover};border-color:${accentHover};color:#fff}
@media (max-width:820px){
 nav.primary{gap:14px;font-size:13px;width:100%;justify-content:flex-start;flex-wrap:wrap}
 nav.primary .cta{padding:7px 12px;font-size:12px}
 .site-header .inner{padding:14px 20px}
}

/* Nav dropdowns */
.nav-item-drop{position:relative;display:inline-block}
.nav-item-drop > a.has-drop{display:inline-flex;align-items:center;gap:4px;cursor:pointer}
.nav-item-drop > a.has-drop .caret{font-size:10px;color:#888;transition:transform .15s}
.nav-item-drop:hover > a.has-drop .caret,.nav-item-drop.open > a.has-drop .caret{transform:rotate(180deg)}
.nav-item-drop > .dropdown{position:absolute;top:100%;left:50%;transform:translateX(-50%);background:#fff;border:1px solid #ebebeb;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.08);padding:6px;min-width:200px;display:none;z-index:60;flex-direction:column;margin-top:4px}
.nav-item-drop:hover > .dropdown,.nav-item-drop.open > .dropdown{display:flex}
.nav-item-drop > .dropdown::before{content:'';position:absolute;top:-8px;left:0;right:0;height:8px}
.nav-item-drop > .dropdown a{display:block;padding:9px 14px;font-size:13px;color:#444;border-radius:5px;white-space:nowrap;margin:0;background:transparent;text-decoration:none}
.nav-item-drop > .dropdown a:hover{background:#fafaf7;color:${accent}}
nav.primary > a.current,.nav-item-drop > a.has-drop.current{color:${accent};font-weight:500}
@media (max-width:820px){
 nav.primary{flex-direction:column;align-items:stretch;gap:4px;width:100%}
 nav.primary > a,nav.primary > .nav-item-drop{width:100%;display:block}
 nav.primary > a{padding:10px 0}
 .nav-item-drop{display:block;width:100%}
 .nav-item-drop > a.has-drop{justify-content:space-between;width:100%;padding:10px 0}
 .nav-item-drop > .dropdown{position:static;transform:none;display:none;width:100%;margin-top:0;box-shadow:none;border:none;background:#fafaf7;padding:4px 0 4px 16px;border-radius:0;border-left:2px solid #ebebeb;margin-left:8px;min-width:0}
 .nav-item-drop > .dropdown::before{display:none}
 .nav-item-drop:hover > .dropdown{display:none !important}
 .nav-item-drop.open > .dropdown{display:flex !important}
 .nav-item-drop > .dropdown a{padding:8px 10px;white-space:normal}
 nav.primary > a.cta{margin-top:6px;text-align:center}
}

/* Mobile hamburger (pure CSS via checkbox) */
.nav-toggle-input{display:none}
.nav-toggle-btn{display:none;background:transparent;border:0;padding:8px;cursor:pointer;width:40px;height:40px;flex-direction:column;justify-content:center;align-items:center;gap:5px;margin-left:auto}
.nav-toggle-btn span{display:block;width:22px;height:2px;background:#222;transition:transform .2s, opacity .2s}
@media (max-width:820px){
 .nav-toggle-btn{display:flex;flex-shrink:0}
 nav.primary{display:none;width:100%;flex-basis:100%;order:99;padding-top:12px;border-top:1px solid #ebebeb;margin-top:8px}
 .nav-toggle-input:checked ~ .inner nav.primary{display:flex;flex-direction:column;align-items:stretch;gap:4px}
 .nav-toggle-input:checked ~ .inner nav.primary > a,
 .nav-toggle-input:checked ~ .inner nav.primary > .nav-item-drop{width:100%;display:block;padding:8px 0}
 .nav-toggle-input:checked ~ .inner nav.primary .cta{display:block;text-align:center;width:100%;margin-top:4px}
 .nav-toggle-input:checked ~ .inner .nav-toggle-btn span:nth-child(1){transform:translateY(7px) rotate(45deg)}
 .nav-toggle-input:checked ~ .inner .nav-toggle-btn span:nth-child(2){opacity:0}
 .nav-toggle-input:checked ~ .inner .nav-toggle-btn span:nth-child(3){transform:translateY(-7px) rotate(-45deg)}
}

/* Page intro (hero band for /shops/state, /shops/state/city, /shops/.../shop) */
.page-intro{background:#fff;border-bottom:1px solid #ebebeb;padding:44px 20px 32px}
.page-intro .wrap{max-width:1100px;margin:0 auto}
.eyebrow{display:inline-block;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:${accent};font-weight:500;margin-bottom:10px}
h1{font-size:34px;font-weight:500;color:#111;line-height:1.15;font-family:Georgia,serif;letter-spacing:-0.5px;margin:0 0 10px}
.lede{font-size:15px;color:#666;max-width:640px;margin:0;line-height:1.6}
.breadcrumb{font-size:13px;color:#888;margin-bottom:16px}
.breadcrumb a{color:${accent}}
.breadcrumb a:hover{text-decoration:underline}
@media (max-width:560px){h1{font-size:26px}.page-intro{padding:32px 20px 24px}}

/* Main content (760 default, 1100 on .content-wide) */
main.content{max-width:760px;margin:0 auto;padding:42px 20px 60px}
main.content.content-wide{max-width:1100px}
main.content h2{font-size:22px;font-weight:500;color:#111;font-family:Georgia,serif;margin:36px 0 12px;letter-spacing:-0.3px;line-height:1.2}
main.content h2:first-child{margin-top:0}
main.content h3{font-size:17px;font-weight:500;color:#111;margin:22px 0 8px}
main.content p{font-size:15px;color:#444;line-height:1.75;margin:0 0 16px}
main.content a:not(.btn):not(.shop-card):not(.event-card):not(.neighbor-link):not(.city-card){color:${accent};font-weight:500}
main.content a:not(.btn):not(.shop-card):not(.event-card):not(.neighbor-link):not(.city-card):hover{text-decoration:underline}
main.content ul,main.content ol{font-size:15px;color:#444;line-height:1.8;padding-left:22px;margin:0 0 18px}
main.content li{margin-bottom:6px}
main.content strong{font-weight:500;color:#111}

/* Detail rows (shop page) */
.detail-row{display:flex;gap:8px;margin-bottom:6px;font-size:14px}
.detail-row .label{color:#888;min-width:80px;flex-shrink:0}
.detail-row .value{color:#333}

/* Buttons */
.btn{display:inline-block;background:${accent};color:#fff;padding:11px 20px;border-radius:8px;font-size:14px;font-weight:500;transition:background .15s;border:none;text-decoration:none;line-height:1.3}
.btn:hover{background:${accentHover};color:#fff}
.btn.outline{background:#fff;color:${accent};border:1px solid ${accent}}
.btn.outline:hover{background:${accent};color:#fff}

/* Card grids */
.card-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin:24px 0}

/* Shop card */
.shop-card{background:#fff;border:1px solid #ebebeb;border-radius:12px;padding:20px;transition:all .15s;display:block;position:relative;color:inherit}
.shop-card:hover{border-color:#d5d5d5;transform:translateY(-2px)}
.shop-card.is-featured{border:2px solid ${accent};margin-top:10px}
.shop-card h3{font-size:16px;font-weight:500;color:#111;margin:0 0 4px;line-height:1.3}
.shop-card .loc{font-size:13px;color:#666;margin-bottom:10px}
.shop-card .tags{display:flex;gap:6px;flex-wrap:wrap}
.shop-card.city-card{text-align:center}

/* Badges & ribbons */
.badge-verified{display:inline-flex;align-items:center;gap:5px;background:#e7f8e7;color:#1a6a3a;padding:4px 10px;border-radius:12px;font-size:11px;font-weight:600;line-height:1;margin-bottom:8px}
.badge-verified .star{font-size:10px}
.featured-ribbon{position:absolute;top:-10px;left:16px;background:${accent};color:#fff;padding:3px 10px;border-radius:10px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;display:inline-flex;align-items:center;gap:4px;line-height:1}
.featured-ribbon .star{font-size:9px}
.featured-badge-hero{display:inline-flex;align-items:center;gap:5px;background:${secondary};color:#fff;padding:5px 12px;border-radius:12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:14px;margin-right:8px;line-height:1}
.featured-badge-hero .star{font-size:10px}

/* Tags */
.tag{font-size:11px;color:#555;background:#f5f5f5;padding:4px 10px;border-radius:12px;display:inline-block;line-height:1.4}
.tag.cgc{color:#5a6a7a;background:#eef2f5}
.tag.feat{color:#8a6a00;background:#fff4d6}
.tag.free{color:#1a6a3a;background:#e6f7ec}

/* Event card */
.event-card{background:#fff;border:1px solid #ebebeb;border-radius:12px;padding:18px;display:flex;gap:16px;align-items:flex-start;transition:all .15s;color:inherit}
.event-card:hover{border-color:#d5d5d5;transform:translateY(-2px)}
.date-block{flex-shrink:0;width:56px;text-align:center;background:#fafaf7;border:1px solid #f0f0f0;border-radius:8px;padding:8px 4px}
.date-block .mo{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:${secondary};font-weight:500}
.date-block .day{font-size:20px;font-weight:500;color:#111;line-height:1.1;font-family:Georgia,serif}
.event-body{flex:1;min-width:0}
.event-body h3{font-size:14px;font-weight:500;color:#111;margin:0 0 3px;line-height:1.3}
.event-body .meta{font-size:12px;color:#666}

/* Neighbors */
.neighbors{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 20px}
.neighbor-link{background:#fff;border:1px solid #ebebeb;border-radius:8px;padding:8px 14px;font-size:13px;color:#333;transition:all .15s;text-decoration:none}
.neighbor-link:hover{border-color:${accent};color:${accent}}

/* Claim CTA box (shop page) */
.claim-cta{margin-top:36px;background:#fff;border:1px solid #ebebeb;border-radius:12px;padding:20px 22px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.claim-cta strong{font-weight:500;color:#111;font-size:15px}

/* Persistent CTA banner */
.persistent-cta{background:#1a1a1a;color:#fff;padding:52px 20px;text-align:center}
.persistent-cta h2{font-size:26px;font-weight:500;color:#fff;font-family:Georgia,serif;letter-spacing:-0.4px;margin:0 0 10px;line-height:1.15}
.persistent-cta p{font-size:15px;color:#bbb;max-width:560px;margin:0 auto 22px;line-height:1.6}
.persistent-cta .btn-row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.persistent-cta .btn{display:inline-block;padding:12px 22px;border-radius:8px;font-size:14px;font-weight:500;transition:all .15s;text-decoration:none}
.persistent-cta .btn.outline{background:transparent;color:#fff;border:1px solid #444}
.persistent-cta .btn.outline:hover{background:#fff;color:#1a1a1a;border-color:#fff}

/* Coastal Directory Network band */
.cdn-band{background:#1a1a1a;color:#cfcfcf;padding:48px 20px 36px;border-top:1px solid #2a2a2a}
.cdn-inner{max-width:1100px;margin:0 auto}
.cdn-eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#888;font-weight:600;margin:0 0 22px;text-align:center}
.cdn-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:28px}
.cdn-col{background:#222;border:1px solid #2a2a2a;border-radius:10px;padding:0;overflow:hidden}
.cdn-col details{padding:0}
.cdn-col summary{cursor:pointer;list-style:none;padding:18px 22px;display:flex;align-items:center;justify-content:space-between;font-family:Georgia,serif;font-size:15px;color:#fff;font-weight:500;letter-spacing:0.2px}
.cdn-col summary::-webkit-details-marker{display:none}
.cdn-col summary::after{content:'\\25B2';font-size:11px;color:#888;transition:transform .2s}
.cdn-col details:not([open]) summary::after{transform:rotate(180deg)}
.cdn-col summary:hover{background:#262626}
.cdn-list{list-style:none;padding:4px 12px 14px;margin:0;border-top:1px solid #2a2a2a}
.cdn-item{display:block;padding:12px 10px;border-radius:6px;text-decoration:none;color:#cfcfcf;transition:background .15s}
.cdn-item:hover{background:#2a2a2a;color:#fff}
.cdn-item .cdn-name{display:flex;justify-content:space-between;align-items:center;font-size:14px;font-weight:500;color:#fff;margin-bottom:2px}
.cdn-item .cdn-name .cdn-arrow{color:#888;font-size:12px;flex-shrink:0;margin-left:8px}
.cdn-item .cdn-tag{font-size:12px;color:#888;line-height:1.4}
.cdn-item.current{background:#1a2233;border:1px solid #243049;cursor:default;pointer-events:none}
.cdn-item.current .cdn-name{color:#b8c8dc}
.cdn-item.current .cdn-arrow{color:${accent};font-size:10px}
@media (max-width:820px){.cdn-grid{grid-template-columns:1fr;gap:14px}.cdn-band{padding:36px 20px 28px}}

/* Footer */
footer{background:#fff;border-top:1px solid #ebebeb;padding:48px 20px 24px;color:#666}
footer .grid{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:2fr repeat(3,1fr);gap:32px}
footer .brand-col .brand-mark{font-size:17px}
footer .brand-col .brand-rule{height:3px;width:42px;background:${secondary};margin-top:5px}
footer .about{font-size:13px;color:#888;margin-top:12px;max-width:260px;line-height:1.6}
footer h4{font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#444;margin:0 0 14px;font-weight:500}
footer ul{list-style:none;padding:0;margin:0}
footer li{margin-bottom:8px;font-size:13px}
footer a{color:#666;transition:color .15s}
footer a:hover{color:${accent}}
.copyright{max-width:1100px;margin:32px auto 0;padding-top:20px;border-top:1px solid #f0f0f0;font-size:12px;color:#999;display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px}
.copyright .sister{color:#999}
.copyright .sister a{color:#666;border-bottom:1px dotted #ccc}
.copyright .sister a:hover{color:${accent};border-bottom-color:${accent}}
@media (max-width:720px){footer .grid{grid-template-columns:1fr 1fr;gap:24px}footer .brand-col{grid-column:1/-1}}
`;
}

// ------------------------------------------------------------
// header — sticky site-wide top bar with brand + dropdown nav
// ------------------------------------------------------------

function header(config) {
  const brand = config.brand;
  const navItems = config.nav || [];
  const navHtml = navItems.map(renderNavItem).join('');

  return `<header class="site-header">
 <input type="checkbox" id="nav-toggle" class="nav-toggle-input">
 <div class="inner">
  <a href="/" class="brand">
   <div class="brand-mark">${escHtml(brand.name)}</div>
   <div class="brand-rule"></div>
  </a>
  <label for="nav-toggle" class="nav-toggle-btn" aria-label="Menu"><span></span><span></span><span></span></label>
  <nav class="primary">${navHtml}</nav>
 </div>
</header>`;
}

function renderNavItem(item) {
  // Nav item shapes:
  //   { label, href }                              — plain link
  //   { label, href, cta: 'outline' | 'filled' }   — button-styled link
  //   { label, href, dropdown: [{label,href},…] }  — has-drop link with menu
  if (item.dropdown && item.dropdown.length) {
    const ddLinks = item.dropdown
      .map(d => `<a href="${escAttr(d.href)}">${escHtml(d.label)}</a>`)
      .join('');
    return `<div class="nav-item-drop"><a href="${escAttr(item.href)}" class="has-drop">${escHtml(item.label)} <span class="caret">▾</span></a><div class="dropdown">${ddLinks}</div></div>`;
  }
  if (item.cta) {
    return `<a href="${escAttr(item.href)}" class="cta ${escAttr(item.cta)}">${escHtml(item.label)}</a>`;
  }
  return `<a href="${escAttr(item.href)}">${escHtml(item.label)}</a>`;
}

// ------------------------------------------------------------
// ctaBanner — persistent "list your shop" call-to-action
// ------------------------------------------------------------

function ctaBanner(config) {
  // New split CTA band ("list your shop" CTA + inline newsletter
  // Subscribe form). Each site supplies its exact band HTML as
  // config.ctaBand (a full <style>/<section>/<script> block) so the
  // generated markup matches the deployed pages byte-for-byte.
  // Falls back to the legacy single-CTA banner if ctaBand is absent.
  if (config.ctaBand) return config.ctaBand;
  const cta = config.cta || {};
  return `<section class="persistent-cta">
 <h2>${escHtml(cta.headline || 'Own a shop?')}</h2>
 <p>${escHtml(cta.body || 'Get in front of collectors. Free listings or featured placement.')}</p>
 <div class="btn-row">
  <a href="/submit" class="btn">${escHtml(cta.primaryButton || 'List your shop free')}</a>
  <a href="/advertise" class="btn outline">${escHtml(cta.secondaryButton || 'Advertise with us')}</a>
 </div>
</section>`;
}

// ------------------------------------------------------------
// cdnBand — Coastal Directory Network promo band
// ------------------------------------------------------------
//
// The "current" site (the one being generated) is highlighted as
// "YOU ARE HERE" — matched by config.brand.name. Override entirely
// by passing config.cdn = { columns: [...] }; otherwise the default
// CDN layout is rendered.

function cdnBand(config) {
  const cdn = (config.cdn && config.cdn.columns) ? config.cdn : defaultCdn();
  const currentName = (config.brand && config.brand.name) || '';

  const cols = cdn.columns.map(col => {
    const lis = col.items.map(it => {
      const isCurrent = it.current || (it.name && it.name === currentName);
      if (isCurrent) {
        return `<li><span class="cdn-item current"><span class="cdn-name">${escHtml(it.name)}<span class="cdn-arrow">YOU ARE HERE</span></span><span class="cdn-tag">${escHtml(it.tag || '')}</span></span></li>`;
      }
      const ext = it.external !== false;
      const target = ext ? ' target="_blank" rel="noopener"' : '';
      const arrow = ext ? '↗' : '→';
      return `<li><a class="cdn-item" href="${escAttr(it.href || '#')}"${target}><span class="cdn-name">${escHtml(it.name)}<span class="cdn-arrow">${arrow}</span></span><span class="cdn-tag">${escHtml(it.tag || '')}</span></a></li>`;
    }).join('');
    return `<div class="cdn-col"><details open><summary>${escHtml(col.heading)}</summary><ul class="cdn-list">${lis}</ul></details></div>`;
  }).join('');

  return `<section class="cdn-band">
 <div class="cdn-inner">
  <h2 class="cdn-eyebrow">Coastal Directory Network</h2>
  <div class="cdn-grid">${cols}</div>
 </div>
</section>`;
}

function defaultCdn() {
  return {
    columns: [
      {
        heading: 'Local Directories',
        items: [
          { name: 'CoinsNearMe', tag: 'Coin shops nationwide', href: 'https://coinsnearme.co' },
          { name: 'ComicStoresNearMe', tag: 'Comic book stores nationwide', href: 'https://comicstoresnearme.com' },
        ],
      },
      {
        heading: 'Influencer Network',
        items: [
          { name: 'CollectiblesFamous', tag: 'Creators in the collectibles world', href: 'https://collectiblesfamous.com' },
          { name: 'SMBProFind', tag: 'Small business professional finder', href: 'https://smbprofind.com' },
          { name: 'ChefFind', tag: 'Chefs & culinary talent directory', href: 'https://cheffind.com' },
        ],
      },
      {
        heading: 'Youth Sports',
        items: [
          { name: 'YouthSportsConnect', tag: 'Youth sports programs & resources', href: 'https://youthsportsconnect.co' },
        ],
      },
    ],
  };
}

// ------------------------------------------------------------
// footer — multi-column footer + copyright + sister-site strip
// ------------------------------------------------------------

function footer(config) {
  const brand = config.brand;
  const year = new Date().getFullYear();

  // Multi-column layout if config.footerColumns is provided; otherwise
  // a single column derived from config.footerLinks / config.nav.
  let columnsHtml;
  if (Array.isArray(config.footerColumns) && config.footerColumns.length) {
    columnsHtml = config.footerColumns.map(col => {
      const links = (col.links || []).map(l => {
        const ext = l.external ? ' target="_blank" rel="noopener"' : '';
        const arrow = l.external ? ' ↗' : '';
        return `<li><a href="${escAttr(l.href)}"${ext}>${escHtml(l.label)}${arrow}</a></li>`;
      }).join('');
      return `<div><h4>${escHtml(col.heading)}</h4><ul>${links}</ul></div>`;
    }).join('');
  } else {
    const flat = config.footerLinks || config.nav || [];
    const links = flat.map(l =>
      `<li><a href="${escAttr(l.href)}">${escHtml(l.label)}</a></li>`
    ).join('');
    columnsHtml = `<div><h4>Links</h4><ul>${links}</ul></div>`;
  }

  const aboutText = config.footerAbout
    || `The dedicated local directory for ${brand.name}.`;

  const sister = config.sisterSite;
  const sisterHtml = sister
    ? `<div class="sister">Sister site: <a href="${escAttr(sister.href)}" target="_blank" rel="noopener">${escHtml(sister.label)}</a></div>`
    : '';

  return `<footer>
 <div class="grid">
  <div class="brand-col">
   <div class="brand-mark">${escHtml(brand.name)}</div>
   <div class="brand-rule"></div>
   <p class="about">${escHtml(aboutText)}</p>
  </div>
  ${columnsHtml}
 </div>
 <div class="copyright">
  <div>&copy; ${year} ${escHtml(brand.name)}${brand.domain ? '.' + escHtml(brand.domain.replace(/^.*\./, '')) : ''} &middot; ${escHtml(brand.legalName || 'Coastal Directory LLC, Wyoming')}. All rights reserved.</div>
  ${sisterHtml}
 </div>
</footer>`;
}

// ------------------------------------------------------------
// dropdownNavScript — the /* dropdown-nav-js-v3 */ IIFE
// ------------------------------------------------------------
//
// Matches current path against nav links to apply .current, and
// handles mobile-tap-to-open-then-tap-to-navigate behaviour.

function dropdownNavScript() {
  return `
/* dropdown-nav-js-v3 */
(function(){
  var path = location.pathname.replace(/\\/$/, '') || '/';
  document.querySelectorAll('nav.primary > a, .nav-desktop > a, .nav-mobile > a, .nav-item-drop > a.has-drop').forEach(function(a){
    var href = a.getAttribute('href');
    if(!href) return;
    var hp = href.split('?')[0].replace(/\\/$/, '') || '/';
    if(hp === path) a.classList.add('current');
  });
  function isMobileMode(wrap){
    var dropdown = wrap.querySelector(':scope > .dropdown');
    if(!dropdown) return false;
    var pos = window.getComputedStyle(dropdown).position;
    return pos === 'static';
  }
  document.querySelectorAll('.nav-item-drop > a.has-drop').forEach(function(a){
    a.addEventListener('click', function(e){
      var wrap = a.parentElement;
      if(!isMobileMode(wrap)) return;
      if(!wrap.classList.contains('open')){
        e.preventDefault();
        var parentNav = wrap.parentElement;
        parentNav.querySelectorAll('.nav-item-drop.open').forEach(function(o){
          if(o !== wrap) o.classList.remove('open');
        });
        wrap.classList.add('open');
      }
    });
  });
  document.addEventListener('click', function(e){
    if(!e.target.closest('nav.primary, .nav-desktop, .nav-mobile')){
      document.querySelectorAll('.nav-item-drop.open').forEach(function(o){
        o.classList.remove('open');
      });
    }
  });
})();
`;
}

// ------------------------------------------------------------
// shopCard — small card used in listing grids
// ------------------------------------------------------------

function shopCard(shop, config, stSlug) {
  const { slugify } = require('../util');
  const shopSlug = shop.slug || slugify((shop.name || '') + '-' + (shop.city || ''));
  const citySlug = slugify(shop.city || 'Other') || 'other';
  const href = `/shops/${stSlug}/${citySlug}/${shopSlug}/`;

  const niche = config.niche || {};
  const services = shop.services || [];
  const tags = services
    .filter(svc => niche.serviceBadge && niche.serviceBadge[svc])
    .slice(0, 4)
    .map(svc => {
      const cls = /(^|-)cgc(-|$)/.test(svc) ? 'tag cgc' : 'tag';
      return `<span class="${cls}">${escHtml(niche.serviceBadge[svc])}</span>`;
    }).join('');

  const verifiedBadge = shop.owner_verified
    ? `<div class="badge-verified"><span class="star">★</span>Verified listing</div>`
    : '';
  const featuredRibbon = shop.featured
    ? `<div class="featured-ribbon"><span class="star">★</span>Featured</div>`
    : '';

  const cls = 'shop-card' + (shop.featured ? ' is-featured' : '');
  return `<a href="${escAttr(href)}" class="${cls}">
  ${featuredRibbon}
  <h3>${escHtml(shop.name)}</h3>
  <div class="loc">${escHtml(shop.city || '')}, ${escHtml(shop.state || '')}</div>
  ${verifiedBadge}
  <div class="tags">${tags}</div>
</a>`;
}

// ------------------------------------------------------------
// eventCard — small card used on event listing pages
// ------------------------------------------------------------

function eventCard(ev) {
  if (!ev.start_date) return '';
  const d = new Date(ev.start_date + 'T00:00:00');
  const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const day = d.getDate();
  return `<a href="${escAttr(ev.website || '#')}" class="event-card" target="_blank" rel="noopener">
  <div class="date-block"><div class="mo">${month}</div><div class="day">${day}</div></div>
  <div class="event-body">
    <h3>${escHtml(ev.name)}</h3>
    <div class="meta">${escHtml(ev.city || '')}, ${escHtml(ev.state || '')}${ev.admission ? ' · ' + escHtml(ev.admission) : ''}</div>
  </div>
</a>`;
}

module.exports = { pageShell, header, footer, ctaBanner, cdnBand, shopCard, eventCard };
