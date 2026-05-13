// ============================================================
// samples/coinsnearme.config.js
// Example site config for CoinsNearMe.co
// ============================================================
//
// This is a working config object that the canonical generator
// can consume. In Phase 2, a near-identical file will live in the
// CoinsNearMe repo root as `site.config.js` and the repo's
// generate.js will be a 3-line wrapper:
//
//   const { build } = require('../coastal-directory-shared/lib/generate');
//   const config = require('./site.config');
//   build(config).catch(e => { console.error(e); process.exit(1); });
//
// Secrets policy: SUPABASE_URL and SUPABASE_KEY are read from env vars
// only — no hardcoded fallback (per the architecture review).

module.exports = {
  brand: {
    name: 'CoinsNearMe',
    legalName: 'Coastal Directory LLC, Wyoming',
    domain: 'coinsnearme.co',
    fullUrl: 'https://coinsnearme.co',
  },

  niche: {
    shopType: 'coin shop',
    shopTypeAlt: 'coin dealer',
    shopTypePluralCapitalized: 'Coin Shops',
    collector: 'coin collectors',
    collectorShort: 'collector',
    productPlural: 'coins',
    hub: 'numismatic community',
    eventNoun: 'coin shows and events',
    eventNounCapitalized: 'Coin Shows',

    shopTypeArticle: 'a',

    // Sentence fragments sprinkled into closing About lines.
    evocativePhrases: [
      'rare key dates',
      'PCGS- or NGC-graded slabs',
      'Morgan and Peace dollars',
      'world coins',
      'silver bullion',
      'gold bullion',
      'classic US type coins',
      'ancient coinage',
    ],

    metaServices: 'PCGS/NGC drop-off, bullion, and grading help',
    metaCityServices: 'inventory, hours, and contact info',

    cityIntroServices:
      'inventory of US, world, and ancient coins, bullion, ' +
      'and PCGS/NGC drop-off services',

    // Service-code → about-paragraph fragment.
    serviceAbout: {
      'pcgs-drop-off': 'authorized PCGS grading drop-off services',
      'ngc-drop-off': 'authorized NGC grading drop-off services',
      'cgc-drop-off': 'authorized CGC grading drop-off services',
      bullion: 'gold and silver bullion buying and selling',
      'us-coins': 'a curated selection of classic US coinage',
      'world-coins': 'world and foreign coin inventory',
      ancient: 'ancient and medieval coinage',
      currency: 'paper currency and notes',
      tokens: 'tokens, medals, and exonumia',
      'buy-sell': 'buying, selling, and trading of coin collections',
      appraisals: 'in-store appraisal services',
    },

    // Service-code → FAQ Q&A template. {name}, {city}, {state}, {address} substituted.
    serviceFAQ: {
      'pcgs-drop-off': {
        q: 'Does {name} offer PCGS drop-off?',
        a: 'Yes, {name} is an authorized PCGS drop-off location. Bring your raw coins to the store and they will handle the submission process to PCGS for grading.',
      },
      'ngc-drop-off': {
        q: 'Does {name} offer NGC drop-off?',
        a: 'Yes, {name} is an authorized NGC drop-off location. Bring your raw coins to the store and they will handle the submission process to NGC for grading.',
      },
      bullion: {
        q: 'Does {name} buy and sell bullion?',
        a: 'Yes, {name} buys and sells gold and silver bullion. Call ahead for current spot pricing and inventory availability.',
      },
      'buy-sell': {
        q: 'Does {name} buy coin collections?',
        a: 'Yes, {name} buys, sells, and trades coin collections. Contact the shop for an appraisal or to discuss selling your collection.',
      },
      appraisals: {
        q: 'Does {name} do appraisals?',
        a: '{name} provides in-store appraisals. Contact the shop directly to schedule an appraisal of your coins or collection.',
      },
    },

    // Service-code → short badge label shown on shop cards.
    serviceBadge: {
      'pcgs-drop-off': 'PCGS drop-off',
      'ngc-drop-off': 'NGC drop-off',
      'cgc-drop-off': 'CGC drop-off',
      bullion: 'Bullion',
      'us-coins': 'US coins',
      'world-coins': 'World coins',
      ancient: 'Ancient',
      currency: 'Currency',
      tokens: 'Tokens',
      'buy-sell': 'Buy/sell',
      appraisals: 'Appraisals',
    },

    // Always-included generic Q&A.
    serviceFAQDefault: [
      {
        q: 'What should I expect at {name}?',
        a: '{name} is a local coin shop in {city}, {state}. Expect a curated inventory, knowledgeable staff, and the kind of personal service that the numismatic community relies on.',
      },
    ],
  },

  colors: {
    accent: '#1a3a5c',
    accentDark: '#0f2740',
    accentHover: '#0f2740',
    secondary: '#c9a227',
  },

  supabase: {
    url: process.env.SUPABASE_URL || '',
    key: process.env.SUPABASE_KEY || '',
    tables: { shops: 'coins_shops', events: 'coins_events' },
  },

  analytics: { gtag: 'G-6NBHQKVXET' },

  thresholds: {
    minShopsForCityPage: 2,
    minDataFieldsForShopPage: 2,
  },

  output: { dir: './pages' },

  nav: [
    { label: 'Shops', href: '/shops/' },
    { label: 'Events', href: '/events/' },
    { label: 'Grading', href: '/grading' },
    { label: 'FAQ', href: '/faq' },
    { label: 'Advertise', href: '/advertise', cta: 'outline' },
    { label: 'Add Your Shop', href: '/submit', cta: 'filled' },
  ],

  footerLinks: [
    { label: 'Shops', href: '/shops/' },
    { label: 'Events', href: '/events/' },
    { label: 'FAQ', href: '/faq' },
    { label: 'About', href: '/about' },
    { label: 'Privacy', href: '/privacy' },
  ],

  cta: {
    headline: 'Own a coin shop?',
    body: 'Get in front of collectors. Standard listings are always free.',
    primaryButton: 'List your shop free',
    secondaryButton: 'Advertise',
  },
};
