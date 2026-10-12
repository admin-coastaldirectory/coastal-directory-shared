// ============================================================
// templates/shop-page.js — per-shop detail page
// ============================================================
//
// Renders /shops/<state-slug>/<city-slug>/<shop-slug>/index.html
// using the canonical CSNM-style shell. Body structure:
//
//   .page-intro            breadcrumb, h1, featured/verified badges, lede
//   main.content           service tags, detail rows (hours as a table), about,
//                          "at a glance" facts, upcoming shows, FAQs,
//                          nearest-shops grid (by distance), claim CTA
//
// Schemas emitted: LocalBusiness, FAQPage, BreadcrumbList.

const { escHtml, escAttr, slugify, titleCase, buildShopTitle, clampText, countDataFields, isIndexable, marketplaceLinks } = require('../util');
const { stateName } = require('../states');
const { pageShell, shopCard } = require('./shell');
const schemas = require('../schemas');
const descriptions = require('../descriptions');
const insights = require('../shop-insights');

function shopPage(shop, config, allStateShops, stateEvents) {
  const minFields = (config.thresholds && config.thresholds.minDataFieldsForShopPage) || 2;
  if (countDataFields(shop) < minFields) return null;

  // Tier A shops (see isIndexable) are indexed and sitemapped; Tier B shops
  // still get a full page (linked from their city page, direct/badge traffic
  // works) but carry noindex,follow and are excluded from the sitemap.
  const indexable = isIndexable(shop);

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
  let descShort = descriptions.shopMetaDescription(shop, config);
  const faqs = descriptions.shopFAQ(shop, config);

  // Per-shop facts (added 2026-10-12, see lib/shop-insights.js): real
  // distances to the nearest shops, parsed hours, city rating rank, upcoming
  // shows, socials and category codes. These make each page different
  // from its neighbours instead of the same template text.
  const shopTypeWord = niche.shopType || 'shop';
  const pluralWord = niche.shopTypePluralCapitalized
    ? niche.shopTypePluralCapitalized.toLowerCase() : shopTypeWord + 's';
  const nearest = insights.nearestShops(shop, allStateShops, 4);
  const hourRows = insights.parseHours(shop.hours);
  const hourFacts = insights.hourFacts(hourRows);
  const rank = insights.cityRank(shop, allStateShops);
  const shows = insights.upcomingShows(shop, stateEvents, 2);
  // Cards stores what a shop carries as category codes (sports, pokemon,
  // magic, yugioh, tcg…). Turn known codes into labels via serviceBadge.
  const categoryCodes = (Array.isArray(shop.categories) ? shop.categories : [])
    .map(c => String(c).trim()).filter(c => niche.serviceBadge && niche.serviceBadge[c]);
  const carries = categoryCodes.map(c => niche.serviceBadge[c]);
  const socials = [['Instagram', shop.instagram_url], ['Facebook', shop.facebook_url],
    ['YouTube', shop.youtube_url], ['TikTok', shop.tiktok_url], ['X', shop.twitter_url]]
    .filter(([, u]) => u && /^https?:\/\//i.test(String(u).trim()));

  // Meta description built from this shop's own facts (street, rating) so
  // search snippets differ between shops. Falls back to the template text.
  {
    const score = Number(shop.totalScore != null ? shop.totalScore : shop.total_score);
    const reviews = Number(shop.reviewsCount != null ? shop.reviewsCount : shop.reviews_count);
    const street = shop.address ? String(shop.address).split(',')[0].trim() : '';
    const bits = [];
    bits.push(shop.name + (street ? ' at ' + street : '') + ' in ' + shop.city + ', ' + (shop.state || '') + '.');
    if (score > 0 && reviews > 0) bits.push(score.toFixed(1) + ' stars from ' + reviews.toLocaleString('en-US') + ' Google reviews.');
    if (rank) bits.push('#' + rank.rank + ' of ' + rank.total + ' rated in ' + shop.city + '.');
    bits.push('Hours, phone, directions and nearby ' + pluralWord + '.');
    let m = bits.join(' ');
    if (m.length > 160) m = bits.filter((b, i) => i !== 2).join(' ');
    if (m.length <= 160 && (street || score > 0)) descShort = m;
  }

  // Extra FAQ entries built from this shop's own data (visible + FAQPage schema).
  if (hourRows) {
    faqs.push({
      q: `When is ${shop.name} open?`,
      a: `${shop.name}'s listed hours are: ${hourRows.map(r => r.day + ' ' + r.text).join('; ')}. Hours can change around holidays, so call ahead if you're making a special trip.`,
    });
  }
  const nearWithMiles = nearest.filter(x => x.miles != null);
  if (nearWithMiles.length >= 2) {
    faqs.push({
      q: `What other ${pluralWord} are near ${shop.name}?`,
      a: `The closest are ${nearWithMiles.slice(0, 3).map(x => `${x.shop.name} in ${x.shop.city} (${insights.fmtMiles(x.miles)})`).join(', ')}.`,
    });
  }

  const details = [];
  if (shop.address) details.push(detailRow('Address', escHtml(shop.address)));
  details.push(detailRow('City', escHtml(shop.city) + ', ' + escHtml(shop.state)));
  if (shop.zip) details.push(detailRow('ZIP', escHtml(shop.zip)));
  if (shop.phone) details.push(detailRow('Phone', '<a href="tel:' + escAttr(shop.phone) + '">' + escHtml(shop.phone) + '</a>'));
  if (shop.website) {
    const cleanUrl = String(shop.website).replace(/^https?:\/\//, '').replace(/\/$/, '');
    details.push(detailRow('Website', '<a href="' + escAttr(shop.website) + '" target="_blank" rel="noopener">' + escHtml(cleanUrl) + '</a>'));
  }
  if (hourRows) {
    details.push(detailRow('Hours', '<table class="hours-table" style="border-collapse:collapse;font-size:14px">'
      + hourRows.map(r => '<tr><td style="padding:1px 14px 1px 0;color:#555">' + escHtml(r.day) + '</td><td style="padding:1px 0">' + escHtml(r.text) + '</td></tr>').join('')
      + '</table>'));
  } else if (shop.hours) details.push(detailRow('Hours', escHtml(shop.hours)));
  const gMaps = shop.google_maps || shop.googleMaps;
  if (gMaps) details.push(detailRow('Directions', '<a href="' + escAttr(gMaps) + '" target="_blank" rel="noopener">Open in Google Maps</a>'));

  const tagCodes = (shop.services && shop.services.length) ? shop.services : categoryCodes;
  const tagsHtml = tagCodes
    .filter(svc => niche.serviceBadge && niche.serviceBadge[svc])
    .map(svc => {
      const cls = /(^|-)cgc(-|$)/.test(svc) ? 'tag cgc' : 'tag';
      return '<span class="' + cls + '">' + escHtml(niche.serviceBadge[svc]) + '</span>';
    }).join(' ');

  // TCG cross-sell badge + card-shop cross-link. Renders only for shops
  // flagged sells_tcg in the data (comics only — inert on other sites where
  // the column is absent). The "Where to play TCG" link renders only when the
  // shop's city has a live LocalCardShopsNearMe guide (niche.tcgLcsCities),
  // so it never points at a 404. Crawlable server-rendered HTML for SEO.
  let tcgHtml = '';
  if (shop.sells_tcg) {
    const accent = (config.colors && config.colors.accent) || '#c03030';
    const tcgCities = niche.tcgLcsCities || [];
    const tcgBadge = '<span style="display:inline-flex;align-items:center;background:' + accent + ';color:#fff;padding:5px 12px;border-radius:12px;font-size:12px;font-weight:600;line-height:1;letter-spacing:.2px">Sells Pok&eacute;mon &middot; Magic &middot; Yu-Gi-Oh</span>';
    const tcgLink = (tcgCities.indexOf(citySlug) !== -1)
      ? '<a href="https://localcardshopsnearme.com/blog/best-card-shops-in-' + citySlug + '/?utm_source=comicstoresnearme&amp;utm_medium=shop-badge&amp;utm_campaign=tcg-crosslink" style="font-size:13px;font-weight:600;color:' + accent + ';text-decoration:none;border-bottom:1px solid #e3b4b4">Where to play TCG in ' + escHtml(shop.city) + ' &rarr;</a>'
      : '';
    tcgHtml = ' <div class="tcg-crosslink" style="margin:0 0 20px;display:flex;flex-wrap:wrap;align-items:center;gap:12px">' + tcgBadge + tcgLink + '</div>\n';
  }

  // Comics cross-sell badge + comic-shop cross-link. Renders only for shops
  // flagged sells_comics in the data (cards site only — inert elsewhere). The
  // "Local comic shops" link renders only when the city has a live
  // ComicStoresNearMe guide (niche.comicsCrossCities), so it never points at a 404.
  let comicsHtml = '';
  if (shop.sells_comics) {
    const cAccent = (config.colors && config.colors.accent) || '#1a5276';
    const comicsCities = niche.comicsCrossCities || [];
    const comicsBadge = '<span style="display:inline-flex;align-items:center;background:' + cAccent + ';color:#fff;padding:5px 12px;border-radius:12px;font-size:12px;font-weight:600;line-height:1;letter-spacing:.2px">Sells Comics &middot; Graphic Novels &middot; Manga</span>';
    const comicsLink = (comicsCities.indexOf(citySlug) !== -1)
      ? '<a href="https://comicstoresnearme.com/blog/best-comic-shops-in-' + citySlug + '/?utm_source=localcardshopsnearme&amp;utm_medium=shop-badge&amp;utm_campaign=comics-crosslink" style="font-size:13px;font-weight:600;color:' + cAccent + ';text-decoration:none;border-bottom:1px solid #b8cfe0">Local comic shops in ' + escHtml(shop.city) + ' &rarr;</a>'
      : '';
    comicsHtml = ' <div class="comics-crosslink" style="margin:0 0 20px;display:flex;flex-wrap:wrap;align-items:center;gap:12px">' + comicsBadge + comicsLink + '</div>\n';
  }

  const faqHtml = faqs.length
    ? '<h2>Frequently asked questions about ' + escHtml(shop.name) + '</h2>\n'
      + faqs.map(f => '<h3>' + escHtml(f.q) + '</h3><p>' + escHtml(f.a) + '</p>').join('\n')
    : '';

  // Closest shops by real distance (was: the first four shops in the state,
  // alphabetically — identical on every shop page in the state).
  const nearby = nearest.map(x => x.shop);

  const shopTypeLabel = niche.shopType || 'shop';
  const shopTypePluralLabel = niche.shopTypePluralCapitalized
    ? niche.shopTypePluralCapitalized.toLowerCase()
    : (shopTypeLabel + 's');
  const nearbyHtml = nearby.length
    ? '<h2>' + escHtml(niche.shopTypePluralCapitalized || 'Shops') + ' near ' + escHtml(shop.name) + '</h2>\n'
      + '<p>The closest other ' + shopTypePluralLabel + ' to ' + escHtml(shop.name) + ', by distance:</p>\n'
      + '<div class="card-grid">' + nearest.map(x => {
          const card = shopCard(x.shop, config, stSlug);
          return x.miles == null ? card
            : card.replace(/(<div class="loc">[^<]*)(<\/div>)/, '$1 &middot; ' + escHtml(insights.fmtMiles(x.miles)) + ' away$2');
        }).join('\n') + '</div>\n'
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

  // eBay store / Whatnot channel — a paid Featured Shop benefit.
  // marketplaceLinks() returns null unless the shop is featured AND has at
  // least one valid https:// link on the expected host, so a non-featured shop
  // with the columns populated renders nothing at all — no placeholder, no
  // "coming soon". Both links carry rel="nofollow sponsored" because they are
  // part of a paid placement; the website backlink further down stays dofollow,
  // which is the thing featured shops are actually paying for.
  const marketplace = marketplaceLinks(shop);
  let marketplaceHtml = '';
  if (marketplace) {
    const mpLinks = [];
    if (marketplace.ebay) {
      mpLinks.push('<a href="' + escAttr(marketplace.ebay) + '" class="btn outline" target="_blank" rel="nofollow sponsored noopener">eBay store &rarr;</a>');
    }
    if (marketplace.whatnot) {
      mpLinks.push('<a href="' + escAttr(marketplace.whatnot) + '" class="btn outline" target="_blank" rel="nofollow sponsored noopener">Whatnot channel &rarr;</a>');
    }
    marketplaceHtml = '<div class="shop-online-links">'
      + '<h2>Shop ' + escHtml(shop.name) + ' online</h2>'
      + '<p>' + escHtml(shop.name) + ' also sells through these marketplaces:</p>'
      + '<div class="links">' + mpLinks.join('') + '</div>'
      + '</div>';
  }

  // Featured-badge offer — ONLY for Tier A (indexable) shops, so a badge
  // backlink never points at a noindex page. Deep-links to /featured/ with the
  // shop's own path so the generated embed links back to this exact page.
  const badgeCtaHtml = indexable
    ? '<aside class="claim-cta" style="margin-top:16px">\n'
      + ' <strong>Own this shop? Add a free ' + escHtml(config.brand.name) + ' badge to your website — it links customers straight back to this page.</strong>\n'
      + ' <a href="/featured/?u=' + escAttr(encodeURIComponent('/shops/' + stSlug + '/' + citySlug + '/' + shopSlug + '/')) + '" class="btn outline">Get your free badge →</a>\n'
      + '</aside>'
    : '';


  const facts = [];
  if (rank) facts.push('Ranked #' + rank.rank + ' of ' + rank.total + ' rated ' + escHtml(pluralWord) + ' in ' + escHtml(shop.city) + ' by Google rating, weighted by number of reviews.');
  if (hourFacts.length) facts.push(escHtml(hourFacts.join(' · ')) + '.');
  if (nearWithMiles.length) {
    const n0 = nearWithMiles[0];
    facts.push('The nearest other ' + escHtml(shopTypeWord) + ' is ' + escHtml(n0.shop.name) + ' in ' + escHtml(n0.shop.city) + ', ' + escHtml(insights.fmtMiles(n0.miles)) + ' away.');
  }
  if (carries.length && !(shop.services || []).length) facts.push('Carries: ' + escHtml(carries.join(', ')) + '.');
  if (socials.length) facts.push('Find ' + escHtml(shop.name) + ' on ' + socials.map(([label, u]) => '<a href="' + escAttr(String(u).trim()) + '" target="_blank" rel="noopener nofollow">' + label + '</a>').join(', ') + '.');
  const glanceHtml = facts.length >= 2
    ? '<div class="shop-glance" style="margin-top:24px"><h2>' + escHtml(shop.name) + ' at a glance</h2><ul>' + facts.map(f => '<li>' + f + '</li>').join('') + '</ul></div>'
    : '';
  const showsHtml = shows.length
    ? '<div class="shop-shows" style="margin-top:24px"><h2>' + escHtml(niche.eventNounCapitalized || 'Events') + ' coming up in ' + escHtml(sn) + '</h2><ul>'
      + shows.map(e => {
          const when = e.end_date && e.end_date !== e.start_date ? insights.fmtDate(e.start_date) + ' &ndash; ' + insights.fmtDate(e.end_date) : insights.fmtDate(e.start_date);
          return '<li><strong>' + escHtml(e.name) + '</strong> &mdash; ' + when + (e.city ? ', ' + escHtml(e.city) : '') + '</li>';
        }).join('')
      + '</ul><p><a href="/events/' + escAttr(stSlug) + '/">All upcoming ' + escHtml(niche.eventNoun || 'events') + ' in ' + escHtml(sn) + ' &rarr;</a></p></div>'
    : '';

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
    + tcgHtml
    + comicsHtml
    + ' ' + details.join('\n ') + '\n'
    + (marketplaceHtml ? ' ' + marketplaceHtml + '\n' : '')
    + ' ' + claimCtaHtml + '\n'
    + ' ' + badgeCtaHtml + '\n'
    + ' <div style="margin-top:24px">\n'
    + '  <h2>About ' + escHtml(shop.name) + '</h2>\n'
    + '  <p>' + escHtml(desc) + '</p>\n'
    + ' </div>\n'
    + (shop.website ? ' <p><a href="' + escAttr(shop.website) + '" class="btn" target="_blank" rel="noopener">Visit website →</a></p>\n' : '')
    + (glanceHtml ? ' ' + glanceHtml + '\n' : '')
    + (showsHtml ? ' ' + showsHtml + '\n' : '')
    + ' ' + faqHtml + '\n'
    + ' ' + nearbyHtml + '\n'
    + '</main>';

  const localBusinessSchema = schemas.localBusiness(shop, {
    siteUrl: config.brand.fullUrl,
    canonical: canonical,
    descriptionShort: clampText(desc, 300),
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
  const title = buildShopTitle(shop.name, shopTypeTitle, shop.city, sn);

  const html = pageShell({
    config: config,
    title: title,
    description: descShort,
    canonical: canonical,
    schema: [localBusinessSchema, breadcrumbSchema, faqSchema].filter(Boolean),
    body: body,
    robots: indexable ? 'index, follow' : 'noindex, follow',
    showCdn: false,
  });

  return { slug: shopSlug, html: html, canonical: canonical, indexable: indexable };
}

function detailRow(label, value) {
  return '<div class="detail-row"><span class="label">' + escHtml(label) + '</span><span class="value">' + value + '</span></div>';
}

module.exports = { shopPage };
