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
    { label: 'CGC', href: '/cgc-drop-off' },
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
.pcta-btn.primary{background:#c03030;color:#fff}
.pcta-btn.outline{background:transparent;color:#fff;border:1px solid #444}
.pcta-form{width:100%;max-width:420px;margin:0 auto;margin-top:auto}
.pcta-email{width:100%;height:48px;box-sizing:border-box;padding:0 15px;border:1px solid #ccc;border-radius:8px;font-size:15px;background:#fff;color:#222;font-family:inherit;display:block}
.pcta-freq{display:flex;gap:20px;justify-content:center;margin:14px 0;font-size:14px;color:#cfcfcf}
.pcta-freq label{display:flex;align-items:center;gap:6px;cursor:pointer}
.pcta-freq input{accent-color:#c03030}
.pcta-subbtn{width:100%;height:48px;box-sizing:border-box;border:0;border-radius:8px;background:#c03030;color:#fff;font-size:15px;font-weight:600;font-family:inherit;cursor:pointer}
.pcta-subbtn:hover{background:#a02525}
.pcta-msg{margin-top:10px;font-size:13px;text-align:center;min-height:16px}
@media(max-width:680px){.pcta-col{flex-basis:100%;padding:0 12px}.pcta-col + .pcta-col{border-left:0;border-top:1px solid #333;margin-top:32px;padding-top:32px}}
</style>
<section class="pcta-band">
 <div class="pcta-split">
  <div class="pcta-col">
   <h2>Own a comic book store?</h2>
   <p>Get in front of thousands of collectors searching for comic stores near them. Standard listings are always free &mdash; or boost your visibility with a featured placement.</p>
   <div class="pcta-btns">
    <a href="/submit" class="pcta-btn primary">List your shop free</a>
    <a href="/advertise" class="pcta-btn outline">Advertise with us</a>
   </div>
  </div>
  <div class="pcta-col">
   <h2>Collect comics?</h2>
   <p>Get the comic news that matters &mdash; new releases, variant covers, CGC updates, ComicCons, and creator signings &mdash; straight to your inbox, free.</p>
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
fetch(U+'/rest/v1/rpc/cf_newsletter_subscribe',{method:'POST',headers:{'apikey':K,'Authorization':'Bearer '+K,'Content-Type':'application/json'},body:JSON.stringify({p_email:em,p_source_site:'comicstoresnearme',p_lists:['comics'],p_frequency:fq})}).then(function(r){b.disabled=false;if(!r.ok)throw 0;return r.json();}).then(function(){m.style.color='#bfe6c8';m.textContent="You're in! Check your inbox to confirm.";document.getElementById('pcta-email').value='';}).catch(function(){b.disabled=false;m.style.color='#f0c0c0';m.textContent='Something went wrong. Please try again.';});
});
})();
</script>`,

  cta: {
    headline: 'Own a comic book store?',
    body: 'Get in front of thousands of collectors. Free listings or featured placement.',
    primaryButton: 'List your shop free',
    secondaryButton: 'Advertise with us',
  },
};
