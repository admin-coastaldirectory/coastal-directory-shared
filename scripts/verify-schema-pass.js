#!/usr/bin/env node
// ============================================================
// scripts/verify-schema-pass.js
// ============================================================
//
// Regression harness for the GEO schema-hardening pass:
//   1) forceOrigin() canonical/og:url guard (lib/templates/shell.js)
//   2) article() schema (lib/schemas/index.js)
//   3) homeFAQ() generator (lib/descriptions/index.js)
//
// Plain assert-based checks, no test framework dependency — prints
// PASS/FAIL per check and exits 1 if anything fails, so it's safe to
// wire into a pre-push hook or CI step.

const assert = require('assert');
const path = require('path');

const { pageShell, forceOrigin } = require(path.join(__dirname, '..', 'lib', 'templates', 'shell'));
const schemas = require(path.join(__dirname, '..', 'lib', 'schemas'));
const descriptions = require(path.join(__dirname, '..', 'lib', 'descriptions'));

let pass = 0;
let fail = 0;
const failures = [];

function check(name, fn) {
  try {
    fn();
    pass++;
    console.log(`  PASS  ${name}`);
  } catch (e) {
    fail++;
    failures.push({ name, error: e.message });
    console.log(`  FAIL  ${name} — ${e.message}`);
  }
}

console.log('\n=== forceOrigin() — canonical/og:url domain guard ===\n');

const brand = { name: 'CoinsNearMe', fullUrl: 'https://coinsnearme.co' };

check('forceOrigin rewrites a wrong-domain absolute URL onto brand.fullUrl', () => {
  assert.strictEqual(forceOrigin('https://coinsnearme.com/faq', brand), 'https://coinsnearme.co/faq');
});

check('forceOrigin preserves query string + hash when rewriting domain', () => {
  assert.strictEqual(
    forceOrigin('https://coinsnearme.com/shops?state=ny#top', brand),
    'https://coinsnearme.co/shops?state=ny#top'
  );
});

check('forceOrigin leaves an already-correct URL unchanged', () => {
  assert.strictEqual(forceOrigin('https://coinsnearme.co/about', brand), 'https://coinsnearme.co/about');
});

check('forceOrigin resolves a bare path onto brand.fullUrl', () => {
  assert.strictEqual(forceOrigin('/faq', brand), 'https://coinsnearme.co/faq');
});

check('forceOrigin resolves a path missing its leading slash', () => {
  assert.strictEqual(forceOrigin('faq', brand), 'https://coinsnearme.co/faq');
});

check('forceOrigin returns the bare origin for an empty/undefined url', () => {
  assert.strictEqual(forceOrigin('', brand), 'https://coinsnearme.co/');
  assert.strictEqual(forceOrigin(undefined, brand), 'https://coinsnearme.co/');
});

check('forceOrigin is a no-op passthrough when brand.fullUrl is missing', () => {
  assert.strictEqual(forceOrigin('https://coinsnearme.com/faq', {}), 'https://coinsnearme.com/faq');
});

console.log('\n=== pageShell() — canonical + og:url actually forced in rendered HTML ===\n');

const shellConfig = {
  brand: { name: 'CoinsNearMe', legalName: 'Coastal Directory LLC, Wyoming', fullUrl: 'https://coinsnearme.co' },
  nav: [{ label: 'Shops', href: '/shops/' }],
};

const rendered = pageShell({
  config: shellConfig,
  title: 'Test Page',
  description: 'Test description',
  canonical: 'https://coinsnearme.com/faq', // deliberately wrong domain
  schema: null,
  body: '<main class="content"><p>test</p></main>',
});

check('pageShell rewrites a wrong-domain canonical to the brand origin', () => {
  assert.ok(rendered.includes('<link rel="canonical" href="https://coinsnearme.co/faq">'), 'canonical not corrected');
  assert.ok(!rendered.includes('coinsnearme.com'), 'stale .com domain leaked into rendered HTML');
});

check('pageShell rewrites a wrong-domain og:url to the brand origin', () => {
  assert.ok(rendered.includes('<meta property="og:url" content="https://coinsnearme.co/faq">'), 'og:url not corrected');
});

check('pageShell renders correctly when canonical is already on-brand', () => {
  const r2 = pageShell({
    config: shellConfig,
    title: 'T', description: 'D', canonical: 'https://coinsnearme.co/about',
    schema: null, body: '<main></main>',
  });
  assert.ok(r2.includes('href="https://coinsnearme.co/about"'));
});

console.log('\n=== article() — named author, author.url, datePublished/dateModified ===\n');

const art = schemas.article(
  { title: 'Coin Show Roundup', description: 'Weekly recap', created_at: '2026-07-15', updated_at: '2026-07-18', url: 'https://coinsnearme.co/blog/coin-show-roundup' },
  { siteUrl: 'https://coinsnearme.co', siteName: 'CoinsNearMe' }
);

check('article() sets @type Article', () => assert.strictEqual(art['@type'], 'Article'));
check('article() sets a named author', () => assert.ok(art.author && art.author.name && art.author.name.length > 0));
check('article() defaults author.url to /about when none supplied', () => assert.strictEqual(art.author.url, 'https://coinsnearme.co/about'));
check('article() sets datePublished (YYYY-MM-DD)', () => assert.strictEqual(art.datePublished, '2026-07-15'));
check('article() sets dateModified (YYYY-MM-DD)', () => assert.strictEqual(art.dateModified, '2026-07-18'));
check('article() sets publisher.name from siteName', () => assert.strictEqual(art.publisher.name, 'CoinsNearMe'));
check('article() falls back dateModified to datePublished when no updated_at given', () => {
  const a2 = schemas.article({ title: 'X', created_at: '2026-01-01' }, { siteUrl: 'https://coinsnearme.co', siteName: 'CoinsNearMe' });
  assert.strictEqual(a2.dateModified, '2026-01-01');
});
check('article() honors an explicit authorName/authorUrl override', () => {
  const a3 = schemas.article({ title: 'X' }, { siteUrl: 'https://coinsnearme.co', siteName: 'CoinsNearMe', authorName: 'Joe Greve', authorUrl: 'https://coinsnearme.co/about#joe' });
  assert.strictEqual(a3.author.name, 'Joe Greve');
  assert.strictEqual(a3.author.url, 'https://coinsnearme.co/about#joe');
});

console.log('\n=== homeFAQ() — homepage visible FAQ + FAQPage schema ===\n');

const sampleConfig = require(path.join(__dirname, '..', 'samples', 'coinsnearme.config'));
const homeFaqs = descriptions.homeFAQ(sampleConfig);

check('homeFAQ returns at least 3 Q&A entries', () => assert.ok(homeFaqs.length >= 3, `only got ${homeFaqs.length}`));
check('homeFAQ entries have q, a, and aText (schema/visible parity)', () => {
  homeFaqs.forEach(f => {
    assert.ok(f.q && f.q.length > 0, 'missing q');
    assert.ok(f.a && f.a.length > 0, 'missing a');
    assert.ok(f.aText && f.aText.length > 0, 'missing aText');
  });
});
check('homeFAQ output contains no unresolved template artifacts', () => {
  const joined = homeFaqs.map(f => f.q + ' ' + f.a).join(' ');
  assert.ok(!/undefined|\{[a-zA-Z]+\}/.test(joined), 'found "undefined" or unfilled {placeholder} in output');
});
check('homeFAQ uses the real brand name from config', () => {
  assert.ok(homeFaqs.some(f => f.q.includes(sampleConfig.brand.name)), 'brand name missing from generated FAQ');
});

const homeSchema = schemas.faqPage(homeFaqs.map(f => ({ q: f.q, a: f.aText })));
check('faqPage(homeFAQ(...)) produces a valid FAQPage schema', () => {
  assert.strictEqual(homeSchema['@type'], 'FAQPage');
  assert.strictEqual(homeSchema.mainEntity.length, homeFaqs.length);
  homeSchema.mainEntity.forEach(q => {
    assert.strictEqual(q['@type'], 'Question');
    assert.strictEqual(q.acceptedAnswer['@type'], 'Answer');
  });
});

console.log(`\n=== ${pass}/${pass + fail} checks passed ===\n`);
if (fail > 0) {
  console.log('Failures:');
  failures.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
  process.exit(1);
}
