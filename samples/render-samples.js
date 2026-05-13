#!/usr/bin/env node
// ============================================================
// samples/render-samples.js
// Render preview shop pages using fake-but-realistic shop data.
// ============================================================
//
// Run from the repo root:
//   node samples/render-samples.js
//
// Outputs:
//   samples/sample-coin-shop.html
//   samples/sample-comic-store.html
//
// Both files inline the canonical CSS so they open correctly when
// double-clicked from File Explorer (no web server needed).

const fs = require('fs');
const path = require('path');

const { shopPage } = require('../lib/templates/shop-page');
const cnmConfig = require('./coinsnearme.config');
const csnmConfig = require('./comicstoresnearme.config');

// Load the canonical CSS so we can inline it for samples.
const CSS = fs.readFileSync(path.join(__dirname, '..', 'assets', 'style.css'), 'utf8');

// ============================================================
// FAKE BUT PLAUSIBLE DATA
// ============================================================

// One coin shop, with 5 nearby coin shops in California.
const coinShop = {
  name: 'Pacific Numismatics',
  slug: 'pacific-numismatics-san-jose',
  city: 'San Jose',
  state: 'CA',
  country: 'US',
  address: '1247 The Alameda',
  zip: '95126',
  phone: '(408) 555-0142',
  hours: 'Mon–Fri 10am–6pm, Sat 10am–4pm, Sun closed',
  website: 'https://pacificnumismatics.example.com',
  google_maps: 'https://maps.google.com/?q=Pacific+Numismatics+San+Jose',
  description:
    'Pacific Numismatics has been serving Bay Area coin collectors for over 30 years, ' +
    'specializing in classic US gold, Morgan dollars, and Greek and Roman ancient coinage.',
  services: ['pcgs-drop-off', 'ngc-drop-off', 'us-coins', 'world-coins', 'ancient', 'bullion', 'buy-sell', 'appraisals'],
  totalScore: 4.8,
  reviewsCount: 247,
  owner_verified: true,
  featured: true,
};

const coinShopsInCA = [
  coinShop,
  {
    name: 'Bay Area Coin Exchange',
    slug: 'bay-area-coin-exchange-oakland',
    city: 'Oakland',
    state: 'CA',
    services: ['us-coins', 'bullion', 'buy-sell'],
    owner_verified: true,
  },
  {
    name: 'Golden State Numismatics',
    slug: 'golden-state-numismatics-sacramento',
    city: 'Sacramento',
    state: 'CA',
    services: ['pcgs-drop-off', 'us-coins', 'currency'],
  },
  {
    name: 'Sunset Coin & Bullion',
    slug: 'sunset-coin-bullion-san-francisco',
    city: 'San Francisco',
    state: 'CA',
    services: ['bullion', 'buy-sell'],
    owner_verified: true,
  },
  {
    name: 'Coastline Coins',
    slug: 'coastline-coins-monterey',
    city: 'Monterey',
    state: 'CA',
    services: ['us-coins', 'world-coins', 'tokens'],
  },
];

// One comic shop, with 4 nearby comic shops in Texas.
const comicShop = {
  name: 'Lone Star Comics & Collectibles',
  slug: 'lone-star-comics-collectibles-austin',
  city: 'Austin',
  state: 'TX',
  country: 'US',
  address: '1819 South Lamar Blvd',
  zip: '78704',
  phone: '(512) 555-0184',
  hours: 'Tue–Sat 11am–8pm, Sun 12pm–6pm, Mon closed',
  website: 'https://lonestarcomics.example.com',
  google_maps: 'https://maps.google.com/?q=Lone+Star+Comics+Austin',
  description:
    'Lone Star Comics has been an Austin staple since 1994, with one of the deepest ' +
    'back issue selections in central Texas and a passionate focus on Wednesday\'s ' +
    'pull list customers. Authorized CGC drop-off and frequent creator signings.',
  services: ['new-issues', 'back-issues', 'cgc', 'signings', 'buy-sell', 'pull-list'],
  totalScore: 4.7,
  reviewsCount: 312,
  owner_verified: true,
  featured: false,
};

const comicShopsInTX = [
  comicShop,
  {
    name: 'Capitol City Comics',
    slug: 'capitol-city-comics-austin',
    city: 'Austin',
    state: 'TX',
    services: ['new-issues', 'back-issues', 'gaming'],
    owner_verified: true,
  },
  {
    name: 'Bedrock Comics',
    slug: 'bedrock-comics-houston',
    city: 'Houston',
    state: 'TX',
    services: ['new-issues', 'back-issues', 'cgc'],
  },
  {
    name: 'Third Planet Sci-Fi Superstore',
    slug: 'third-planet-sci-fi-houston',
    city: 'Houston',
    state: 'TX',
    services: ['new-issues', 'back-issues', 'signings', 'gaming'],
    owner_verified: true,
  },
  {
    name: 'Tex-Mex Comics',
    slug: 'tex-mex-comics-san-antonio',
    city: 'San Antonio',
    state: 'TX',
    services: ['new-issues', 'cgc', 'signings'],
  },
];

// ============================================================
// RENDER + INLINE CSS POST-PROCESSING
// ============================================================

function renderSample(shop, allInState, config, outFile) {
  const result = shopPage(shop, config, allInState);
  if (!result) {
    console.error('shopPage returned null — shop may be too thin');
    return;
  }
  // Replace the external stylesheet link with inline CSS so the
  // samples open correctly when double-clicked.
  let html = result.html.replace(
    '<link rel="stylesheet" href="/style.css">',
    `<style>${CSS}</style>`
  );
  // Stub out the shared.js script (would 404 otherwise).
  html = html.replace(
    '<script src="/shared.js" defer></script>',
    '<!-- shared.js stubbed for sample preview -->'
  );
  // Add a banner at the top so it's clear this is a preview.
  const banner = `<div style="background:#fff8dc;border-bottom:2px solid #d97706;padding:10px 20px;font-size:13px;color:#78350f;text-align:center">
This is a sample preview of the canonical shop-page template using fake data. ` +
    `In production, the shop content comes from Supabase and the page is generated by lib/generate.js.</div>\n`;
  html = html.replace('<body>', '<body>\n' + banner);

  fs.writeFileSync(outFile, html, 'utf8');
  const kb = (Buffer.byteLength(html) / 1024).toFixed(1);
  console.log(`  wrote ${path.relative(process.cwd(), outFile)}  (${kb} KB)`);
}

console.log('Rendering sample shop pages...');
renderSample(coinShop, coinShopsInCA, cnmConfig, path.join(__dirname, 'sample-coin-shop.html'));
renderSample(comicShop, comicShopsInTX, csnmConfig, path.join(__dirname, 'sample-comic-store.html'));
console.log('\nOpen either file in a browser to preview.');
