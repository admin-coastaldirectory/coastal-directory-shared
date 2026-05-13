// ============================================================
// samples/comicstoresnearme.config.js
// Example site config for ComicStoresNearMe.com
// ============================================================

module.exports = {
  brand: {
    name: 'ComicStoresNearMe',
    legalName: 'Coastal Directory LLC, Wyoming',
    domain: 'comicstoresnearme.com',
    fullUrl: 'https://comicstoresnearme.com',
  },

  niche: {
    shopType: 'comic book store',
    shopTypeAlt: 'comic shop',
    shopTypePluralCapitalized: 'Comic Book Stores',
    collector: 'comic book collectors',
    collectorShort: 'collector',
    productPlural: 'comics',
    hub: 'collecting community',
    eventNoun: 'comic cons and shows',
    eventNounCapitalized: 'Comic Cons',

    shopTypeArticle: 'a',

    // Override the shop-type label when certain services are present
    // (e.g. a comic shop that also does CGC drop-off describes itself
    // differently than a pure shop).
    shopTypeOverride: {
      gaming: 'comic book and gaming store',
      cgc: 'comic book store and CGC drop-off center',
    },

    evocativePhrases: [
      'rare Silver Age keys',
      'modern variants',
      'graphic novels',
      'manga',
      'Wednesday releases',
      'CGC-graded slabs',
      'creator signings',
      'classic back issues',
    ],

    metaServices: 'CGC drop-off, back issues, and new releases',
    metaCityServices: 'new issues, back issues, CGC drop-off, and creator signings',

    cityIntroServices:
      'new weekly releases, back issue inventory, CGC drop-off services, and creator signings throughout the year',
    cityIntroClose:
      'Whether you\'re picking up Wednesday\'s pull list or hunting for a Silver Age key, the shops below are your local options.',

    serviceAbout: {
      'new-issues': 'new weekly comic releases every Wednesday',
      'back-issues': 'an extensive back issue collection',
      cgc: 'authorized CGC grading drop-off services',
      signings: 'creator signings and special events',
      'buy-sell': 'buying, selling, and trading of comic collections',
      gaming: 'tabletop gaming, trading cards, and hobby supplies',
      'pull-list': 'subscription-based pull list services',
    },

    serviceFAQ: {
      cgc: {
        q: 'Does {name} offer CGC drop-off?',
        a: 'Yes, {name} is an authorized CGC drop-off location. You can bring your comics to the store and they will handle the submission process to CGC for grading.',
      },
      'back-issues': {
        q: 'Does {name} sell back issues?',
        a: 'Yes, {name} maintains a back issue inventory. Visit or call to ask about specific issues, runs, or keys you\'re looking for.',
      },
      'buy-sell': {
        q: 'Does {name} buy comic collections?',
        a: 'Yes, {name} buys, sells, and trades comic book collections. Contact the shop for an appraisal or to discuss selling your collection.',
      },
      signings: {
        q: 'Does {name} host creator signings?',
        a: 'Yes, {name} hosts creator signings and special events. Follow the shop\'s social media or website for upcoming guest announcements.',
      },
      gaming: {
        q: 'Does {name} sell gaming products?',
        a: 'Yes, {name} carries tabletop gaming, trading cards, and hobby supplies in addition to comics.',
      },
    },

    serviceBadge: {
      cgc: 'CGC drop-off',
      'back-issues': 'Back issues',
      'new-issues': 'New issues',
      signings: 'Signings',
      'buy-sell': 'Buy/sell',
      gaming: 'Gaming',
      'pull-list': 'Pull list',
    },

    serviceFAQDefault: [
      {
        q: 'What should I expect at {name}?',
        a: '{name} is a local comic book store in {city}, {state}. Expect new releases, back issues, graphic novels, and a knowledgeable staff who can help you discover new titles or track down specific issues.',
      },
    ],
  },

  colors: {
    accent: '#c03030',
    accentDark: '#a82525',
    accentHover: '#a82525',
    secondary: '#1a6a3a',
  },

  supabase: {
    url: process.env.SUPABASE_URL || '',
    key: process.env.SUPABASE_KEY || '',
    tables: { shops: 'cnm_shops', events: 'cnm_events' },
  },

  analytics: { gtag: 'G-3LKP95PGDN' },

  thresholds: {
    minShopsForCityPage: 2,
    minDataFieldsForShopPage: 2,
  },

  output: { dir: './pages' },

  nav: [
    { label: 'Shops', href: '/shops/' },
    { label: 'Events', href: '/events/' },
    { label: 'CGC', href: '/cgc-drop-off' },
    { label: 'FAQ', href: '/faq' },
    { label: 'Advertise', href: '/advertise', cta: 'outline' },
    { label: 'Add Your Shop', href: '/submit', cta: 'filled' },
  ],

  footerLinks: [
    { label: 'Shops', href: '/shops/' },
    { label: 'Events', href: '/events/' },
    { label: 'CGC', href: '/cgc-drop-off' },
    { label: 'FAQ', href: '/faq' },
    { label: 'About', href: '/about' },
    { label: 'Privacy', href: '/privacy' },
  ],

  cta: {
    headline: 'Own a comic book store?',
    body: 'Get in front of thousands of collectors. Free listings or featured placement.',
    primaryButton: 'List your shop free',
    secondaryButton: 'Advertise with us',
  },
};
