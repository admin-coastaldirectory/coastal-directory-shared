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

// ------------------------------------------------------------
// isAggregatorUrl — flags scrape-source URLs that should NEVER be
// published as an event's canonical url/organizer/offers link.
// ------------------------------------------------------------
//
// Scraped event rows sometimes store the calendar page they were
// pulled from (e.g. numismaticnews.net/events/show-calendar) in the
// `website` field, rather than the show's own page. Surfacing that as
// Event.url / organizer.url tells Google and AI engines that a
// third-party aggregator is the canonical source for OUR event data —
// actively harmful for GEO. Add a domain here any time a new
// aggregator-sourced feed shows the same pattern.
const AGGREGATOR_DOMAINS = ['numismaticnews.net'];

function isAggregatorUrl(url) {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return AGGREGATOR_DOMAINS.some(d => host === d || host.endsWith('.' + d));
  } catch (e) {
    return false;
  }
}

// ------------------------------------------------------------
// parseAdmissionPrice — turns a free-text admission string into a
// single schema.org-safe price, or null when it can't be done
// honestly.
// ------------------------------------------------------------
//
// Offer.price must be one number. Source data ranges from "Free", to a
// single "$5", to compound/tiered strings ("$5 entry, 12 & under free",
// "$8/day, $12 3-day"). Two failure modes to avoid:
//   1. Treating ANY string containing "free" as price 0 — that mis-prices
//      "$5 entry, 12 & under free" as free when it's actually a $5 show.
//   2. Forcing a genuinely tiered price ("$8/day, $12 3-day") into a single
//      number — that's a guess, not a fact, so we omit `offers` entirely
//      rather than publish a misleading price.
// Fix: strip parentheticals (so "$6 (under 16 free)" reads as just "$6"),
// then look for dollar amounts. Exactly one -> that's the price. More than
// one outside parens -> genuinely tiered, don't guess -> null. None at all
// -> fall back to a plain "free" match -> '0'. Otherwise -> null.
function parseAdmissionPrice(admission) {
  const raw = String(admission == null ? '' : admission).trim();
  if (!raw) return null;
  const stripped = raw.replace(/\([^)]*\)/g, '').trim();
  const matches = stripped.match(/\$\s*(\d+(?:\.\d{1,2})?)/g);
  if (matches && matches.length === 1) return matches[0].replace(/[^\d.]/g, '');
  if (matches && matches.length > 1) return null;
  if (/\bfree\b/i.test(stripped)) return '0';
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

  // Never publish a scrape-source aggregator URL as this event's canonical
  // url/organizer/offers link — see isAggregatorUrl above.
  const eventUrl = isAggregatorUrl(ev.website) ? null : ev.website;
  const currency = ev.country === 'CA' ? 'CAD' : 'USD';

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
  if (eventUrl) sch.url = eventUrl;
  if (siteUrl) sch.image = [`${siteUrl}/og-default.png`];
  sch.organizer = {
    '@type': 'Organization',
    name: ev.venue || siteName || 'Coastal Directory LLC',
    url: eventUrl || siteUrl || 'https://coastaldirectoryllc.com',
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
      priceCurrency: currency,
      availability: 'https://schema.org/InStock',
    };
    if (eventUrl) sch.offers.url = eventUrl;
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

module.exports = { localBusiness, breadcrumbList, faqPage, itemList, event, article, isAggregatorUrl, parseAdmissionPrice };
