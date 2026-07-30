// ============================================================
// schemas/index.js — schema.org JSON-LD generators
// ============================================================
//
// Each function returns a plain JS object. The page template
// JSON-stringifies it into a <script type="application/ld+json">.
//
// schema.org types we use:
//   - LocalBusiness (per-shop pages)
//   - BreadcrumbList (every page that's not the homepage)
//   - FAQPage (per-shop pages, with visible FAQ section that mirrors the schema)
//   - ItemList (state and city listing pages)
//   - Event (per-state event pages)
//
// Why JSON-LD: Google's preferred format. One <script> block per type,
// no HTML markup pollution. The visible content on the page should
// mirror what's in the schema (Google penalizes mismatch).

function localBusiness(shop, { siteUrl, canonical, descriptionShort }) {
  const out = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: shop.name,
    address: {
      '@type': 'PostalAddress',
      streetAddress: shop.address || '',
      addressLocality: shop.city || '',
      addressRegion: shop.state || '',
      postalCode: shop.zip || '',
      addressCountry: shop.country || 'US',
    },
    url: shop.website || canonical,
    description: descriptionShort,
  };
  if (shop.phone) out.telephone = shop.phone;
  // openingHours: only emit when the value contains a digit, so free-text
  // placeholders like "Call ahead" or "Varies" are skipped — keeps the
  // schema clean and avoids feeding Google non-hours text.
  if (shop.hours && /\d/.test(String(shop.hours))) {
    out.openingHours = String(shop.hours);
  }
  // priceRange: emit only when the data exists on the shop record.
  const priceRange = shop.price_range || shop.priceRange;
  if (priceRange) out.priceRange = String(priceRange);
  if (shop.totalScore || shop.total_score) {
    out.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: shop.totalScore || shop.total_score,
      reviewCount: shop.reviewsCount || shop.reviews_count || 1,
    };
  }
  if (shop.lat && shop.lng) {
    out.geo = {
      '@type': 'GeoCoordinates',
      latitude: shop.lat,
      longitude: shop.lng,
    };
  }
  return out;
}

function breadcrumbList(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

function faqPage(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.a,
      },
    })),
  };
}

function itemList(name, description, urls) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    description: (description || '').slice(0, 300),
    numberOfItems: urls.length,
    itemListElement: urls.map((url, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url,
    })),
  };
}

// parseAdmissionPrice — turn a free-text admission string into a numeric
// schema.org price, or null when no defensible number can be read.
//
// Google expects `offers.price` to be a number. The old behavior emitted the
// raw admission string (e.g. "$1/non-perishable food item") and treated ANY
// string containing "free" as price 0 — which mis-priced real paid shows like
// "$5 entry, 12 & under free" as free. Read the first currency amount first,
// and only fall back to 0 when the text has no amount at all.
function parseAdmissionPrice(admission) {
  const raw = String(admission == null ? '' : admission).trim();
  if (!raw) return null;
  const amount = raw.match(/\$?\s*(\d+(?:\.\d{1,2})?)/);
  if (amount) return amount[1];
  if (/\bfree\b/i.test(raw)) return '0';
  return null;
}

function event(ev, { stateNameStr, defaultDescription, siteName, siteUrl }) {
  // Google requires `location` on Event. An event with neither a venue name
  // nor a street address cannot produce a valid Place — city + state alone is
  // not an acceptable location — so emit no schema at all rather than invalid
  // schema. Callers must filter these nulls out before serializing.
  const hasVenue = ev.venue != null && String(ev.venue).trim() !== '';
  const hasAddress = ev.address != null && String(ev.address).trim() !== '';
  if (!hasVenue && !hasAddress) return null;

  const sch = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: ev.name,
    startDate: ev.start_date,
    endDate: ev.end_date || ev.start_date,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location: {
      '@type': 'Place',
      name: ev.venue || ev.city || '',
      address: {
        '@type': 'PostalAddress',
        addressLocality: ev.city || '',
        addressRegion: ev.state || '',
        addressCountry: ev.country || 'US',
        streetAddress: ev.address || '',
      },
    },
    description: ev.description || defaultDescription,
  };
  if (ev.website) sch.url = ev.website;
  if (siteUrl) sch.image = [`${siteUrl}/og-default.png`];
  sch.organizer = {
    '@type': 'Organization',
    name: ev.venue || siteName || 'Coastal Directory LLC',
    url: ev.website || siteUrl || 'https://coastaldirectoryllc.com',
  };
  sch.performer = {
    '@type': 'PerformingGroup',
    name: 'Featured vendors & special guests',
  };
  const admissionPrice = parseAdmissionPrice(ev.admission);
  if (admissionPrice !== null) {
    sch.offers = {
      '@type': 'Offer',
      price: admissionPrice,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    };
    if (ev.website) sch.offers.url = ev.website;
    const validFrom = ev.created_at || ev.start_date;
    if (validFrom) sch.offers.validFrom = String(validFrom).slice(0, 10);
  }
  return sch;
}

// ------------------------------------------------------------
// article — Article schema for blog / daily-feed / city-guide posts
// ------------------------------------------------------------
//
// Named author + author.url (real bio page) + datePublished/
// dateModified — freshness + attribution signals that Perplexity/AI
// Overviews favor. `post` fields are read loosely (snake_case or
// camelCase) since callers pull from Supabase rows or config-authored
// post objects interchangeably.

function article(post, { siteUrl, siteName, authorName, authorUrl } = {}) {
  const published = post.datePublished || post.published_at || post.created_at || post.date;
  const modified = post.dateModified || post.updated_at || published;
  const resolvedAuthorUrl = authorUrl || (siteUrl ? `${siteUrl}/about` : undefined);

  const sch = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title || post.headline || '',
    description: post.description || post.summary || '',
    author: {
      '@type': 'Person',
      name: authorName || post.authorName || post.author || siteName || 'Editorial Team',
    },
    publisher: {
      '@type': 'Organization',
      name: siteName || '',
      url: siteUrl || '',
    },
  };
  if (resolvedAuthorUrl) sch.author.url = resolvedAuthorUrl;
  if (published) sch.datePublished = String(published).slice(0, 10);
  if (modified) sch.dateModified = String(modified).slice(0, 10);
  if (post.image) sch.image = [post.image];
  const pageUrl = post.url || (siteUrl ? siteUrl : undefined);
  if (pageUrl) sch.mainEntityOfPage = { '@type': 'WebPage', '@id': pageUrl };
  return sch;
}

module.exports = { localBusiness, breadcrumbList, faqPage, itemList, event, article };
