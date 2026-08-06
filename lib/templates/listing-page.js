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
  // `f.a` is pre-escaped HTML; `f.aText` is the plain text used for the schema.
  const faqHtml = faqs.length
    ? `<h2>Frequently asked questions about ${shopTypePlural} in ${sn}</h2>\n`
      + faqs.map(f => `<h3>${escHtml(f.q)}</h3><p>${f.a}</p>`).join('\n')
    : '';
  const faqSchema = faqs.length
    ? schemas.faqPage(faqs.map(f => ({ q: f.q, a: f.aText })))
    : null;

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
  // `f.a` is pre-escaped HTML (with an inline link); `f.aText` is plain text for the schema.
  const faqHtml = faqs.length
    ? `<h2>Frequently asked questions about ${shopTypePlural} in ${escHtml(city)}</h2>\n`
      + faqs.map(f => `<h3>${escHtml(f.q)}</h3><p>${f.a}</p>`).join('\n')
    : '';
  const faqSchema = faqs.length
    ? schemas.faqPage(faqs.map(f => ({ q: f.q, a: f.aText })))
    : null;

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

  // Tier 3 — selling / appraisal intent section (uses real directory counts).
  // Copy is niche-driven via config.niche.sell; defaults reproduce the original coin wording.
  const sell = niche.sell || {};
  const sellNoun = sell.noun || 'coins';
  const sellItems = sell.items || 'coins, paper currency, and entire collections';
  const sellAdvice = sell.advice || 'and never clean a coin beforehand, since cleaning lowers its value';
  const sellShopArticle = niche.shopTypeArticle || 'a';
  const buyers = shops.filter(s => (s.services || []).includes('buy-sell')).length;
  const appraisers = shops.filter(s => (s.services || []).includes('appraisals')).length;
  const sellLine = buyers
    ? `${buyers} of the ${shops.length} ${shopTypePlural} listed here buy ${sellItems}`
    : `Many ${shopTypePlural} in ${escHtml(city)} buy ${sellItems}`;
  const apprLine = appraisers ? `, and ${appraisers} offer in-person appraisals` : '';
  const sellAppraiseHtml =
    `<h2>Selling or appraising ${sellNoun} in ${escHtml(city)}?</h2>\n`
    + `<p>${sellShopArticle.charAt(0).toUpperCase()}${sellShopArticle.slice(1)} ${shopTypeLabel} isn't only for buying. ${sellLine}${apprLine}. `
    + `If you're thinking of selling, it's worth getting an appraisal first so you know what your ${sellNoun} are really worth — ${sellAdvice}. `
    + `Use the <strong>Buy/sell</strong> and <strong>Appraisals</strong> tags on the listings above to find the right shop.</p>`;

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
 ${sellAppraiseHtml}
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

function eventStatePage(stateCode, events, config, extras = {}) {
  const niche = config.niche || {};
  const sn = stateName(stateCode);
  const stSlug = slugify(sn);
  const canonical = `${config.brand.fullUrl}/events/${stSlug}/`;
  const eventNoun = niche.eventNoun || 'shows and events';
  const eventNounCap = niche.eventNounCapitalized || 'Events';
  const desc = `${events.length} upcoming ${eventNoun} in ${sn}.`;

  const shopTypeLabel = niche.shopType || 'shop';
  const shopTypePlural = niche.shopTypePluralCapitalized
    ? niche.shopTypePluralCapitalized.toLowerCase()
    : (shopTypeLabel + 's');
  const shopTypePluralCap = niche.shopTypePluralCapitalized
    || titleCase(shopTypeLabel + 's');

  // Thin-state padding: a state with only one or two shows would otherwise be
  // a near-empty page. Give it real, related substance — the state's own shops
  // plus links onward to neighboring states' event pages.
  const padShops = extras.padShops || [];
  const padHtml = padShops.length
    ? `<h2>${shopTypePluralCap} in ${sn}</h2>
<p>Only ${events.length === 1 ? 'one show is' : events.length + ' shows are'} on the ${sn} calendar right now. `
      + `These local ${shopTypePlural} buy, sell, and trade year-round — many hear about shows before they're listed:</p>
<div class="card-grid">${padShops.map(s => shopCard(s, config, stSlug)).join('\n')}</div>
<p style="margin-top:18px"><a href="/shops/${stSlug}/" class="btn outline">View all ${shopTypePlural} in ${sn} →</a></p>`
    : '';

  // Onward links to neighboring states that actually have an events page —
  // internal linking + topical authority, and the practical answer for a
  // collector in a thin state who will happily drive across a border.
  const neighborEventStates = extras.neighborEventStates || [];
  const neighborHtml = neighborEventStates.length
    ? `<h2>${eventNounCap} in nearby states</h2>
<p>Collectors in ${sn} often travel for a bigger show floor. Browse ${eventNoun} nearby:</p>
<div class="neighbors">${neighborEventStates.map(n =>
  `<a href="/events/${n.slug}/" class="neighbor-link">${escHtml(n.name)}</a>`
).join('')}</div>`
    : '';

  // Appended only when non-empty, so a site that opts into none of this
  // renders byte-identical output to before the feature existed.
  const tail = [padHtml, neighborHtml].filter(Boolean).map(s => '\n ' + s).join('');

  const body = `
<section class="page-intro">
 <div class="wrap">
  <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/events/">Events</a> / ${sn}</nav>
  <div class="eyebrow">${events.length} ${events.length === 1 ? 'event' : 'events'}</div>
  <h1>${eventNounCap} in ${sn}</h1>
  <p class="lede">${escHtml(desc)}</p>
 </div>
</section>
<main class="content">
 <div class="card-grid" style="grid-template-columns:1fr">${events.map(eventCard).join('\n')}</div>
 <p style="text-align:center;margin-top:24px"><a href="/events/" class="btn">View all events →</a></p>${tail}
</main>`;

  // schemas.event() returns null for events with no usable location (neither
  // venue nor street address). Drop those before serializing — emitting null
  // into the JSON-LD array would invalidate the whole block.
  const eventSchemas = events.map(e => schemas.event(e, {
    stateNameStr: sn,
    defaultDescription: `${e.name} — a ${niche.shopType || 'shop'}-related event in ${e.city || sn}, ${sn}.`,
    siteName: config.brand.name,
    siteUrl: config.brand.fullUrl,
  })).filter(Boolean);
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

// ============================================================
// SHOPS INDEX HUB  (/shops/)
// ============================================================
//
// Server-rendered hub at /shops/ so crawlers (and AI crawlers that don't run
// JS) see a real directory: an answer-first intro with the live shop count,
// every state linked to its /shops/<state>/ page with a count, and the busiest
// cities linked to their /shops/<state>/<city>/ pages. Interactive name/ZIP
// search lives at its own URL (config.finderPath, default /finder) and is
// linked prominently — the static grid is the content, the finder the
// enhancement. Replaces the old JS-only root `shops.html`.

function shopsIndexPage(shops, byState, config) {
  const niche = config.niche || {};
  const siteUrl = config.brand.fullUrl;
  const canonical = `${siteUrl}/shops/`;
  const total = shops.length;
  const finderPath = config.finderPath || '/finder';

  const shopTypeLabel = niche.shopType || 'shop';
  const shopTypePlural = niche.shopTypePluralCapitalized
    ? niche.shopTypePluralCapitalized.toLowerCase()
    : (shopTypeLabel + 's');
  const shopTypePluralCap = niche.shopTypePluralCapitalized
    || titleCase(shopTypeLabel + 's');

  // States, busiest first.
  const stateEntries = Object.keys(byState).map(code => ({
    code,
    name: stateName(code),
    slug: slugify(stateName(code)),
    count: byState[code].length,
  })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const stateCount = stateEntries.length;

  // Busiest cities across every state (top 40).
  const cityMap = {};
  for (const s of shops) {
    const code = (s.state || '').toUpperCase();
    if (!code) continue;
    const key = code + '|' + (s.city || 'Other');
    if (!cityMap[key]) cityMap[key] = { city: s.city || 'Other', code, count: 0 };
    cityMap[key].count++;
  }
  const topCities = Object.values(cityMap)
    .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city))
    .slice(0, 40)
    .map(c => ({
      city: c.city,
      code: c.code,
      count: c.count,
      stSlug: slugify(stateName(c.code)),
      citySlug: slugify(c.city) || 'other',
    }));

  const stateCards = stateEntries.map(s =>
    `<a href="/shops/${s.slug}/" class="shop-card city-card"><h3>${escHtml(s.name)}</h3><div class="loc">${s.count} ${shopTypePlural}</div></a>`
  ).join('\n');

  const cityLinks = topCities.map(c =>
    `<a href="/shops/${c.stSlug}/${c.citySlug}/" class="neighbor-link">${escHtml(c.city)}, ${escHtml(c.code)} (${c.count})</a>`
  ).join('');

  const body = `
<section class="page-intro">
 <div class="wrap">
  <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a> / Shops</nav>
  <div class="eyebrow">${total.toLocaleString()} ${shopTypePlural} &middot; ${stateCount} states &amp; provinces</div>
  <h1>${shopTypePluralCap} directory</h1>
  <p class="lede">Browse ${total.toLocaleString()} local ${shopTypePlural} across ${stateCount} states and provinces. Pick a state or city below, or <a href="${escAttr(finderPath)}">search every ${shopTypeLabel} by name, city, or ZIP</a>.</p>
 </div>
</section>
<main class="content content-wide">
 <p><a href="${escAttr(finderPath)}" class="btn">Search all ${shopTypePlural} by name, city, or ZIP &rarr;</a></p>
 <h2>Browse ${shopTypePlural} by state</h2>
 <div class="card-grid">${stateCards}</div>
 <h2>Popular cities for ${shopTypePlural}</h2>
 <p>The cities with the most listed ${shopTypePlural}:</p>
 <div class="neighbors">${cityLinks}</div>
</main>`;

  const itemListSchema = schemas.itemList(
    `${shopTypePluralCap} directory`,
    `Browse ${total} ${shopTypePlural} across ${stateCount} US states and Canadian provinces.`,
    stateEntries.map(s => `${siteUrl}/shops/${s.slug}/`)
  );
  const breadcrumbSchema = schemas.breadcrumbList([
    { name: 'Home', url: siteUrl + '/' },
    { name: 'Shops', url: canonical },
  ]);

  const title = truncateTitle(`${shopTypePluralCap} Directory — Browse ${total.toLocaleString()} by State & City`);
  const description = `Directory of ${total.toLocaleString()} local ${shopTypePlural} across ${stateCount} states and provinces. Browse by state or city, or search by name, city, or ZIP.`;

  const html = pageShell({
    config,
    title,
    description,
    canonical,
    schema: [itemListSchema, breadcrumbSchema],
    body,
  });

  return { html, canonical };
}

module.exports = { statePage, cityPage, eventStatePage, shopsIndexPage };
