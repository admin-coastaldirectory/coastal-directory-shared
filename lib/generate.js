// ============================================================
// generate.js — main entry point for the canonical builder
// ============================================================
//
// Each site has its own generate.js (or index.js) that does:
//
//   const { build } = require('../coastal-directory-shared/lib/generate');
//   const config = require('./site.config');
//   build(config).catch(e => { console.error(e); process.exit(1); });
//
// `build(config)` does all the work: fetches data from Supabase,
// renders state/city/shop/event pages, writes sitemaps, robots.txt.
//
// This generator outputs to FOLDER URLs (no .html files):
//   /shops/california/index.html
//   /shops/california/los-angeles/index.html
//   /shops/california/los-angeles/d20-games/index.html

const path = require('path');
const fs = require('fs');
const { slugify, mkdirp, writeFile, normalizeShop } = require('./util');
const { stateName, neighborsOf } = require('./states');
const { fetchAll } = require('./fetch-supabase');
const { shopPage } = require('./templates/shop-page');
const { statePage, cityPage, eventStatePage } = require('./templates/listing-page');
const sitemaps = require('./sitemaps');

async function build(config) {
  validateConfig(config);

  const tableShops = config.supabase.tables.shops;
  const tableEvents = config.supabase.tables.events;
  const outDir = path.resolve(config.output && config.output.dir || './pages');
  const siteUrl = config.brand.fullUrl;

  console.log('\n=== ' + config.brand.name + ' build ===');
  console.log('Output:', outDir);
  console.log('Supabase:', config.supabase.url);

  console.log('\nFetching data from Supabase...');
  const shopsRaw = await fetchAll(config.supabase, tableShops, 'status=eq.published');
  const allShops = shopsRaw.map(normalizeShop);

  // Quarantine guard: never let a shop with a null/empty city or state
  // reach the page/sitemap builders. Such a record produces a broken
  // empty path segment (e.g. /shops/alabama//quality-comix). Exclude it
  // everywhere — state list, city pages, shop pages, and sitemaps — and
  // log it so the bad record can be corrected in Supabase.
  const shops = [];
  const quarantined = [];
  for (const s of allShops) {
    const hasState = s.state != null && String(s.state).trim() !== '';
    const hasCity = s.city != null && String(s.city).trim() !== '';
    if (hasState && hasCity) shops.push(s);
    else quarantined.push(s);
  }
  console.log('  shops:', shops.length);
  if (quarantined.length) {
    console.warn('  ⚠ quarantined ' + quarantined.length +
      ' shop(s) with empty city/state (excluded from pages + sitemap):');
    for (const s of quarantined) {
      console.warn('     - id=' + (s.id != null ? s.id : '?') +
        ' name=' + JSON.stringify(s.name || '') +
        ' city=' + JSON.stringify(s.city || '') +
        ' state=' + JSON.stringify(s.state || ''));
    }
  }

  const today = new Date().toISOString().split('T')[0];
  const eventsRaw = await fetchAll(
    config.supabase,
    tableEvents,
    'status=eq.published&end_date=gte.' + today
  );
  console.log('  events:', eventsRaw.length);

  // Optional, per-site event handling. Both default to the previous behavior
  // (no filtering, no floor) so sites without a `config.events` block are
  // completely unaffected by this.
  //
  //   countryFilter        — restrict event pages to one country code. The
  //                          rows stay in the database; they just don't get
  //                          their own state page (e.g. LCS is a US events
  //                          product, but the table also holds CA shows).
  //   minEventsForFullPage — below this count a state still gets a page, but
  //                          a padded one (its shops + neighbor event links)
  //                          so it isn't a thin-content near-empty page.
  const eventCfg = config.events || {};
  const countryFilter = eventCfg.countryFilter || null;
  const minEventsForFullPage = eventCfg.minEventsForFullPage || 0;

  const events = countryFilter
    ? eventsRaw.filter(e =>
        String(e.country == null || e.country === '' ? 'US' : e.country).toUpperCase()
          === String(countryFilter).toUpperCase())
    : eventsRaw;
  if (countryFilter) {
    console.log('  events after country filter (' + countryFilter + '):', events.length,
      '(' + (eventsRaw.length - events.length) + ' excluded)');
  }

  // Reset only directories/files this generator owns. Never wipe outDir
  // entirely — that would nuke hand-written pages (about.html, faq.html
  // etc.) when output.dir is the repo root.
  const ownedSubdirs = ['shops', 'events'];
  for (const sub of ownedSubdirs) {
    const p = path.join(outDir, sub);
    if (fs.existsSync(p)) fs.rmSync(p, { recursive: true });
  }
  if (fs.existsSync(outDir)) {
    for (const f of fs.readdirSync(outDir)) {
      if (/^sitemap(?:-[a-z0-9-]+)?\.xml$/.test(f)) {
        fs.rmSync(path.join(outDir, f));
      }
    }
  }
  mkdirp(outDir);

  const byState = {};
  for (const s of shops) {
    const code = (s.state || '').toUpperCase();
    if (!code) continue;
    if (!byState[code]) byState[code] = [];
    byState[code].push(s);
  }

  const eventsByState = {};
  for (const e of events) {
    const code = (e.state || '').toUpperCase();
    if (!code) continue;
    if (!eventsByState[code]) eventsByState[code] = [];
    eventsByState[code].push(e);
  }

  const stateUrls = [];
  const cityUrls = [];
  const eventUrls = [];
  const shopUrls = [];
  let statePageCount = 0;
  let cityPageCount = 0;
  let shopPageCount = 0;
  let noindexCount = 0;
  let eventStatePageCount = 0;

  console.log('\nGenerating state, city, and shop pages...');
  const statesUsed = Object.keys(byState).sort();
  const minShopsForCityPage =
    (config.thresholds && config.thresholds.minShopsForCityPage) || 2;

  for (const code of statesUsed) {
    const sn = stateName(code);
    const stSlug = slugify(sn);
    const stateShops = byState[code];
    const stateEvents = eventsByState[code] || [];

    const stRes = statePage(code, stateShops, stateEvents, config);
    writeFile(path.join(outDir, 'shops', stSlug, 'index.html'), stRes.html);
    stateUrls.push(stRes.canonical);
    statePageCount++;

    const byCity = {};
    for (const s of stateShops) {
      const c = s.city || 'Other';
      if (!byCity[c]) byCity[c] = [];
      byCity[c].push(s);
    }

    // Cities with their own page (>= threshold) — passed to each
    // cityPage so it can cross-link to the other cities in the state.
    const linkableCities = Object.entries(byCity)
      .filter(([, arr]) => arr.length >= minShopsForCityPage)
      .map(([c, arr]) => ({ name: c, slug: slugify(c) || 'other', count: arr.length }));

    for (const [city, cityShops] of Object.entries(byCity)) {
      const citySlg = slugify(city) || 'other';

      if (cityShops.length >= minShopsForCityPage) {
        const cityRes = cityPage(city, code, cityShops, config, linkableCities);
        writeFile(path.join(outDir, 'shops', stSlug, citySlg, 'index.html'), cityRes.html);
        cityUrls.push(cityRes.canonical);
        cityPageCount++;
      }

      for (const s of cityShops) {
        const shopRes = shopPage(s, config, stateShops);
        if (!shopRes) continue;
        writeFile(
          path.join(outDir, 'shops', stSlug, citySlg, shopRes.slug, 'index.html'),
          shopRes.html
        );
        // Only Tier A (indexable) shops go into the sitemap. Tier B pages are
        // still written and still linked from their city page, but carry
        // noindex,follow and stay out of every sitemap-shops-N.xml.
        if (shopRes.indexable) shopUrls.push(shopRes.canonical);
        shopPageCount++;
        if (!shopRes.indexable) noindexCount++;
      }
    }
  }

  console.log('\nGenerating event-state pages...');
  const eventStateCodes = Object.keys(eventsByState).sort();
  const eventStateSlug = {};
  for (const code of eventStateCodes) eventStateSlug[code] = slugify(stateName(code));

  let thinStatePageCount = 0;
  for (const code of eventStateCodes) {
    const stateEvents = eventsByState[code];
    const stSlug = eventStateSlug[code];

    // Only states under the floor get padded with their shop listings.
    // Neighbor links go on every event page — cheap internal linking that
    // helps thin and full states alike.
    const isThin = stateEvents.length < minEventsForFullPage;
    const padShops = isThin ? (byState[code] || []).slice(0, 12) : [];
    const neighborEventStates = neighborsOf(code)
      .filter(n => eventsByState[n] && eventsByState[n].length)
      .map(n => ({ code: n, name: stateName(n), slug: eventStateSlug[n] }));

    const evRes = eventStatePage(code, stateEvents, config, {
      isThin,
      padShops,
      neighborEventStates,
    });
    writeFile(path.join(outDir, 'events', stSlug, 'index.html'), evRes.html);
    eventUrls.push(evRes.canonical);
    eventStatePageCount++;
    if (isThin) thinStatePageCount++;
  }
  if (minEventsForFullPage) {
    console.log('  full state pages:  ', eventStatePageCount - thinStatePageCount);
    console.log('  padded thin states:', thinStatePageCount);
  }

  console.log('\nGenerating sitemaps...');
  const coreUrls = [
    siteUrl + '/',
    siteUrl + '/shops/',
    siteUrl + '/events/',
    siteUrl + '/faq',
    siteUrl + '/blog',
    siteUrl + '/advertise',
    siteUrl + '/submit',
    siteUrl + '/about',
    siteUrl + '/privacy',
    siteUrl + '/claim',
    // Site-specific indexable content pages, declared per site in
    // config.corePages (paths starting with '/'). Keeps niche pages
    // out of sibling sites' sitemaps.
    ...(Array.isArray(config.corePages) ? config.corePages : []).map(p => siteUrl + p),
  ];
  const sitemapFiles = sitemaps.build({
    outDir,
    siteUrl,
    coreUrls,
    stateUrls,
    cityUrls,
    eventUrls,
    shopUrls,
  });

  console.log('\n=== Build complete ===');
  console.log('  state pages:       ', statePageCount);
  console.log('  city pages:        ', cityPageCount);
  console.log('  shop pages:        ', shopPageCount);
  console.log('    indexed (Tier A):', shopPageCount - noindexCount);
  console.log('    noindex (Tier B):', noindexCount);
  console.log('  event-state pages: ', eventStatePageCount);
  console.log('  total HTML pages:  ', statePageCount + cityPageCount + shopPageCount + eventStatePageCount);
  console.log('  sitemap files:     ', sitemapFiles.length, '(+ sitemap.xml index)');
}

function validateConfig(config) {
  const required = [
    'brand.name',
    'brand.fullUrl',
    'niche.shopType',
    'supabase.url',
    'supabase.key',
    'supabase.tables.shops',
    'supabase.tables.events',
  ];
  for (const p of required) {
    const parts = p.split('.');
    let cur = config;
    for (const k of parts) {
      cur = cur && cur[k];
    }
    if (cur == null || cur === '') {
      throw new Error('Site config is missing required field: ' + p);
    }
  }
}

module.exports = { build };
