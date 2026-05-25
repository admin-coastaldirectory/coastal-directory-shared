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
    { label: 'Daily Feed', href: '/daily-feed', dropdown: [
      { label: 'News', href: '/daily-feed?type=news' },
      { label: 'Blog', href: '/blog' },
      { label: 'Subscribe', href: '/subscribe' },
    ]},
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

  // Split bottom band emitted by shell.js -> ctaBanner(). A site that
  // omits ctaBand falls back to the legacy single-CTA banner.
  ctaBand: `<style>
.pcta-band{background:#1a1a1a;color:#fff;padding:54px 22px;text-align:center}
.pcta-band h2{font-size:26px;font-weight:500;color:#fff;font-family:Georgia,serif;letter-spacing:-0.4px;margin:0 0 10px;line-height:1.18}
.pcta-band p{font-size:15px;color:#bbb;line-height:1.6;margin:0 0 22px}
.pcta-split{display:flex;flex-wrap:wrap;max-width:1080px;margin:0 auto}
.pcta-col{flex:1 1 340px;padding:0 44px;display:flex;flex-direction:column;align-items:center;text-align:center}
.pcta-col + .pcta-col{border-left:1px solid #333}
.pcta-btns{display:flex;flex-direction:column;align-items:stretch;gap:10px;width:-moz-fit-content;width:fit-content;margin:0 auto;margin-top:auto}
.pcta-btn{display:flex;align-items:center;justify-content:center;height:52px;box-sizing:border-box;padding:0 30px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;white-space:nowrap}
.pcta-btn.primary{background:#1a3a5c;color:#fff}
.pcta-btn.outline{background:transparent;color:#fff;border:1px solid #444}
.pcta-form{width:100%;max-width:420px;margin:0 auto;margin-top:auto}
.pcta-email{width:100%;height:48px;box-sizing:border-box;padding:0 15px;border:1px solid #ccc;border-radius:8px;font-size:15px;background:#fff;color:#222;font-family:inherit;display:block}
.pcta-freq{display:flex;gap:20px;justify-content:center;margin:14px 0;font-size:14px;color:#cfcfcf}
.pcta-freq label{display:flex;align-items:center;gap:6px;cursor:pointer}
.pcta-freq input{accent-color:#1a3a5c}
.pcta-subbtn{width:100%;height:48px;box-sizing:border-box;border:0;border-radius:8px;background:#1a3a5c;color:#fff;font-size:15px;font-weight:600;font-family:inherit;cursor:pointer}
.pcta-subbtn:hover{background:#0f2740}
.pcta-msg{margin-top:10px;font-size:13px;text-align:center;min-height:16px}
@media(max-width:680px){.pcta-col{flex-basis:100%;padding:0 12px}.pcta-col + .pcta-col{border-left:0;border-top:1px solid #333;margin-top:32px;padding-top:32px}}
</style>
<section class="pcta-band">
 <div class="pcta-split">
  <div class="pcta-col">
   <h2>Own a coin shop?</h2>
   <p>Get in front of thousands of collectors searching for coin shops near them. Standard listings are always free &mdash; or boost your visibility with a featured placement.</p>
   <div class="pcta-btns">
    <a href="/submit" class="pcta-btn primary">List your shop free</a>
    <a href="/advertise" class="pcta-btn outline">Advertise with us</a>
   </div>
  </div>
  <div class="pcta-col">
   <h2>Collect coins?</h2>
   <p>Get the coin news that matters &mdash; new U.S. Mint releases, PCGS/NGC updates, coin shows, and shop appraisals &mdash; straight to your inbox, free.</p>
   <div class="pcta-form">
    <input type="email" class="pcta-email" id="pcta-email" placeholder="your@email.com">
    <div class="pcta-freq">
     <label><input type="radio" name="pcta-freq" value="daily"> Daily</label>
     <label><input type="radio" name="pcta-freq" value="weekly" checked> Weekly digest</label>
    </div>
    <button type="button" class="pcta-subbtn" id="pcta-sub-btn">Subscribe</button>
    <div class="pcta-msg" id="pcta-msg"></div>
   </div>
  </div>
 </div>
</section>
<script>
(function(){
var b=document.getElementById('pcta-sub-btn');if(!b)return;
var U='https://vtlgfwldogsdueiahidp.supabase.co';
var K='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0bGdmd2xkb2dzZHVlaWFoaWRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMjYyOTgsImV4cCI6MjA4ODYwMjI5OH0.L3rNdeNh_282W1BRsYBc64-64_l8bgHG6kMGSU4C048';
b.addEventListener('click',function(){
var em=(document.getElementById('pcta-email').value||'').trim();
var fr=document.querySelector('input[name=pcta-freq]:checked');var fq=fr?fr.value:'weekly';
var m=document.getElementById('pcta-msg');
if(!em||em.indexOf('@')<1){m.style.color='#f0c0c0';m.textContent='Please enter a valid email.';return;}
b.disabled=true;
fetch(U+'/rest/v1/rpc/cf_newsletter_subscribe',{method:'POST',headers:{'apikey':K,'Authorization':'Bearer '+K,'Content-Type':'application/json'},body:JSON.stringify({p_email:em,p_source_site:'coinsnearme',p_lists:['coins'],p_frequency:fq})}).then(function(r){b.disabled=false;if(!r.ok)throw 0;return r.json();}).then(function(){m.style.color='#bfe6c8';m.textContent="You're in! Check your inbox to confirm.";document.getElementById('pcta-email').value='';}).catch(function(){b.disabled=false;m.style.color='#f0c0c0';m.textContent='Something went wrong. Please try again.';});
});
})();
</script>`,

  cta: {
    headline: 'Own a coin shop?',
    body: 'Get in front of collectors. Standard listings are always free.',
    primaryButton: 'List your shop free',
    secondaryButton: 'Advertise',
  },
};
