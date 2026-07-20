#!/usr/bin/env node
// ============================================================
// scripts/build-home-faq.js
// ============================================================
//
// Renders a paste-ready visible FAQ <section> + FAQPage JSON-LD
// <script> tag for a site's homepage, from that site's config.
// Output goes to stdout — redirect to a file or paste directly
// into index.html (<section> into <main>, <script> into <head>).
//
// Usage:
//   node scripts/build-home-faq.js ../CoinsNearMe/site.config.js
//   node scripts/build-home-faq.js samples/coinsnearme.config.js

const path = require('path');
const { homeFAQ } = require('../lib/descriptions');
const { faqPage } = require('../lib/schemas');

const configPath = process.argv[2];
if (!configPath) {
  console.error('Usage: node scripts/build-home-faq.js <path-to-site.config.js>');
  process.exit(1);
}

const config = require(path.resolve(process.cwd(), configPath));
const faqs = homeFAQ(config);

const visible = `<section class="home-faq">
 <h2>Frequently asked questions</h2>
${faqs.map(f => ` <h3>${f.q}</h3>\n <p>${f.a}</p>`).join('\n')}
</section>`;

const schema = faqPage(faqs.map(f => ({ q: f.q, a: f.aText || f.a })));
const schemaTag = `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;

console.log('--- Paste into <main> ---\n');
console.log(visible);
console.log('\n--- Paste into <head> ---\n');
console.log(schemaTag);
