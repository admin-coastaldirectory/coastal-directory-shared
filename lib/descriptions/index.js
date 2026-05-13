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

const { escHtml } = require('../util');
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
    `${escHtml(shop.name)} is ${niche.shopTypeArticle || 'a'} ${storeType} located in ${escHtml(cityStr)}, ${sn}${country}.`
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
  if (shop.description) parts.push(escHtml(shop.description));

  // Rating, if any.
  const score = shop.totalScore || shop.total_score;
  const reviews = shop.reviewsCount || shop.reviews_count;
  if (score && reviews) {
    const stars = Number(score).toFixed(1);
    const ratingPhrase = score >= 4.5 ? 'highly rated' : score >= 4.0 ? 'well-reviewed' : 'rated';
    parts.push(
      `${escHtml(shop.name)} is ${ratingPhrase} by the local ${niche.collectorShort || 'collector'} community, earning ${stars} stars from ${Number(reviews).toLocaleString()} verified Google reviews.`
    );
  }

  // Closing community-flavored sentence with evocative niche phrases.
  const evoc = pickN(niche.evocativePhrases || [], 3, shop.name);
  if (evoc.length) {
    parts.push(
      `Whether you're searching for ${evoc.join(', ')}, local ${niche.shopTypeAlt || niche.shopType}s like ${escHtml(shop.name)} in ${escHtml(cityStr)} are the heart of the ${sn} ${niche.hub || 'collecting community'}.`
    );
  }

  // Practical close.
  if (shop.website) {
    parts.push(
      `Visit ${escHtml(shop.name)} online or stop by in person to browse current inventory and ask about special orders.`
    );
  } else {
    parts.push(
      `Call ahead to confirm hours and current inventory before visiting ${escHtml(shop.name)} in ${escHtml(cityStr)}.`
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

function stateMetaDescription(stateCode, shops, config) {
  const niche = config.niche;
  const name = stateName(stateCode);
  const cities = [...new Set(shops.map(s => s.city).filter(Boolean))];
  const topCities = cities.slice(0, 3).join(', ');
  return (
    `Find ${shops.length} verified ${niche.shopTypeAlt || niche.shopType}s in ${name}. ` +
    `Browse local shops by city including ${topCities}. ` +
    `Free directory with ${(niche.metaServices || 'services, hours, and reviews')}.`
  );
}

function cityMetaDescription(city, stateCode, shops, config) {
  const niche = config.niche;
  return (
    `${shops.length} ${niche.shopType}s in ${city}, ${stateName(stateCode)}. ` +
    `Find local ${niche.shopType}s with ${niche.metaCityServices || 'inventory, hours, and contact info'} near you.`
  );
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

module.exports = {
  shopDescription,
  shopFAQ,
  stateMetaDescription,
  cityMetaDescription,
  stateIntroHtml,
  cityIntroHtml,
};
