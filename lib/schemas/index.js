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

function event(ev, { stateNameStr, defaultDescription }) {
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
  if (ev.admission) {
    sch.offers = {
      '@type': 'Offer',
      price: /free/i.test(ev.admission) ? '0' : ev.admission,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    };
  }
  return sch;
}

module.exports = { localBusiness, breadcrumbList, faqPage, itemList, event };
