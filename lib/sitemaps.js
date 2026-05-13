// ============================================================
// sitemaps.js — split-sitemap generator
// ============================================================
//
// Google's sitemap protocol allows up to 50,000 URLs per file.
// We split at 5,000 to keep each file lightweight and to make
// re-crawling targeted (when shops change, only the shops-N files
// need recrawling, not the entire sitemap).
//
// Output structure:
//   sitemap.xml             ← the index pointing at all sub-sitemaps
//   sitemap-core.xml        ← homepage, /shops, /events, /faq, etc.
//   sitemap-states.xml      ← /shops/<state>/ + /shops/<state>/<city>/
//   sitemap-events.xml      ← /events/<state>/
//   sitemap-shops-N.xml     ← /shops/<state>/<city>/<shop>/  (paginated)

const path = require('path');
const { writeFile } = require('./util');

function entry(url, priority = '0.5', changefreq = 'weekly') {
  return `<url><loc>${url}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
}

function urlsetXml(entries) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`;
}

function indexXml(sitemaps, siteUrl) {
  const today = new Date().toISOString().split('T')[0];
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map(s => `<sitemap><loc>${siteUrl}/${s}</loc><lastmod>${today}</lastmod></sitemap>`).join('\n')}
</sitemapindex>`;
}

function build({ outDir, siteUrl, coreUrls, stateUrls, cityUrls, eventUrls, shopUrls, chunkSize = 5000 }) {
  const sitemaps = [];

  // Core
  if (coreUrls && coreUrls.length) {
    writeFile(path.join(outDir, 'sitemap-core.xml'), urlsetXml(coreUrls.map(u => entry(u, '0.9', 'daily'))));
    sitemaps.push('sitemap-core.xml');
  }

  // States + cities (combined into one file — usually a few hundred URLs)
  const stateLike = (stateUrls || []).concat(cityUrls || []);
  if (stateLike.length) {
    writeFile(path.join(outDir, 'sitemap-states.xml'), urlsetXml(stateLike.map(u => entry(u, '0.7'))));
    sitemaps.push('sitemap-states.xml');
  }

  // Events
  if (eventUrls && eventUrls.length) {
    writeFile(path.join(outDir, 'sitemap-events.xml'), urlsetXml(eventUrls.map(u => entry(u, '0.7', 'daily'))));
    sitemaps.push('sitemap-events.xml');
  }

  // Shops (chunked)
  if (shopUrls && shopUrls.length) {
    for (let i = 0; i < shopUrls.length; i += chunkSize) {
      const chunk = shopUrls.slice(i, i + chunkSize);
      const filename = `sitemap-shops-${Math.floor(i / chunkSize) + 1}.xml`;
      writeFile(path.join(outDir, filename), urlsetXml(chunk.map(u => entry(u, '0.6'))));
      sitemaps.push(filename);
    }
  }

  // Sitemap index + robots.txt
  writeFile(path.join(outDir, 'sitemap.xml'), indexXml(sitemaps, siteUrl));
  writeFile(path.join(outDir, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`);

  return sitemaps;
}

module.exports = { build };
