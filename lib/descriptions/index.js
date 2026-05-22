// ============================================================
// descriptions/index.js — niche-aware copy generators
// ============================================================
//
// These functions build the human-readable prose that appears
// on each page (About paragraph, FAQ, state intros, city intros,
// meta descriptions). All copy is parameterized by the site
// config's `niche` block so the same templates work for both
// CoinsNearMe and ComicStoresNearMe.
//
// `niche` contract (see samples/coinsnearme.config.js for an
// example):
//   shopType, shopTypeAlt, collector, collectorShort,
//   productPlural, hub, evocativePhrases (array),
//   serviceAbout (service-code → about-text fragment),
//   serviceFAQ   (service-code → { q, a } templates),
//   serviceBadge (service-code → short badge label),
//   serviceFAQDefault: array of generic Q&A used on every shop page.

const { escHtml, slugify } = require('../util');
const { stateName } = require('../states');

// Substitute {placeholders} in a template string with values.
// Used for templated FAQ Q&A entries.
function fill(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] != null ? vars[k] : ''
  );
}

// Pick N items from an array, preferring the first ones (deterministic
// per shop-name so the same shop always gets the same evocative phrases).
function pickN(arr, n, seed) {
  if (!arr || arr.length <= n) return arr || [];
  // Deterministic seeded pick using the seed string's char codes.
  const seedNum = String(seed || '').split('')
    .reduce((a, c) => a + c.charCodeAt(0), 0);
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(arr[(seedNum + i) % arr.length]);
  }
  return out;
}

// Build a FAQ entry from plain text. `a` is the escaped HTML shown on the
// page; `aText` is the plain text used in the FAQPage schema, so the schema
// mirrors the visible text. Entries that need an inline link build `a`
// themselves and pass the link-free sentence as the second argument here.
function faqEntry(q, text) {
  return { q, a: escHtml(text), aText: text };
}

// ============================================================
// SHOP-PAGE DESCRIPTION (the "About <shop>" paragraph)
// ============================================================

function shopDescription(shop, config) {
  const niche = config.niche;
  const sn = stateName(shop.state);
  const cityStr = shop.city || sn;
  const country = shop.country === 'CA' ? ', Canada' : '';

  const parts = [];

  // Opening sentence: what kind of shop is this?
  let storeType = niche.shopType;
  if (shop.services && niche.shopTypeOverride) {
    for (const [svcCode, override] of Object.entries(niche.shopTypeOverride)) {
      if (shop.services.includes(svcCode)) {
        storeType = override;
        break;
      }
    }
  }
  parts.push(
    `${shop.name} is ${niche.shopTypeArticle || 'a'} ${storeType} located in ${cityStr}, ${sn}${country}.`
  );

  // Services available.
  if (shop.services && shop.services.length && niche.serviceAbout) {
    const svcPhrases = shop.services
      .filter(svc => niche.serviceAbout[svc])
      .map(svc => niche.serviceAbout[svc]);
    if (svcPhrases.length) {
      parts.push(
        `Collectors visiting this location can find ${svcPhrases.join(', ')}.`
      );
    }
  }

  // Owner-supplied description, if any.
  if (shop.description) parts.push(shop.description);

  // Rating, if any.
  const score = shop.totalScore || shop.total_score;
  const reviews = shop.reviewsCount || shop.reviews_count;
  if (score && reviews) {
    const stars = Number(score).toFixed(1);
    const ratingPhrase = score >= 4.5 ? 'highly rated' : score >= 4.0 ? 'well-reviewed' : 'rated';
    parts.push(
      `${shop.name} is ${ratingPhrase} by the local ${niche.collectorShort || 'collector'} community, earning ${stars} stars from ${Number(reviews).toLocaleString()} verified Google reviews.`
    );
  }

  // Closing community-flavored sentence with evocative niche phrases.
  const evoc = pickN(niche.evocativePhrases || [], 3, shop.name);
  if (evoc.length) {
    parts.push(
      `Whether you're searching for ${evoc.join(', ')}, local ${niche.shopTypeAlt || niche.shopType}s like ${shop.name} in ${cityStr} are the heart of the ${sn} ${niche.hub || 'collecting community'}.`
    );
  }

  // Practical close.
  if (shop.website) {
    parts.push(
      `Visit ${shop.name} online or stop by in person to browse current inventory and ask about special orders.`
    );
  } else {
    parts.push(
      `Call ahead to confirm hours and current inventory before visiting ${shop.name} in ${cityStr}.`
    );
  }

  return parts.join(' ');
}

// ============================================================
// SHOP-PAGE FAQ
// ============================================================

function shopFAQ(shop, config) {
  const niche = config.niche;
  const sn = stateName(shop.state);
  const vars = {
    name: shop.name,
    city: shop.city,
    state: sn,
    address: shop.address,
  };

  const faqs = [];

  // Always: where is it?
  faqs.push({
    q: `Where is ${shop.name} located?`,
    a: `${shop.name} is located in ${shop.city}, ${sn}${shop.address ? ` at ${shop.address}` : ''}.`,
  });

  // Service-specific Q&As if the shop offers the service.
  if (shop.services && niche.serviceFAQ) {
    for (const svc of shop.services) {
      const tmpl = niche.serviceFAQ[svc];
      if (!tmpl) continue;
      faqs.push({
        q: fill(tmpl.q, vars),
        a: fill(tmpl.a, vars),
      });
    }
  }

  // Generic close-out Q&A.
  if (niche.serviceFAQDefault) {
    for (const tmpl of niche.serviceFAQDefault) {
      faqs.push({ q: fill(tmpl.q, vars), a: fill(tmpl.a, vars) });
    }
  } else {
    faqs.push({
      q: `What should I expect at ${shop.name}?`,
      a: `${shop.name} is a local ${niche.shopType} in ${shop.city}, ${sn}. Expect the kind of selection and service that local ${niche.collector || 'collectors'} rely on.`,
    });
  }

  return faqs;
}

// ============================================================
// META DESCRIPTIONS (for <meta name="description">)
// ============================================================

// All three meta-description generators below return a COMPLETE sentence
// that already fits within the ~155-160 char display limit. Templates
// must use the returned string as-is — never .slice() it, which would
// re-introduce the mid-sentence truncation this was written to fix.

function stateMetaDescription(stateCode, shops, config) {
  const niche = config.niche;
  const name = stateName(stateCode);
  const noun = niche.shopTypeAlt || niche.shopType;
  const services = niche.metaServices || 'services, hours, and reviews';
  const cities = [...new Set(shops.map(s => s.city).filter(Boolean))].slice(0, 3);
  // Prefer the city-name variant for long-tail value, but only when it
  // stays a complete sentence under the limit. Otherwise fall back to
  // the cityless variant, which is always short.
  const withCities = `Find ${shops.length} verified ${noun}s in ${name}, including ${cities.join(', ')}. Free directory with ${services}.`;
  const noCities = `Find ${shops.length} verified ${noun}s in ${name}. Free directory with ${services}.`;
  return (cities.length && withCities.length <= 158) ? withCities : noCities;
}

function cityMetaDescription(city, stateCode, shops, config) {
  const niche = config.niche;
  const services = niche.metaCityServices || 'inventory, hours, and contact info';
  return `${shops.length} ${niche.shopType}s in ${city}, ${stateName(stateCode)} — find local shops with ${services}.`;
}

function shopMetaDescription(shop, config) {
  const niche = config.niche;
  const sn = stateName(shop.state);
  const noun = niche.shopType;
  const where = shop.city || sn;
  const opener = `${shop.name} is a ${noun} in ${where}, ${sn}.`;
  const tail = ` Find address, hours, phone, and services for this local ${niche.shopTypeAlt || noun}.`;
  const full = opener + tail;
  return full.length <= 160 ? full : opener;
}

// ============================================================
// STATE-PAGE INTRO BLOCKS (rich on-page copy)
// ============================================================

function stateIntroHtml(stateCode, shops, config) {
  const niche = config.niche;
  const sn = stateName(stateCode);
  return (
    `<h2>About ${niche.shopType}s in ${sn}</h2>\n` +
    `<p>${sn} is home to ${shops.length} verified ${niche.shopType}s serving ${niche.collector || 'collectors'} across the state. ` +
    `Whether you're looking for ${(niche.evocativePhrases || []).slice(0, 3).join(', ')}, ` +
    `local ${niche.shopTypeAlt || niche.shopType}s are the backbone of the ${sn} ${niche.hub || 'collecting community'}.</p>\n` +
    `<p>This directory lists every verified ${niche.shopType} we've found in ${sn}, organized by city for easy browsing. ` +
    `Each shop listing includes address, hours, website, and services so you can find exactly the right shop for what you need.</p>`
  );
}

function cityIntroHtml(city, stateCode, shops, config) {
  const niche = config.niche;
  const sn = stateName(stateCode);
  return (
    `<h2>Local ${niche.shopType}s in ${escHtml(city)}</h2>\n` +
    `<p>Browse ${shops.length} verified ${niche.shopType}s in ${escHtml(city)}, ${sn}. ` +
    `These local shops serve the ${escHtml(city)} ${niche.collector || 'collecting'} community ` +
    `with ${(niche.cityIntroServices || 'a range of services for serious collectors')}.</p>\n` +
    `<p>Supporting your local shop is how the hobby stays alive. ` +
    `${niche.cityIntroClose || `Whether you're a regular or just visiting, the shops below are your local options in ${escHtml(city)}.`}</p>`
  );
}

// ============================================================
// STATE / CITY FAQ
// ============================================================
//
// Visible FAQ section + FAQPage schema for the state and city
// listing pages. Parameterized by config.niche so the same
// templates serve every Coastal Directory site. The page template
// must render the SAME text it passes to schemas.faqPage() —
// Google penalizes a visible/schema mismatch.

function cityFAQ(city, stateCode, shops, config) {
  const niche = config.niche;
  const sn = stateName(stateCode);
  const noun = niche.shopType;
  const nounPl = niche.shopTypePluralCapitalized
    ? niche.shopTypePluralCapitalized.toLowerCase()
    : noun + 's';
  const services = niche.metaCityServices || 'a range of services for collectors';
  const stSlug = slugify(sn);
  const citySlug = slugify(city) || 'other';
  const faqs = [];

  faqs.push(faqEntry(
    `How many ${nounPl} are in ${city}?`,
    `There are ${shops.length} verified ${nounPl} in ${city}, ${sn}. Every listing on this page includes the shop's address, phone number, hours, and services.`
  ));

  faqs.push(faqEntry(
    `What do ${nounPl} in ${city} offer?`,
    `${city} ${nounPl} typically offer ${services}. Each shop listing above shows the specific services that location provides.`
  ));

  const rated = shops
    .filter(s => Number(s.totalScore || s.total_score) > 0)
    .sort((a, b) => Number(b.totalScore || b.total_score) - Number(a.totalScore || a.total_score));
  if (rated.length) {
    const top = rated[0];
    const stars = Number(top.totalScore || top.total_score).toFixed(1);
    const topSlug = top.slug || slugify((top.name || '') + '-' + (top.city || ''));
    const topUrl = `/shops/${stSlug}/${citySlug}/${topSlug}/`;
    faqs.push({
      q: `Which ${noun} in ${city} is the highest rated?`,
      a: `<a href="${topUrl}">${escHtml(top.name)}</a> is among the highest-rated ${nounPl} in ${escHtml(city)}, with ${stars} stars from verified Google reviews. Compare ratings across every ${escHtml(city)} listing above to find the best fit for what you collect.`,
      aText: `${top.name} is among the highest-rated ${nounPl} in ${city}, with ${stars} stars from verified Google reviews. Compare ratings across every ${city} listing above to find the best fit for what you collect.`,
    });
  }

  faqs.push(faqEntry(
    `How do I find a ${noun} near me in ${city}?`,
    `This page lists every verified ${noun} in ${city}, ${sn}, each with its address and opening hours, so you can find one close to you.`
  ));

  return faqs;
}

function stateFAQ(stateCode, shops, config) {
  const niche = config.niche;
  const name = stateName(stateCode);
  const noun = niche.shopType;
  const nounPl = niche.shopTypePluralCapitalized
    ? niche.shopTypePluralCapitalized.toLowerCase()
    : noun + 's';
  const services = niche.metaServices || 'a range of services for collectors';
  const cities = [...new Set(shops.map(s => s.city).filter(Boolean))];
  const faqs = [];

  faqs.push(faqEntry(
    `How many ${nounPl} are in ${name}?`,
    `There are ${shops.length} verified ${nounPl} in ${name}, organized by city on this page so you can browse the area closest to you.`
  ));

  if (cities.length) {
    const cityList = cities.length > 5
      ? 'including ' + cities.slice(0, 5).join(', ')
      : cities.join(', ');
    faqs.push(faqEntry(
      `Which ${name} cities have ${nounPl}?`,
      `${name} ${nounPl} are spread across ${cities.length} cities and towns, ${cityList}. Use the city links above to jump to a specific area.`
    ));
  }

  faqs.push(faqEntry(
    `What do ${name} ${nounPl} offer?`,
    `${name} ${nounPl} offer ${services}. Each shop listing shows its specific services, opening hours, and contact details.`
  ));

  faqs.push(faqEntry(
    `How do I find a ${noun} near me in ${name}?`,
    `Browse the city list above to jump to your area, or scroll the full directory of ${name} ${nounPl} further down the page — each listing includes an address and hours.`
  ));

  return faqs;
}

module.exports = {
  shopDescription,
  shopFAQ,
  stateMetaDescription,
  cityMetaDescription,
  shopMetaDescription,
  stateFAQ,
  cityFAQ,
  stateIntroHtml,
  cityIntroHtml,
};
