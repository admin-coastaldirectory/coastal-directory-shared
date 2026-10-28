// ============================================================
// templates/listing-page.js — state and city listing pages
// ============================================================
//
// State pages and city pages are both wide-format listing pages
// (max-width 1100 via .content-wide). Layouts:
//
//   STATE page
//     .page-intro            breadcrumb, eyebrow, h1, lede
//     main.content.content-wide
//       intro paragraphs
//       "Browse <state> shops by city"  card-grid of city-cards
//       "All <shop>s in <state>"        card-grid of shop-cards
//       optional events list
//       "Find shops in nearby states"   neighbor links
//
//   CITY page
//     .page-intro            breadcrumb, eyebrow, h1, lede
//     main.content.content-wide
//       intro paragraphs
//       "All <n> <shop>s in <city>"     card-grid
//       outline btn back to state page
//
// Schemas: ItemList, BreadcrumbList. Event state pages also emit
// per-event Event schema.

const { escHtml, escAttr, slugify, titleCase, truncateTitle, clampText } = require('../util');
const { stateName, neighborsOf } = require('../states');
const { pageShell, shopCard: baseShopCard, eventCard } = require('./shell');
const { compactHours, HOURS_TODAY_SCRIPT } = require('../hours');
const { parseHours, hourFacts } = require('../shop-insights');
const { credentialChips, cityCredentialsSection } = require('../credentials');
const schemas = require('../schemas');
const descriptions = require('../descriptions');

// ------------------------------------------------------------
// Rich shop cards (added 2026-10-26)
// ------------------------------------------------------------
// The facts a searcher compares on a list page: Google rating, street
// address and phone. Yelp and Comic Shop Locator, which hold the top results
// for "<shop type>s in <city>", show these on the list itself; our cards
// showed only name + city, so to Google the page read as a list of names.
// Added here around shell.js's shopCard (plain text inside the card's <a>,
// inline styles) so the shared shell is untouched; shop-page.js's own
// nearby-shop cards keep the plain card.

// Street line of an address: the first comma part that has a number in it
// ("Lower Level, 151 Middle St" -> "151 Middle St"), else the first part.
function streetLine(address) {
  const parts = String(address || '').split(',').map(x => x.trim()).filter(Boolean);
  return parts.find(x => /\d/.test(x)) || parts[0] || '';
}

// US/Canada numbers to (713) 780-0675; anything else as stored.
function prettyPhone(phone) {
  const raw = String(phone || '').trim();
  if (!raw) return '';
  const d = raw.replace(/\D/g, '');
  const ten = d.length === 11 && d[0] === '1' ? d.slice(1) : d;
  return ten.length === 10 ? `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}` : raw;
}

function cardFacts(shop) {
  const score = Number(shop.total_score != null ? shop.total_score : shop.totalScore) || 0;
  const reviews = Number(shop.reviews_count != null ? shop.reviews_count : shop.reviewsCount) || 0;
  return {
    score, reviewsN: reviews,
    rating: score > 0 && reviews > 0 ? score.toFixed(1) : '',
    reviews: reviews.toLocaleString('en-US'),
    street: streetLine(shop.address),
    phone: prettyPhone(shop.phone),
  };
}

// The .loc div stays text-only: other scripts read and extend it.
function shopCard(shop, config, stSlug) {
  // Cards stores what a shop carries as category codes (sports, pokemon…)
  // rather than services; tag the card with those when services is empty.
  const tagged = (!(shop.services && shop.services.length) && Array.isArray(shop.categories))
    ? Object.assign({}, shop, { services: shop.categories.map(c => String(c).trim().toLowerCase()) })
    : shop;
  const html = baseShopCard(tagged, config, stSlug);
  const f = cardFacts(shop);
  const rating = f.rating
    ? `<div class="rating" style="font-size:13px;color:#333;margin:0 0 4px"><span style="color:#c9971c" aria-hidden="true">&#9733;</span> ${f.rating} <span style="color:#777">(${f.reviews} Google reviews)</span></div>\n  `
    : '';
  const phone = f.phone ? `\n  <div class="phone" style="font-size:13px;color:#555;margin:-6px 0 10px">${escHtml(f.phone)}</div>` : '';
  // Hours (2026-10-27): a static week fact ("Open 7 days a week") that the
  // page script swaps for today's hours + open/closed in the browser.
  const h = compactHours(shop.hours);
  const weekFact = h ? (hourFacts(parseHours(shop.hours))[0] || '') : '';
  const hours = h ? `\n  <div class="hours" style="font-size:13px;color:#555;margin:-6px 0 10px"><span class="hours-today" data-h="${h}">${escHtml(weekFact)}</span></div>` : '';
  return html.replace(/(<\/h3>\s*)<div class="loc">([^<]*)<\/div>/, (m, h3, loc) =>
    `${h3}${rating}<div class="loc">${f.street ? escHtml(f.street) + ', ' : ''}${loc}</div>${phone}${hours}${credentialChips(shop) ? '\n  ' + credentialChips(shop) : ''}`);
}

// Listing order for state and city pages (changed 2026-10-17, was A-Z):
// paid Featured first, then owner-verified, then "winners" — shops whose own
// page Google already shows (gsc_impr_90d, loaded from Search Console) — then
// shops with a written description, then review volume, then A-Z.
// Pages Google already likes get the strongest internal links; columns that a
// site doesn't have yet are treated as 0, so the order degrades to reviews/A-Z.
function shopListOrder(a, b) {
  if (!!a.featured !== !!b.featured) return b.featured ? 1 : -1;
  if (!!a.owner_verified !== !!b.owner_verified) return b.owner_verified ? 1 : -1;
  const gi = (Number(b.gsc_impr_90d) || 0) - (Number(a.gsc_impr_90d) || 0);
  if (gi) return gi;
  const ad = a.description && String(a.description).trim() ? 1 : 0;
  const bd = b.description && String(b.description).trim() ? 1 : 0;
  if (ad !== bd) return bd - ad;
  const ar = Number(a.reviews_count != null ? a.reviews_count : a.reviewsCount) || 0;
  const br = Number(b.reviews_count != null ? b.reviews_count : b.reviewsCount) || 0;
  if (ar !== br) return br - ar;
  return (a.name || '').localeCompare(b.name || '');
}

// "Best-rated <shops> in <city>": a ranked top 5 at the top of a city page
// (added 2026-10-26). Yelp's "TOP 10 BEST ... in <city>" holds the #1 result
// for these searches on all three verticals; our page had no ranking at all.
// Score = Google rating pulled toward 4.5 until a shop has ~25 reviews
// (Bayesian average), so 3 perfect reviews can't outrank 1,000 good ones.
// Same weighting as Coins' Quick picks (scripts/enrich-city-pages.js), which
// removes this block on the pages where it adds its own.
const TOP_PRIOR_M = 25;
const TOP_PRIOR_C = 4.5;
const TOP_MIN_REVIEWS = 10;

function topRatedHtml(city, shops, config, stSlug, citySlug, pluralOverride) {
  const niche = config.niche || {};
  const plural = pluralOverride || (niche.shopTypePluralCapitalized ? niche.shopTypePluralCapitalized.toLowerCase() : ((niche.shopType || 'shop') + 's'));
  const ranked = shops
    .map(s => ({ s, f: cardFacts(s) }))
    .filter(x => x.f.score > 0 && x.f.reviewsN >= TOP_MIN_REVIEWS)
    .map(x => Object.assign(x, { w: (x.f.reviewsN / (x.f.reviewsN + TOP_PRIOR_M)) * x.f.score + (TOP_PRIOR_M / (x.f.reviewsN + TOP_PRIOR_M)) * TOP_PRIOR_C }))
    .sort((a, b) => b.w - a.w || b.f.reviewsN - a.f.reviewsN);
  if (ranked.length < 3) return '';
  const top = ranked.slice(0, 5);
  const items = top.map(({ s, f }) => {
    const slug = s.slug || slugify((s.name || '') + '-' + (s.city || ''));
    const meta = [`&#9733; ${f.rating}`, `${f.reviews} Google reviews`, f.street ? escHtml(f.street) : '', f.phone ? escHtml(f.phone) : ''].filter(Boolean).join(' &middot; ');
    return `<li><a href="/shops/${stSlug}/${citySlug}/${escAttr(slug)}/">${escHtml(s.name)}</a><span class="tr-meta">${meta}</span></li>`;
  }).join('\n');
  return `<!-- top-rated:start -->
<section class="top-rated" data-top-rated style="background:#fff;border:1px solid #ebebeb;border-radius:12px;padding:20px 24px;margin:8px 0 28px">
<h2 style="margin-top:0">Best-rated ${plural} in ${escHtml(city)}</h2>
<p style="font-size:14px;color:#555;margin:0 0 12px">Ranked by Google rating, weighted by number of reviews, so a shop with three perfect reviews can't outrank one with hundreds. Shops with fewer than ${TOP_MIN_REVIEWS} reviews aren't ranked. Ratings from Google Maps.</p>
<ol style="margin:0;padding-left:22px;line-height:1.5">
${items}
</ol>
<style>.top-rated li{margin:0 0 10px}.top-rated li a{font-weight:600}.top-rated .tr-meta{display:block;font-size:13px;color:#666}</style>
</section>
<!-- top-rated:end -->`;
}

// ============================================================
// STATE PAGE
// ============================================================

function statePage(stateCode, shops, events, config) {
  const niche = config.niche || {};
  const sn = stateName(stateCode);
  const stSlug = slugify(sn);
  const canonical = `${config.brand.fullUrl}/shops/${stSlug}/`;

  // Sort: featured, owner-verified, then winners first (see shopListOrder).
  shops = shops.slice().sort(shopListOrder);

  const shopTypeLabel = niche.shopType || 'shop';
  const shopTypePlural = niche.shopTypePluralCapitalized
    ? niche.shopTypePluralCapitalized.toLowerCase()
    : (shopTypeLabel + 's');
  const shopTypePluralCap = niche.shopTypePluralCapitalized
    || titleCase(shopTypeLabel + 's');

  // Group by city to build the city-link grid.
  const byCity = {};
  for (const s of shops) {
    const c = s.city || 'Other';
    if (!byCity[c]) byCity[c] = [];
    byCity[c].push(s);
  }

  const minShopsForCityPage = (config.thresholds && config.thresholds.minShopsForCityPage) || 2;
  const cityLinks = Object.keys(byCity).sort()
    .filter(c => byCity[c].length >= minShopsForCityPage)
    .map(c => {
      const slug = slugify(c) || 'other';
      return `<a href="/shops/${stSlug}/${slug}/" class="shop-card city-card">
  <h3>${escHtml(c)}</h3>
  <div class="loc">${byCity[c].length} ${shopTypePlural}</div>
</a>`;
    }).join('\n');

  // State events block.
  const stateEvents = (events || []).filter(e => e.state === stateCode);
  const evHtml = stateEvents.length
    ? `<h2>Upcoming events in ${sn}</h2>
<div class="card-grid" style="grid-template-columns:1fr">${stateEvents.slice(0, 10).map(eventCard).join('\n')}</div>`
    : '';

  // Neighboring-states block (topical authority).
  const neighborCodes = neighborsOf(stateCode);
  const neighborHtml = neighborCodes.length
    ? `<h2>Find ${shopTypePlural} in nearby states</h2>
<p>Looking beyond ${sn}? Browse ${shopTypePlural} in neighboring states and provinces:</p>
<div class="neighbors">${neighborCodes.map(c =>
  `<a href="/shops/${slugify(stateName(c))}/" class="neighbor-link">${escHtml(stateName(c))}</a>`
).join('')}</div>`
    : '';

  const desc = descriptions.stateMetaDescription(stateCode, shops, config);
  const introHtml = descriptions.stateIntroHtml(stateCode, shops, config);

  const faqs = descriptions.stateFAQ(stateCode, shops, config);
  // `f.a` is pre-escaped HTML; `f.aText` is the plain text used for the schema.
  const faqHtml = faqs.length
    ? `<h2>Frequently asked questions about ${shopTypePlural} in ${sn}</h2>\n`
      + faqs.map(f => `<h3>${escHtml(f.q)}</h3><p>${f.a}</p>`).join('\n')
    : '';
  const faqSchema = faqs.length
    ? schemas.faqPage(faqs.map(f => ({ q: f.q, a: f.aText })))
    : null;

  const body = `
<section class="page-intro">
 <div class="wrap">
  <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/shops/">Shops</a> / ${sn}</nav>
  <div class="eyebrow">${shops.length} ${shopTypePlural} in ${sn}</div>
  <h1>${shopTypePluralCap} in ${sn}</h1>
  <p class="lede">${escHtml(desc)}</p>
 </div>
</section>
<main class="content content-wide">
 ${introHtml}
 ${cityLinks ? `<h2>Browse ${sn} ${shopTypePlural} by city</h2>\n<div class="card-grid">${cityLinks}</div>` : ''}
 <h2>All ${shopTypePlural} in ${sn}</h2>
 <div class="card-grid">${shops.map(s => shopCard(s, config, stSlug)).join('\n')}</div>
 ${evHtml}
 ${faqHtml}
 ${neighborHtml}
</main>`;

  const itemListSchema = schemas.itemList(
    `${shopTypePluralCap} in ${sn}`,
    desc,
    shops.slice(0, 20).map(s => {
      const cs = slugify(s.city || 'Other') || 'other';
      const ss = s.slug || slugify((s.name || '') + '-' + (s.city || ''));
      return `${config.brand.fullUrl}/shops/${stSlug}/${cs}/${ss}/`;
    })
  );
  const breadcrumbSchema = schemas.breadcrumbList([
    { name: 'Home', url: config.brand.fullUrl + '/' },
    { name: 'Shops', url: config.brand.fullUrl + '/shops/' },
    { name: sn, url: canonical },
  ]);

  const title = truncateTitle(`${shopTypePluralCap} in ${sn} — ${shops.length} Verified`);

  const html = pageShell({
    config,
    title,
    description: desc,
    canonical,
    schema: [itemListSchema, breadcrumbSchema, faqSchema],
    body: body + (body.includes('hours-today') ? HOURS_TODAY_SCRIPT : ''),
    showCdn: false,
  });

  return { html, canonical };
}

// ============================================================
// CITY PAGE
// ============================================================

function cityPage(city, stateCode, shops, config, siblingCities, categoryLinks) {
  const niche = config.niche || {};
  const sn = stateName(stateCode);
  const stSlug = slugify(sn);
  const citySlug = slugify(city) || 'other';
  const canonical = `${config.brand.fullUrl}/shops/${stSlug}/${citySlug}/`;

  shops = shops.slice().sort(shopListOrder);

  const shopTypeLabel = niche.shopType || 'shop';
  const shopTypePlural = niche.shopTypePluralCapitalized
    ? niche.shopTypePluralCapitalized.toLowerCase()
    : (shopTypeLabel + 's');
  const shopTypePluralCap = niche.shopTypePluralCapitalized
    || titleCase(shopTypeLabel + 's');

  const desc = descriptions.cityMetaDescription(city, stateCode, shops, config);
  const introHtml = descriptions.cityIntroHtml(city, stateCode, shops, config);

  const faqs = descriptions.cityFAQ(city, stateCode, shops, config);
  // `f.a` is pre-escaped HTML (with an inline link); `f.aText` is plain text for the schema.
  const faqHtml = faqs.length
    ? `<h2>Frequently asked questions about ${shopTypePlural} in ${escHtml(city)}</h2>\n`
      + faqs.map(f => `<h3>${escHtml(f.q)}</h3><p>${f.a}</p>`).join('\n')
    : '';
  const faqSchema = faqs.length
    ? schemas.faqPage(faqs.map(f => ({ q: f.q, a: f.aText })))
    : null;

  const otherCities = (siblingCities || [])
    .filter(c => c.slug !== citySlug)
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);
  const nearbyCitiesHtml = otherCities.length
    ? `<h2>${shopTypePluralCap} in other ${sn} cities</h2>\n`
      + `<p>Browse ${shopTypePlural} in other cities and towns across ${sn}:</p>\n`
      + `<div class="neighbors">`
      + otherCities.map(c => `<a href="/shops/${stSlug}/${c.slug}/" class="neighbor-link">${escHtml(c.name)}</a>`).join('')
      + `</div>`
    : '';

  // Tier 3 — selling / appraisal intent section (uses real directory counts).
  // Copy is niche-driven via config.niche.sell; defaults reproduce the original coin wording.
  const sell = niche.sell || {};
  const sellNoun = sell.noun || 'coins';
  const sellItems = sell.items || 'coins, paper currency, and entire collections';
  const sellAdvice = sell.advice || 'and never clean a coin beforehand, since cleaning lowers its value';
  const sellShopArticle = niche.shopTypeArticle || 'a';
  const buyers = shops.filter(s => (s.services || []).includes('buy-sell')).length;
  const appraisers = shops.filter(s => (s.services || []).includes('appraisals')).length;
  const sellLine = buyers
    ? `${buyers} of the ${shops.length} ${shopTypePlural} listed here buy ${sellItems}`
    : `Many ${shopTypePlural} in ${escHtml(city)} buy ${sellItems}`;
  const apprLine = appraisers ? `, and ${appraisers} offer in-person appraisals` : '';
  const sellAppraiseHtml =
    `<h2>Selling or appraising ${sellNoun} in ${escHtml(city)}?</h2>\n`
    + `<p>${sellShopArticle.charAt(0).toUpperCase()}${sellShopArticle.slice(1)} ${shopTypeLabel} isn't only for buying. ${sellLine}${apprLine}. `
    + `If you're thinking of selling, it's worth getting an appraisal first so you know what your ${sellNoun} are really worth — ${sellAdvice}. `
    + `Call ahead to confirm the shop is buying right now, and ask whether there's a fee for an appraisal.</p>`;

  // "Browse by what they carry" — links to this city's category pages
  // (Cards: /shops/<state>/<city>/pokemon/ …). Only categories that got a
  // page are passed in, so these links never 404.
  const catLinksHtml = (categoryLinks && categoryLinks.length)
    ? `<h2>Browse ${shopTypePlural} in ${escHtml(city)} by what they carry</h2>\n<div class="neighbors">`
      + categoryLinks.map(c => `<a href="/shops/${stSlug}/${citySlug}/${c.slug}/" class="neighbor-link">${escHtml(c.title)} (${c.count})</a>`).join('')
      + `</div>`
    : '';

  const body = `
<section class="page-intro">
 <div class="wrap">
  <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/shops/">Shops</a> / <a href="/shops/${stSlug}/">${sn}</a> / ${escHtml(city)}</nav>
  <div class="eyebrow">${shops.length} ${shopTypePlural}</div>
  <h1>${shopTypePluralCap} in ${escHtml(city)}, ${sn}</h1>
  <p class="lede">${escHtml(desc)}</p>
 </div>
</section>
<main class="content content-wide">
 ${introHtml}
 ${topRatedHtml(city, shops, config, stSlug, citySlug)}
 ${cityCredentialsSection(city, shops, stSlug, citySlug, shopTypePlural)}
 ${catLinksHtml}
 <h2>All ${shops.length} ${shopTypePlural} in ${escHtml(city)}</h2>
 <div class="card-grid">${shops.map(s => shopCard(s, config, stSlug)).join('\n')}</div>
 <p style="margin-top:30px"><a href="/shops/${stSlug}/" class="btn outline">View all ${shopTypePlural} in ${sn} →</a></p>
 ${nearbyCitiesHtml}
 ${sellAppraiseHtml}
 ${faqHtml}
</main>`;

  const itemListSchema = schemas.itemList(
    `${shopTypePluralCap} in ${city}, ${sn}`,
    desc,
    shops.map(s => {
      const ss = s.slug || slugify((s.name || '') + '-' + (s.city || ''));
      return `${config.brand.fullUrl}/shops/${stSlug}/${citySlug}/${ss}/`;
    })
  );
  const breadcrumbSchema = schemas.breadcrumbList([
    { name: 'Home', url: config.brand.fullUrl + '/' },
    { name: 'Shops', url: config.brand.fullUrl + '/shops/' },
    { name: sn, url: `${config.brand.fullUrl}/shops/${stSlug}/` },
    { name: city, url: canonical },
  ]);

  const title = truncateTitle(`${shopTypePluralCap} in ${city}, ${sn} — ${shops.length} Shops`);

  const html = pageShell({
    config,
    title,
    description: desc,
    canonical,
    schema: [itemListSchema, breadcrumbSchema, faqSchema],
    body: body + (body.includes('hours-today') ? HOURS_TODAY_SCRIPT : ''),
    showCdn: false,
  });

  return { html, canonical };
}

// ============================================================
// CITY × CATEGORY PAGE  (added 2026-10-27, Cards competitor review)
// ============================================================
//
// /shops/<state>/<city>/<category>/ — e.g. "Pokémon Card Shops in Houston".
// Competitors rank for "<category> card shop <city>" with pages built for
// exactly that search; our city page mixed every kind of shop together.
// Only built when config.niche.categoryPages is set (Cards), only for
// categories with enough shops, and never when every shop in the city
// carries the category (that page would just repeat the city page).
//
// cat     { code, slug, title, noun, label?, phrase?, faqNoun? }   e.g. { code:'pokemon', slug:'pokemon',
//                                         title:'Pokémon Card Shops', noun:'Pokémon cards' }
// shops   the shops in this city that carry it
// extras  { cityTotal, otherCats:[{slug,title,count}], otherCities:[{name,slug,count}] }

function shopCategories(s) {
  return (Array.isArray(s.categories) ? s.categories : []).map(c => String(c).trim().toLowerCase());
}

function categoryPage(city, stateCode, cat, shops, config, extras = {}) {
  const niche = config.niche || {};
  const sn = stateName(stateCode);
  const stSlug = slugify(sn);
  const citySlug = slugify(city) || 'other';
  const canonical = `${config.brand.fullUrl}/shops/${stSlug}/${citySlug}/${cat.slug}/`;
  const n = shops.length;
  const cityTotal = extras.cityTotal || n;
  // Mid-sentence form: "Pokémon card shops", "sports card shops" (config may set cat.phrase).
  const titleLower = cat.phrase || (cat.title.charAt(0) + cat.title.slice(1).replace(/\b(Card|Shops|Stores|Shop|Store)\b/g, m => m.toLowerCase()));
  const shopTypePlural = niche.shopTypePluralCapitalized
    ? niche.shopTypePluralCapitalized.toLowerCase() : ((niche.shopType || 'shop') + 's');

  shops = shops.slice().sort(shopListOrder);

  // Real facts about this set of shops (no invented claims).
  const rated = shops.map(s => ({ s, f: cardFacts(s) })).filter(x => x.f.score > 0 && x.f.reviewsN >= 10);
  const best = rated.slice().sort((a, b) => {
    const w = x => (x.f.reviewsN / (x.f.reviewsN + TOP_PRIOR_M)) * x.f.score + (TOP_PRIOR_M / (x.f.reviewsN + TOP_PRIOR_M)) * TOP_PRIOR_C;
    return w(b) - w(a);
  })[0];
  const sundayOpen = shops.filter(s => {
    const h = compactHours(s.hours);
    if (!h) return false;
    const sun = h.split('|')[6];
    return sun && sun !== 'x';
  }).length;
  const withHours = shops.filter(s => compactHours(s.hours)).length;
  const badge = niche.serviceBadge || {};
  const alsoCounts = {};
  for (const s of shops) for (const c of new Set(shopCategories(s))) {
    if (c !== cat.code && badge[c] && c !== 'tcg') alsoCounts[c] = (alsoCounts[c] || 0) + 1;
  }
  const also = Object.entries(alsoCounts).sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([c, k]) => `${k} also carry ${/^(Sports|Trading) cards$/.test(badge[c]) ? badge[c].toLowerCase() : badge[c]}`);

  const facts = [];
  facts.push(`Of the ${cityTotal} ${shopTypePlural} we list in ${escHtml(city)}, ${n} carry ${escHtml(cat.noun)}.`);
  if (also.length) facts.push(`Of those, ${also.join(', ')}.`);
  if (best) facts.push(`The best-rated is <a href="/shops/${stSlug}/${citySlug}/${escAttr(best.s.slug || slugify((best.s.name || '') + '-' + (best.s.city || '')))}/">${escHtml(best.s.name)}</a> (&#9733; ${best.f.rating} from ${best.f.reviews} Google reviews).`);
  if (withHours) facts.push(sundayOpen
    ? (withHours < n
      ? `${sundayOpen} of the ${withHours} with posted hours ${sundayOpen === 1 ? 'is' : 'are'} open on Sundays.`
      : `${sundayOpen} ${sundayOpen === 1 ? 'is' : 'are'} open on Sundays.`)
    : `None of the ${withHours} with posted hours open on Sundays.`);
  const introHtml = `<p>${facts.join(' ')} Each listing shows today's hours, phone number and directions; stock changes fast, so call ahead if you're after a specific set or card.</p>`;

  const desc = clampText(`${n} ${titleLower} in ${city}, ${stateCode}`
    + (best ? `, including ${best.s.name} (${best.f.rating}★)` : '')
    + `. Compare Google ratings, today's hours, phone numbers and directions.`, 158);

  // FAQ from the same real numbers.
  const faqs = [];
  faqs.push({
    q: `How many ${titleLower} are in ${city}?`,
    aText: `We list ${n} ${shopTypePlural} in ${city}, ${sn} that carry ${cat.noun}, out of ${cityTotal} ${shopTypePlural} in the city.`,
  });
  if (best) faqs.push({
    q: `What is the best-rated ${cat.faqNoun || titleLower.replace(/s$/, '')} in ${city}?`,
    aText: `${best.s.name} has the strongest Google rating among ${city}'s ${titleLower}: ${best.f.rating} stars from ${best.f.reviews} reviews.`,
  });
  if (withHours) faqs.push({
    q: `Are any ${titleLower} in ${city} open on Sunday?`,
    aText: sundayOpen
      ? `Yes. ${sundayOpen} of the ${n} ${titleLower} in ${city} list Sunday hours. Check each listing for today's hours.`
      : `None of the ${titleLower} in ${city} with posted hours are open on Sunday. Saturday is your best bet.`,
  });
  const faqHtml = `<h2>Frequently asked questions</h2>\n` + faqs.map(f => `<h3>${escHtml(f.q)}</h3><p>${escHtml(f.aText)}</p>`).join('\n');

  const otherCats = extras.otherCats || [];
  const otherCatsHtml = `<h2>More ${shopTypePlural} in ${escHtml(city)}</h2>\n<div class="neighbors">`
    + `<a href="/shops/${stSlug}/${citySlug}/" class="neighbor-link">All ${cityTotal} ${shopTypePlural}</a>`
    + otherCats.map(c => `<a href="/shops/${stSlug}/${citySlug}/${c.slug}/" class="neighbor-link">${escHtml(c.title)} (${c.count})</a>`).join('')
    + `</div>`;
  const otherCities = (extras.otherCities || []).filter(c => c.slug !== citySlug).sort((a, b) => b.count - a.count).slice(0, 15);
  const otherCitiesHtml = otherCities.length
    ? `<h2>${escHtml(cat.title)} in other ${sn} cities</h2>\n<div class="neighbors">`
      + otherCities.map(c => `<a href="/shops/${stSlug}/${c.slug}/${cat.slug}/" class="neighbor-link">${escHtml(c.name)} (${c.count})</a>`).join('')
      + `</div>`
    : '';

  const body = `
<section class="page-intro">
 <div class="wrap">
  <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/shops/">Shops</a> / <a href="/shops/${stSlug}/">${sn}</a> / <a href="/shops/${stSlug}/${citySlug}/">${escHtml(city)}</a> / ${escHtml(cat.label || cat.title)}</nav>
  <div class="eyebrow">${n} of ${cityTotal} ${shopTypePlural}</div>
  <h1>${escHtml(cat.title)} in ${escHtml(city)}, ${sn}</h1>
  <p class="lede">${escHtml(desc)}</p>
 </div>
</section>
<main class="content content-wide">
 ${introHtml}
 ${topRatedHtml(city, shops, config, stSlug, citySlug, titleLower)}
 <h2>All ${n} ${escHtml(titleLower)} in ${escHtml(city)}</h2>
 <div class="card-grid">${shops.map(s => shopCard(s, config, stSlug)).join('\n')}</div>
 ${otherCatsHtml}
 ${otherCitiesHtml}
 ${faqHtml}
</main>`;

  const schema = [
    schemas.itemList(`${cat.title} in ${city}, ${sn}`, desc, shops.map(s => {
      const ss = s.slug || slugify((s.name || '') + '-' + (s.city || ''));
      return `${config.brand.fullUrl}/shops/${stSlug}/${citySlug}/${ss}/`;
    })),
    schemas.breadcrumbList([
      { name: 'Home', url: config.brand.fullUrl + '/' },
      { name: 'Shops', url: config.brand.fullUrl + '/shops/' },
      { name: sn, url: `${config.brand.fullUrl}/shops/${stSlug}/` },
      { name: city, url: `${config.brand.fullUrl}/shops/${stSlug}/${citySlug}/` },
      { name: cat.label || cat.title, url: canonical },
    ]),
    schemas.faqPage(faqs.map(f => ({ q: f.q, a: f.aText }))),
  ];

  const html = pageShell({
    config,
    title: truncateTitle(`${cat.title} in ${city}, ${sn} — ${n} Shops`),
    description: desc,
    canonical,
    schema,
    body: body + (body.includes('hours-today') ? HOURS_TODAY_SCRIPT : ''),
    showCdn: false,
  });
  return { html, canonical };
}

// ============================================================
// EVENT-STATE PAGE
// ============================================================

// "coin shops" / "card shops" / "comic book stores", lower case.
function shopTypePluralLabel(niche) {
  return niche.shopTypePluralCapitalized
    ? niche.shopTypePluralCapitalized.toLowerCase()
    : ((niche.shopType || 'shop') + 's');
}

function eventStatePage(stateCode, events, config, extras = {}) {
  const niche = config.niche || {};
  const sn = stateName(stateCode);
  const stSlug = slugify(sn);
  const canonical = `${config.brand.fullUrl}/events/${stSlug}/`;
  const eventNoun = niche.eventNoun || 'shows and events';
  const eventNounCap = niche.eventNounCapitalized || 'Events';
  // Description + intro name the next show, the date range and the cities
  // (SEO audit 2026-10-20: these pages had a ~45-character description and
  // one line of intro, so every state page read the same to Google).
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmtDay = d => {
    const x = new Date(String(d || '').slice(0, 10) + 'T00:00:00');
    return isNaN(x) ? '' : MON[x.getMonth()] + ' ' + x.getDate();
  };
  const dated = events.filter(e => e.start_date && fmtDay(e.start_date))
    .slice().sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)));
  const next = dated[0];
  const last = dated[dated.length - 1];
  const cities = [...new Set(dated.map(e => String(e.city || '').trim()).filter(Boolean))];
  const countText = events.length === 1
    ? `1 upcoming event in ${sn}`
    : `${events.length} upcoming ${eventNoun} in ${sn}`;
  const nextText = next
    ? `next: ${next.name} on ${fmtDay(next.start_date)}${next.city ? ' in ' + next.city : ''}`
    : '';
  const desc = clampText(`${countText}${nextText ? ', ' + nextText : ''}. Dates, venues and admission for every show.`, 155);
  const cityList = cities.length > 3
    ? cities.slice(0, 3).join(', ') + ' and more'
    : cities.length === 3 ? `${cities[0]}, ${cities[1]} and ${cities[2]}` : cities.join(' and ');
  const span = dated.length > 1 && fmtDay(next.start_date) !== fmtDay(last.start_date)
    ? `, from ${fmtDay(next.start_date)} to ${fmtDay(last.start_date)}`
    : (next ? ` on ${fmtDay(next.start_date)}` : '');
  const firstLine = dated.length === 1
    ? `One upcoming event in ${sn}: ${next.name} on ${fmtDay(next.start_date)}${next.city ? ' in ' + next.city : ''}.`
    : `${countText} on our calendar${span}${cityList ? ', in ' + cityList : ''}.`;
  const ledeHtml = escHtml(firstLine)
    + ' Each listing has the dates, venue and admission, with a link to the show’s own page.'
    + ` Looking for a shop instead? See <a href="/shops/${stSlug}/">${escHtml(shopTypePluralLabel(niche))} in ${escHtml(sn)}</a>.`;

  const shopTypeLabel = niche.shopType || 'shop';
  const shopTypePlural = niche.shopTypePluralCapitalized
    ? niche.shopTypePluralCapitalized.toLowerCase()
    : (shopTypeLabel + 's');
  const shopTypePluralCap = niche.shopTypePluralCapitalized
    || titleCase(shopTypeLabel + 's');

  // Thin-state padding: a state with only one or two shows would otherwise be
  // a near-empty page. Give it real, related substance — the state's own shops
  // plus links onward to neighboring states' event pages.
  const padShops = extras.padShops || [];
  const padHtml = padShops.length
    ? `<h2>${shopTypePluralCap} in ${sn}</h2>
<p>Only ${events.length === 1 ? 'one show is' : events.length + ' shows are'} on the ${sn} calendar right now. `
      + `These local ${shopTypePlural} buy, sell, and trade year-round — many hear about shows before they're listed:</p>
<div class="card-grid">${padShops.map(s => shopCard(s, config, stSlug)).join('\n')}</div>
<p style="margin-top:18px"><a href="/shops/${stSlug}/" class="btn outline">View all ${shopTypePlural} in ${sn} →</a></p>`
    : '';

  // Onward links to neighboring states that actually have an events page —
  // internal linking + topical authority, and the practical answer for a
  // collector in a thin state who will happily drive across a border.
  const neighborEventStates = extras.neighborEventStates || [];
  const neighborHtml = neighborEventStates.length
    ? `<h2>${eventNounCap} in nearby states</h2>
<p>Collectors in ${sn} often travel for a bigger show floor. Browse ${eventNoun} nearby:</p>
<div class="neighbors">${neighborEventStates.map(n =>
  `<a href="/events/${n.slug}/" class="neighbor-link">${escHtml(n.name)}</a>`
).join('')}</div>`
    : '';

  // Appended only when non-empty, so a site that opts into none of this
  // renders byte-identical output to before the feature existed.
  const tail = [padHtml, neighborHtml].filter(Boolean).map(s => '\n ' + s).join('');

  const body = `
<section class="page-intro">
 <div class="wrap">
  <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/events">Events</a> / ${sn}</nav>
  <div class="eyebrow">${events.length} ${events.length === 1 ? 'event' : 'events'}</div>
  <h1>${eventNounCap} in ${sn}</h1>
  <p class="lede">${ledeHtml}</p>
 </div>
</section>
<main class="content">
 <div class="card-grid" style="grid-template-columns:1fr">${events.map(eventCard).join('\n')}</div>
 <p style="text-align:center;margin-top:24px"><a href="/events" class="btn">View all events →</a></p>${tail}
</main>`;

  // schemas.event() returns null for events with no usable location (neither
  // venue nor street address). Drop those before serializing — emitting null
  // into the JSON-LD array would invalidate the whole block.
  const eventSchemas = events.map(e => schemas.event(e, {
    stateNameStr: sn,
    defaultDescription: `${e.name} — a ${niche.shopType || 'shop'}-related event in ${e.city || sn}, ${sn}.`,
    siteName: config.brand.name,
    siteUrl: config.brand.fullUrl,
  })).filter(Boolean);
  const breadcrumbSchema = schemas.breadcrumbList([
    { name: 'Home', url: config.brand.fullUrl + '/' },
    { name: 'Events', url: config.brand.fullUrl + '/events' },
    { name: sn, url: canonical },
  ]);

  const title = truncateTitle(`${eventNounCap} in ${sn} — ${events.length} Upcoming`);

  const html = pageShell({
    config,
    title,
    description: desc,
    canonical,
    schema: [...eventSchemas, breadcrumbSchema],
    body: body + (body.includes('hours-today') ? HOURS_TODAY_SCRIPT : ''),
    showCdn: false,
  });

  return { html, canonical };
}

// ============================================================
// SHOPS INDEX HUB  (/shops/)
// ============================================================
//
// Server-rendered hub at /shops/ so crawlers (and AI crawlers that don't run
// JS) see a real directory: an answer-first intro with the live shop count,
// every state linked to its /shops/<state>/ page with a count, and the busiest
// cities linked to their /shops/<state>/<city>/ pages. Interactive name/ZIP
// search lives at its own URL (config.finderPath, default /finder) and is
// linked prominently — the static grid is the content, the finder the
// enhancement. Replaces the old JS-only root `shops.html`.

function shopsIndexPage(shops, byState, config) {
  const niche = config.niche || {};
  const siteUrl = config.brand.fullUrl;
  const canonical = `${siteUrl}/shops/`;
  const total = shops.length;
  const finderPath = config.finderPath || '/finder';

  const shopTypeLabel = niche.shopType || 'shop';
  const shopTypePlural = niche.shopTypePluralCapitalized
    ? niche.shopTypePluralCapitalized.toLowerCase()
    : (shopTypeLabel + 's');
  const shopTypePluralCap = niche.shopTypePluralCapitalized
    || titleCase(shopTypeLabel + 's');

  // States, busiest first.
  const stateEntries = Object.keys(byState).map(code => ({
    code,
    name: stateName(code),
    slug: slugify(stateName(code)),
    count: byState[code].length,
  })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const stateCount = stateEntries.length;

  // Busiest cities across every state (top 40).
  const cityMap = {};
  for (const s of shops) {
    const code = (s.state || '').toUpperCase();
    if (!code) continue;
    const key = code + '|' + (s.city || 'Other');
    if (!cityMap[key]) cityMap[key] = { city: s.city || 'Other', code, count: 0 };
    cityMap[key].count++;
  }
  const topCities = Object.values(cityMap)
    .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city))
    .slice(0, 40)
    .map(c => ({
      city: c.city,
      code: c.code,
      count: c.count,
      stSlug: slugify(stateName(c.code)),
      citySlug: slugify(c.city) || 'other',
    }));

  const stateCards = stateEntries.map(s =>
    `<a href="/shops/${s.slug}/" class="shop-card city-card"><h3>${escHtml(s.name)}</h3><div class="loc">${s.count} ${shopTypePlural}</div></a>`
  ).join('\n');

  const cityLinks = topCities.map(c =>
    `<a href="/shops/${c.stSlug}/${c.citySlug}/" class="neighbor-link">${escHtml(c.city)}, ${escHtml(c.code)} (${c.count})</a>`
  ).join('');

  const body = `
<section class="page-intro">
 <div class="wrap">
  <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a> / Shops</nav>
  <div class="eyebrow">${total.toLocaleString()} ${shopTypePlural} &middot; ${stateCount} states &amp; provinces</div>
  <h1>${shopTypePluralCap} directory</h1>
  <p class="lede">Browse ${total.toLocaleString()} local ${shopTypePlural} across ${stateCount} states and provinces. Pick a state or city below, or <a href="${escAttr(finderPath)}">search every ${shopTypeLabel} by name, city, or ZIP</a>.</p>
 </div>
</section>
<main class="content content-wide">
 <p><a href="${escAttr(finderPath)}" class="btn">Search all ${shopTypePlural} by name, city, or ZIP &rarr;</a></p>
 <h2>Browse ${shopTypePlural} by state</h2>
 <div class="card-grid">${stateCards}</div>
 <h2>Popular cities for ${shopTypePlural}</h2>
 <p>The cities with the most listed ${shopTypePlural}:</p>
 <div class="neighbors">${cityLinks}</div>
</main>`;

  const itemListSchema = schemas.itemList(
    `${shopTypePluralCap} directory`,
    `Browse ${total} ${shopTypePlural} across ${stateCount} US states and Canadian provinces.`,
    stateEntries.map(s => `${siteUrl}/shops/${s.slug}/`)
  );
  const breadcrumbSchema = schemas.breadcrumbList([
    { name: 'Home', url: siteUrl + '/' },
    { name: 'Shops', url: canonical },
  ]);

  const title = truncateTitle(`${shopTypePluralCap} Directory — Browse ${total.toLocaleString()} by State & City`);
  const description = `Directory of ${total.toLocaleString()} local ${shopTypePlural} across ${stateCount} states and provinces. Browse by state or city, or search by name, city, or ZIP.`;

  const html = pageShell({
    config,
    title,
    description,
    canonical,
    schema: [itemListSchema, breadcrumbSchema],
    body: body + (body.includes('hours-today') ? HOURS_TODAY_SCRIPT : ''),
    showCdn: false,
  });

  return { html, canonical };
}

module.exports = { statePage, cityPage, categoryPage, shopCategories, eventStatePage, shopsIndexPage };
