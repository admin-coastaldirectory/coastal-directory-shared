// ============================================================
// templates/shop-page.js — per-shop detail page
// ============================================================
//
// Renders /shops/<state-slug>/<city-slug>/<shop-slug>/index.html
// using the canonical CSNM-style shell. Body structure:
//
//   .page-intro            breadcrumb, h1, featured/verified badges, lede
//   main.content           service tags, detail rows, about, FAQs,
//                          "other shops in <state>" grid, claim CTA
//
// Schemas emitted: LocalBusiness, FAQPage, BreadcrumbList.

const { escHtml, escAttr, slugify, titleCase, truncateTitle, countDataFields } = require('../util');
const { stateName } = require('../states');
const { pageShell, shopCard } = require('./shell');
const schemas = require('../schemas');
const descriptions = require('../descriptions');

function shopPage(shop, config, allStateShops) {
  const minFields = (config.thresholds && config.thresholds.minDataFieldsForShopPage) || 2;
  if (countDataFields(shop) < minFields) return null;

  const niche = config.niche || {};
  const sn = stateName(shop.state);
  const stSlug = slugify(sn);
  // Fallback to 'Other' must match generate.js so the canonical URL
  // agrees with the file path on disk. The trailing `|| 'other'` guards
  // against a whitespace/punctuation-only city slugifying to '' — which
  // would produce a broken /shops/<state>//<shop>/ double-slash URL.
  const citySlug = slugify(shop.city || 'Other') || 'other';
  const shopSlug = shop.slug || slugify((shop.name || '') + '-' + (shop.city || ''));
  const canonical = config.brand.fullUrl + '/shops/' + stSlug + '/' + citySlug + '/' + shopSlug + '/';

  const desc = descriptions.shopDescription(shop, config);
  const descShort = desc.slice(0, 155).replace(/\s+\S*$/, '');
  const faqs = descriptions.shopFAQ(shop, config);

  const details = [];
  if (shop.address) details.push(detailRow('Address', escHtml(shop.address)));
  details.push(detailRow('City', escHtml(shop.city) + ', ' + escHtml(shop.state)));
  if (shop.zip) details.push(detailRow('ZIP', escHtml(shop.zip)));
  if (shop.phone) details.push(detailRow('Phone', '<a href="tel:' + escAttr(shop.phone) + '">' + escHtml(shop.phone) + '</a>'));
  if (shop.website) {
    const cleanUrl = String(shop.website).replace(/^https?:\/\//, '').replace(/\/$/, '');
    details.push(detailRow('Website', '<a href="' + escAttr(shop.website) + '" target="_blank" rel="noopener">' + escHtml(cleanUrl) + '</a>'));
  }
  if (shop.hours) details.push(detailRow('Hours', escHtml(shop.hours)));
  const gMaps = shop.google_maps || shop.googleMaps;
  if (gMaps) details.push(detailRow('Directions', '<a href="' + escAttr(gMaps) + '" target="_blank" rel="noopener">Open in Google Maps</a>'));

  const tagsHtml = (shop.services || [])
    .filter(svc => niche.serviceBadge && niche.serviceBadge[svc])
    .map(svc => {
      const cls = /(^|-)cgc(-|$)/.test(svc) ? 'tag cgc' : 'tag';
      return '<span class="' + cls + '">' + escHtml(niche.serviceBadge[svc]) + '</span>';
    }).join(' ');

  const faqHtml = faqs.length
    ? '<h2>Frequently asked questions about ' + escHtml(shop.name) + '</h2>\n'
      + faqs.map(f => '<h3>' + escHtml(f.q) + '</h3><p>' + escHtml(f.a) + '</p>').join('\n')
    : '';

  const nearby = (allStateShops || [])
    .filter(s => s.name !== shop.name && s.slug !== shop.slug)
    .slice(0, 4);

  const shopTypeLabel = niche.shopType || 'shop';
  const shopTypePluralLabel = niche.shopTypePluralCapitalized
    ? niche.shopTypePluralCapitalized.toLowerCase()
    : (shopTypeLabel + 's');
  const nearbyHtml = nearby.length
    ? '<h2>Other ' + shopTypePluralLabel + ' in ' + sn + '</h2>\n'
      + '<p>Looking for more local ' + shopTypePluralLabel + ' in ' + sn + '? Here are additional shops worth a visit:</p>\n'
      + '<div class="card-grid">' + nearby.map(s => shopCard(s, config, stSlug)).join('\n') + '</div>\n'
      + '<p style="margin-top:16px"><a href="/shops/' + stSlug + '/" class="btn outline">View all '
      + (allStateShops || []).length + ' ' + shopTypePluralLabel + ' in ' + sn + ' →</a></p>'
    : '';

  const verifiedBadge = shop.owner_verified
    ? '<div class="badge-verified" style="margin-bottom:14px"><span class="star">★</span>Verified listing</div>'
    : '';
  const featuredBadge = shop.featured
    ? '<div class="featured-badge-hero"><span class="star">★</span>Featured shop</div>'
    : '';

  // Only render the Claim CTA for shops that haven't been claimed.
  // Already-verified shops show the verified badge in the page-intro
  // (see verifiedBadge above) and shouldn't invite a duplicate claim.
  const claimCtaHtml = shop.owner_verified
    ? ''
    : '<aside class="claim-cta">\n'
      + ' <strong>Is this your shop? Claim it free to update hours, photos, and services.</strong>\n'
      + ' <a href="/claim/?shop=' + escAttr(shopSlug) + '" class="btn outline">Claim free →</a>\n'
      + '</aside>';

  const body = ''
    + '<section class="page-intro">\n'
    + ' <div class="wrap">\n'
    + '  <nav class="breadcrumb" aria-label="Breadcrumb">\n'
    + '   <a href="/shops/">Shops</a> / <a href="/shops/' + stSlug + '/">' + sn + '</a> / <a href="/shops/' + stSlug + '/' + citySlug + '/">' + escHtml(shop.city) + '</a>\n'
    + '  </nav>\n'
    + '  <h1>' + escHtml(shop.name) + '</h1>\n'
    + '  ' + featuredBadge + verifiedBadge + '\n'
    + '  <p class="lede">' + escHtml(shop.city) + ', ' + sn + (shop.country === 'CA' ? ' (Canada)' : '') + '</p>\n'
    + ' </div>\n'
    + '</section>\n'
    + '<main class="content">\n'
    + (tagsHtml ? ' <div class="tags" style="margin-bottom:20px">' + tagsHtml + '</div>\n' : '')
    + ' ' + details.join('\n ') + '\n'
    + ' ' + claimCtaHtml + '\n'
    + ' <div style="margin-top:24px">\n'
    + '  <h2>About ' + escHtml(shop.name) + '</h2>\n'
    + '  <p>' + desc + '</p>\n'
    + ' </div>\n'
    + (shop.website ? ' <p><a href="' + escAttr(shop.website) + '" class="btn" target="_blank" rel="noopener">Visit website →</a></p>\n' : '')
    + ' ' + faqHtml + '\n'
    + ' ' + nearbyHtml + '\n'
    + '</main>';

  const localBusinessSchema = schemas.localBusiness(shop, {
    siteUrl: config.brand.fullUrl,
    canonical: canonical,
    descriptionShort: desc.slice(0, 300),
  });
  const breadcrumbSchema = schemas.breadcrumbList([
    { name: 'Home', url: config.brand.fullUrl + '/' },
    { name: 'Shops', url: config.brand.fullUrl + '/shops/' },
    { name: sn, url: config.brand.fullUrl + '/shops/' + stSlug + '/' },
    { name: shop.city, url: config.brand.fullUrl + '/shops/' + stSlug + '/' + citySlug + '/' },
    { name: shop.name, url: canonical },
  ]);
  const faqSchema = faqs.length ? schemas.faqPage(faqs) : null;

  const shopTypeTitle = titleCase(niche.shopType || 'Shop');
  const title = truncateTitle(shop.name + ' — ' + shopTypeTitle + ' in ' + shop.city + ', ' + sn);

  const html = pageShell({
    config: config,
    title: title,
    description: descShort,
    canonical: canonical,
    schema: [localBusinessSchema, breadcrumbSchema, faqSchema].filter(Boolean),
    body: body,
  });

  return { slug: shopSlug, html: html, canonical: canonical };
}

function detailRow(label, value) {
  return '<div class="detail-row"><span class="label">' + escHtml(label) + '</span><span class="value">' + value + '</span></div>';
}

module.exports = { shopPage };
