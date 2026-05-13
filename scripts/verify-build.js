#!/usr/bin/env node
// scripts/verify-build.js — post-build sanity checks

const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.resolve(process.argv[2] || './pages');
const MIN_PAGE_BYTES = 1024;

let errors = 0;
let warnings = 0;

function err(msg) { console.error(`ERROR: ${msg}`); errors++; }
function warn(msg) { console.warn(`WARN:  ${msg}`); warnings++; }
function ok(msg)  { console.log(`OK:    ${msg}`); }

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function checkPagesDirExists() {
  if (!fs.existsSync(PAGES_DIR)) {
    err(`pages dir does not exist: ${PAGES_DIR}`);
    process.exit(1);
  }
  ok(`pages dir found: ${PAGES_DIR}`);
}

function checkPageSizes() {
  let count = 0, thin = 0;
  for (const f of walk(PAGES_DIR)) {
    if (!f.endsWith('.html')) continue;
    count++;
    const size = fs.statSync(f).size;
    if (size < MIN_PAGE_BYTES) {
      const head = fs.readFileSync(f, 'utf8').slice(0, 500).toLowerCase();
      if (head.includes('http-equiv="refresh"') || head.includes("http-equiv='refresh'")) {
        continue;
      }
      err(`thin page (<${MIN_PAGE_BYTES} bytes): ${path.relative(PAGES_DIR, f)} (${size}b)`);
      thin++;
    }
  }
  if (thin === 0) ok(`page sizes: all ${count} pages OK (redirect stubs exempt)`);
}

function checkOrphanStateFolders() {
  const shopsDir = path.join(PAGES_DIR, 'shops');
  if (!fs.existsSync(shopsDir)) { warn('no /shops/ folder found'); return; }
  let orphans = 0;
  for (const entry of fs.readdirSync(shopsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const indexPath = path.join(shopsDir, entry.name, 'index.html');
    if (!fs.existsSync(indexPath)) {
      err(`/shops/${entry.name}/ has no index.html`);
      orphans++;
    }
  }
  if (orphans === 0) ok('no orphan state folders');
}

function checkOrphanCityAndShopFolders() {
  const shopsDir = path.join(PAGES_DIR, 'shops');
  if (!fs.existsSync(shopsDir)) return;
  let orphans = 0;
  for (const stateEntry of fs.readdirSync(shopsDir, { withFileTypes: true })) {
    if (!stateEntry.isDirectory()) continue;
    const stateDir = path.join(shopsDir, stateEntry.name);
    for (const cityEntry of fs.readdirSync(stateDir, { withFileTypes: true })) {
      if (!cityEntry.isDirectory()) continue;
      const cityDir = path.join(stateDir, cityEntry.name);
      for (const shopEntry of fs.readdirSync(cityDir, { withFileTypes: true })) {
        if (!shopEntry.isDirectory()) continue;
        const shopIndexPath = path.join(cityDir, shopEntry.name, 'index.html');
        if (!fs.existsSync(shopIndexPath)) {
          err(`/shops/${stateEntry.name}/${cityEntry.name}/${shopEntry.name}/ has no index.html`);
          orphans++;
        }
      }
    }
  }
  if (orphans === 0) ok('no orphan shop folders');
}

function checkDuplicateUrls() {
  const shopsDir = path.join(PAGES_DIR, 'shops');
  if (!fs.existsSync(shopsDir)) return;
  let dups = 0;
  for (const entry of fs.readdirSync(shopsDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
    const base = entry.name.replace(/\.html$/, '');
    if (fs.existsSync(path.join(shopsDir, base))) {
      err(`duplicate URL: /shops/${entry.name} AND /shops/${base}/`);
      dups++;
    }
  }
  if (dups === 0) ok('no duplicate URL collisions in /shops/');
}

function checkSitemapTargets() {
  const files = fs.readdirSync(PAGES_DIR).filter(f => f.startsWith('sitemap-') && f.endsWith('.xml'));
  if (files.length === 0) { warn('no sitemap-*.xml files found'); return; }
  let missing = 0;
  let total = 0;
  for (const file of files) {
    const xml = fs.readFileSync(path.join(PAGES_DIR, file), 'utf8');
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
    for (const loc of locs) {
      total++;
      const u = new URL(loc);
      let p = u.pathname;
      const candidates = [];
      if (p === '/') {
        candidates.push('/index.html');
      } else if (p.endsWith('/')) {
        candidates.push(p + 'index.html');
        candidates.push(p.replace(/\/$/, '.html'));
      } else if (!p.match(/\.\w+$/)) {
        candidates.push(p + '/index.html');
        candidates.push(p + '.html');
      } else {
        candidates.push(p);
      }
      const found = candidates.some(c => fs.existsSync(path.join(PAGES_DIR, c.replace(/^\//, ''))));
      if (!found) {
        const shown = candidates[0].replace(/^\//, '');
        err(`sitemap entry missing on disk: ${loc}  →  ${shown}`);
        missing++;
      }
    }
  }
  if (missing === 0) ok(`all ${total} sitemap entries resolve`);
}

console.log(`\n=== Build verification: ${PAGES_DIR} ===\n`);
checkPagesDirExists();
checkPageSizes();
checkOrphanStateFolders();
checkOrphanCityAndShopFolders();
checkDuplicateUrls();
checkSitemapTargets();

console.log('');
console.log(`Errors:   ${errors}`);
console.log(`Warnings: ${warnings}`);

if (errors > 0) process.exit(1);
process.exit(0);
