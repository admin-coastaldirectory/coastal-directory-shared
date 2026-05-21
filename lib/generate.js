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
const { stateName } = require('./states');
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
  const shops = shopsRaw.map(normalizeShop);
  console.log('  shops:', shops.length);

  const today = new Date().toISOString().split('T')[0];
  const events = await fetchAll(
    config.supabase,
    tableEvents,
    'status=eq.published&end_date=gte.' + today
  );
  console.log('  events:', events.length);

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

    for (const [city, cityShops] of Object.entries(byCity)) {
      const citySlg = slugify(city) || 'other';

      if (cityShops.length >= minShopsForCityPage) {
        const cityRes = cityPage(city, code, cityShops, config);
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
        shopUrls.push(shopRes.canonical);
        shopPageCount++;
      }
    }
  }

  console.log('\nGenerating event-state pages...');
  for (const code of Object.keys(eventsByState).sort()) {
    const stSlug = slugify(stateName(code));
    const evRes = eventStatePage(code, eventsByState[code], config);
    writeFile(path.join(outDir, 'events', stSlug, 'index.html'), evRes.html);
    eventUrls.push(evRes.canonical);
    eventStatePageCount++;
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
