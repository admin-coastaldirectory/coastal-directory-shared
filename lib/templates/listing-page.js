// ============================================================
// templates/listing-page.js — state and city listing pages
// ============================================================
//
// State pages and city pages are both wide-format listing pages
// (max-width 1100 via .content-wide). Layouts:
//
//   STATE page
//     .page-intro            breadcrumb, eyebrow, h1, lede
//     main.content.content-wide
//       intro paragraphs
//       "Browse <state> shops by city"  card-grid of city-cards
//       "All <shop>s in <state>"        card-grid of shop-cards
//       optional events list
//       "Find shops in nearby states"   neighbor links
//
//   CITY page
//     .page-intro            breadcrumb, eyebrow, h1, lede
//     main.content.content-wide
//       intro paragraphs
//       "All <n> <shop>s in <city>"     card-grid
//       outline btn back to state page
//
// Schemas: ItemList, BreadcrumbList. Event state pages also emit
// per-event Event schema.

const { escHtml, escAttr, slugify, titleCase, truncateTitle } = require('../util');
const { stateName, neighborsOf } = require('../states');
const { pageShell, shopCard, eventCard } = require('./shell');
const schemas = require('../schemas');
const descriptions = require('../descriptions');

// ============================================================
// STATE PAGE
// ============================================================

function statePage(stateCode, shops, events, config) {
  const niche = config.niche || {};
  const sn = stateName(stateCode);
  const stSlug = slugify(sn);
  const canonical = `${config.brand.fullUrl}/shops/${stSlug}/`;

  // Sort: featured first, then verified, then alphabetical.
  shops = shops.slice().sort((a, b) => {
    if (!!a.featured !== !!b.featured) return b.featured ? 1 : -1;
    if (!!a.owner_verified !== !!b.owner_verified) return b.owner_verified ? 1 : -1;
    return (a.name || '').localeCompare(b.name || '');
  });

  const shopTypeLabel = niche.shopType || 'shop';
  const shopTypePlural = niche.shopTypePluralCapitalized
    ? niche.shopTypePluralCapitalized.toLowerCase()
    : (shopTypeLabel + 's');
  const shopTypePluralCap = niche.shopTypePluralCapitalized
    || titleCase(shopTypeLabel + 's');

  // Group by city to build the city-link grid.
  const byCity = {};
  for (const s of shops) {
    const c = s.city || 'Other';
    if (!byCity[c]) byCity[c] = [];
    byCity[c].push(s);
  }

  const minShopsForCityPage = (config.thresholds && config.thresholds.minShopsForCityPage) || 2;
  const cityLinks = Object.keys(byCity).sort()
    .filter(c => byCity[c].length >= minShopsForCityPage)
    .map(c => {
      const slug = slugify(c) || 'other';
      return `<a href="/shops/${stSlug}/${slug}/" class="shop-card city-card">
  <h3>${escHtml(c)}</h3>
  <div class="loc">${byCity[c].length} ${shopTypePlural}</div>
</a>`;
    }).join('\n');

  // State events block.
  const stateEvents = (events || []).filter(e => e.state === stateCode);
  const evHtml = stateEvents.length
    ? `<h2>Upcoming events in ${sn}</h2>
<div class="card-grid" style="grid-template-columns:1fr">${stateEvents.slice(0, 10).map(eventCard).join('\n')}</div>`
    : '';

  // Neighboring-states block (topical authority).
  const neighborCodes = neighborsOf(stateCode);
  const neighborHtml = neighborCodes.length
    ? `<h2>Find ${shopTypePlural} in nearby states</h2>
<p>Looking beyond ${sn}? Browse ${shopTypePlural} in neighboring states and provinces:</p>
<div class="neighbors">${neighborCodes.map(c =>
  `<a href="/shops/${slugify(stateName(c))}/" class="neighbor-link">${escHtml(stateName(c))}</a>`
).join('')}</div>`
    : '';

  const desc = descriptions.stateMetaDescription(stateCode, shops, config);
  const introHtml = descriptions.stateIntroHtml(stateCode, shops, config);

  const faqs = descriptions.stateFAQ(stateCode, shops, config);
  const faqHtml = faqs.length
    ? `<h2>Frequently asked questions about ${shopTypePlural} in ${sn}</h2>\n`
      + faqs.map(f => `<h3>${escHtml(f.q)}</h3><p>${escHtml(f.a)}</p>`).join('\n')
    : '';
  const faqSchema = faqs.length ? schemas.faqPage(faqs) : null;

  const body = `
<section class="page-intro">
 <div class="wrap">
  <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/shops/">Shops</a> / ${sn}</nav>
  <div class="eyebrow">${shops.length} ${shopTypePlural} in ${sn}</div>
  <h1>${shopTypePluralCap} in ${sn}</h1>
  <p class="lede">${escHtml(desc)}</p>
 </div>
</section>
<main class="content content-wide">
 ${introHtml}
 ${cityLinks ? `<h2>Browse ${sn} ${shopTypePlural} by city</h2>\n<div class="card-grid">${cityLinks}</div>` : ''}
 <h2>All ${shopTypePlural} in ${sn}</h2>
 <div class="card-grid">${shops.map(s => shopCard(s, config, stSlug)).join('\n')}</div>
 ${evHtml}
 ${faqHtml}
 ${neighborHtml}
</main>`;

  const itemListSchema = schemas.itemList(
    `${shopTypePluralCap} in ${sn}`,
    desc,
    shops.slice(0, 20).map(s => {
      const cs = slugify(s.city || 'Other') || 'other';
      const ss = s.slug || slugify((s.name || '') + '-' + (s.city || ''));
      return `${config.brand.fullUrl}/shops/${stSlug}/${cs}/${ss}/`;
    })
  );
  const breadcrumbSchema = schemas.breadcrumbList([
    { name: 'Home', url: config.brand.fullUrl + '/' },
    { name: 'Shops', url: config.brand.fullUrl + '/shops/' },
    { name: sn, url: canonical },
  ]);

  const title = truncateTitle(`${shopTypePluralCap} in ${sn} — ${shops.length} Verified`);

  const html = pageShell({
    config,
    title,
    description: desc,
    canonical,
    schema: [itemListSchema, breadcrumbSchema, faqSchema],
    body,
  });

  return { html, canonical };
}

// ============================================================
// CITY PAGE
// ============================================================

function cityPage(city, stateCode, shops, config, siblingCities) {
  const niche = config.niche || {};
  const sn = stateName(stateCode);
  const stSlug = slugify(sn);
  const citySlug = slugify(city) || 'other';
  const canonical = `${config.brand.fullUrl}/shops/${stSlug}/${citySlug}/`;

  shops = shops.slice().sort((a, b) => {
    if (!!a.featured !== !!b.featured) return b.featured ? 1 : -1;
    if (!!a.owner_verified !== !!b.owner_verified) return b.owner_verified ? 1 : -1;
    return (a.name || '').localeCompare(b.name || '');
  });

  const shopTypeLabel = niche.shopType || 'shop';
  const shopTypePlural = niche.shopTypePluralCapitalized
    ? niche.shopTypePluralCapitalized.toLowerCase()
    : (shopTypeLabel + 's');
  const shopTypePluralCap = niche.shopTypePluralCapitalized
    || titleCase(shopTypeLabel + 's');

  const desc = descriptions.cityMetaDescription(city, stateCode, shops, config);
  const introHtml = descriptions.cityIntroHtml(city, stateCode, shops, config);

  const faqs = descriptions.cityFAQ(city, stateCode, shops, config);
  const faqHtml = faqs.length
    ? `<h2>Frequently asked questions about ${shopTypePlural} in ${escHtml(city)}</h2>\n`
      + faqs.map(f => `<h3>${escHtml(f.q)}</h3><p>${escHtml(f.a)}</p>`).join('\n')
    : '';
  const faqSchema = faqs.length ? schemas.faqPage(faqs) : null;

  const otherCities = (siblingCities || [])
    .filter(c => c.slug !== citySlug)
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);
  const nearbyCitiesHtml = otherCities.length
    ? `<h2>${shopTypePluralCap} in other ${sn} cities</h2>\n`
      + `<p>Browse ${shopTypePlural} in other cities and towns across ${sn}:</p>\n`
      + `<div class="neighbors">`
      + otherCities.map(c => `<a href="/shops/${stSlug}/${c.slug}/" class="neighbor-link">${escHtml(c.name)}</a>`).join('')
      + `</div>`
    : '';

  const body = `
<section class="page-intro">
 <div class="wrap">
  <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/shops/">Shops</a> / <a href="/shops/${stSlug}/">${sn}</a> / ${escHtml(city)}</nav>
  <div class="eyebrow">${shops.length} ${shopTypePlural}</div>
  <h1>${shopTypePluralCap} in ${escHtml(city)}, ${sn}</h1>
  <p class="lede">${escHtml(desc)}</p>
 </div>
</section>
<main class="content content-wide">
 ${introHtml}
 <h2>All ${shops.length} ${shopTypePlural} in ${escHtml(city)}</h2>
 <div class="card-grid">${shops.map(s => shopCard(s, config, stSlug)).join('\n')}</div>
 <p style="margin-top:30px"><a href="/shops/${stSlug}/" class="btn outline">View all ${shopTypePlural} in ${sn} →</a></p>
 ${nearbyCitiesHtml}
 ${faqHtml}
</main>`;

  const itemListSchema = schemas.itemList(
    `${shopTypePluralCap} in ${city}, ${sn}`,
    desc,
    shops.map(s => {
      const ss = s.slug || slugify((s.name || '') + '-' + (s.city || ''));
      return `${config.brand.fullUrl}/shops/${stSlug}/${citySlug}/${ss}/`;
    })
  );
  const breadcrumbSchema = schemas.breadcrumbList([
    { name: 'Home', url: config.brand.fullUrl + '/' },
    { name: 'Shops', url: config.brand.fullUrl + '/shops/' },
    { name: sn, url: `${config.brand.fullUrl}/shops/${stSlug}/` },
    { name: city, url: canonical },
  ]);

  const title = truncateTitle(`${shopTypePluralCap} in ${city}, ${sn} — ${shops.length} Shops`);

  const html = pageShell({
    config,
    title,
    description: desc,
    canonical,
    schema: [itemListSchema, breadcrumbSchema, faqSchema],
    body,
  });

  return { html, canonical };
}

// ============================================================
// EVENT-STATE PAGE
// ============================================================

function eventStatePage(stateCode, events, config) {
  const niche = config.niche || {};
  const sn = stateName(stateCode);
  const stSlug = slugify(sn);
  const canonical = `${config.brand.fullUrl}/events/${stSlug}/`;
  const eventNoun = niche.eventNoun || 'shows and events';
  const eventNounCap = niche.eventNounCapitalized || 'Events';
  const desc = `${events.length} upcoming ${eventNoun} in ${sn}.`;

  const body = `
<section class="page-intro">
 <div class="wrap">
  <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/events/">Events</a> / ${sn}</nav>
  <div class="eyebrow">${events.length} events</div>
  <h1>${eventNounCap} in ${sn}</h1>
  <p class="lede">${escHtml(desc)}</p>
 </div>
</section>
<main class="content">
 <div class="card-grid" style="grid-template-columns:1fr">${events.map(eventCard).join('\n')}</div>
 <p style="text-align:center;margin-top:24px"><a href="/events/" class="btn">View all events →</a></p>
</main>`;

  const eventSchemas = events.map(e => schemas.event(e, {
    stateNameStr: sn,
    defaultDescription: `${e.name} — a ${niche.shopType || 'shop'}-related event in ${e.city || sn}, ${sn}.`,
  }));
  const breadcrumbSchema = schemas.breadcrumbList([
    { name: 'Home', url: config.brand.fullUrl + '/' },
    { name: 'Events', url: config.brand.fullUrl + '/events/' },
    { name: sn, url: canonical },
  ]);

  const title = truncateTitle(`${eventNounCap} in ${sn} — ${events.length} Upcoming`);

  const html = pageShell({
    config,
    title,
    description: desc,
    canonical,
    schema: [...eventSchemas, breadcrumbSchema],
    body,
  });

  return { html, canonical };
}

module.exports = { statePage, cityPage, eventStatePage };
