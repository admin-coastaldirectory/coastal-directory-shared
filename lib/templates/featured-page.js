// ============================================================
// templates/featured-page.js — /featured/ badge program page
// ============================================================
//
// A marketing page where a listed shop owner grabs a copy-paste badge that
// links back to THEIR shop page (deep link, with UTM tags). The badge is only
// *offered* to Tier A (isIndexable) shops — the "Get your free badge" link is
// rendered on Tier A shop pages only (see shop-page.js), so we never send a
// backlink to a noindex page. This page also works standalone: an owner can
// paste their shop URL and get the snippet + a live preview.
//
// Two exports:
//   featuredBadgeSvg(config) -> the brand-colored badge SVG (written to
//                               /featured-badge.svg, referenced by every embed)
//   featuredPage(config)     -> { html, canonical } for /featured/index.html

const { escHtml, escAttr } = require('../util');
const { pageShell } = require('./shell');
const schemas = require('../schemas');

function featuredBadgeSvg(config) {
  const brand = config.brand;
  const colors = config.colors || {};
  const accent = colors.accent || '#1a3a5c';
  const secondary = colors.secondary || '#c9a227';
  const name = brand.name;
  // Width scales loosely with name length so long brand names still fit.
  const w = Math.max(200, 96 + name.length * 9);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="64" viewBox="0 0 ${w} 64" role="img" aria-label="Listed on ${escAttr(name)}">
  <rect x="1" y="1" width="${w - 2}" height="62" rx="10" fill="#ffffff" stroke="${accent}" stroke-width="2"/>
  <circle cx="34" cy="32" r="17" fill="${accent}"/>
  <path d="M34 21l3.2 6.6 7.3 1-5.3 5.1 1.3 7.2-6.5-3.5-6.5 3.5 1.3-7.2-5.3-5.1 7.3-1z" fill="${secondary}"/>
  <text x="62" y="27" font-family="Georgia,'Times New Roman',serif" font-size="12" fill="#666" letter-spacing="1.5">LISTED ON</text>
  <text x="62" y="47" font-family="Georgia,'Times New Roman',serif" font-size="19" font-weight="600" fill="${accent}">${escHtml(name)}</text>
</svg>`;
}

function featuredPage(config) {
  const brand = config.brand;
  const siteUrl = brand.fullUrl;
  const name = brand.name;
  const niche = config.niche || {};
  const shopTypeLabel = niche.shopType || 'shop';
  const canonical = `${siteUrl}/featured/`;
  const badgeUrl = `${siteUrl}/featured-badge.svg`;

  // The exact UTM tail every embed carries (see plan).
  const utm = 'utm_source=badge&utm_medium=referral&utm_campaign=featured';

  const body = `
<section class="page-intro">
 <div class="wrap">
  <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a> / Featured badge</nav>
  <h1>Get your free ${escHtml(name)} badge</h1>
  <p class="lede">You're listed in the ${escHtml(name)} directory. Add our badge to your own website to show customers you're a trusted local ${escHtml(shopTypeLabel)} &mdash; it links straight back to your shop's page here.</p>
 </div>
</section>
<main class="content">
 <div style="text-align:center;margin:8px 0 28px"><img src="${escAttr(badgeUrl)}" alt="Listed on ${escAttr(name)}" style="max-width:100%;height:64px"></div>

 <h2>Grab your badge code</h2>
 <p>If you got here from your shop's page, your badge is ready below. Otherwise, paste your shop's ${escHtml(name)} web address (the <code>/shops/&hellip;</code> URL) and we'll build it for you.</p>
 <p><input id="shopUrl" type="text" placeholder="${escAttr(siteUrl)}/shops/state/city/your-shop/" style="width:100%;max-width:560px;padding:11px 14px;border:1px solid #e5e5e5;border-radius:10px;font-size:14px;font-family:inherit"></p>

 <div id="out" style="display:none">
  <h3>Live preview</h3>
  <div id="preview" style="margin:6px 0 18px"></div>
  <h3>Copy this code into your website</h3>
  <textarea id="snippet" readonly rows="4" style="width:100%;padding:12px 14px;border:1px solid #e5e5e5;border-radius:10px;font-size:13px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#333;background:#fafafa"></textarea>
  <p><button id="copyBtn" type="button" class="btn">Copy code</button> <span id="copyMsg" style="font-size:13px;color:#1a6a3a;margin-left:8px"></span></p>
 </div>
 <div id="empty" style="background:#fafaf7;border:1px solid #ebebeb;border-radius:12px;padding:18px 20px;color:#555;font-size:14px">
  <strong style="color:#111">Don't know your shop's URL?</strong> Find your shop in <a href="/shops/">our directory</a>, open its page, and click &ldquo;Get your free badge&rdquo; &mdash; this page will fill in automatically.
 </div>

 <h2>How to add the badge to your site</h2>
 <ol>
  <li><strong>Copy the code</strong> above with the Copy button.</li>
  <li><strong>Paste it into your website</strong> wherever you want the badge to appear &mdash; most site builders (Squarespace, Wix, WordPress, Shopify) have an &ldquo;Embed&rdquo; or &ldquo;Custom HTML&rdquo; block. Paste it there.</li>
  <li><strong>Save and publish.</strong> That's it &mdash; the badge now links your visitors to your ${escHtml(name)} listing.</li>
 </ol>
 <p style="color:#888;font-size:13px">Questions? <a href="/advertise">Learn about featured placement</a> or <a href="/submit">add another shop</a>.</p>
</main>
<script>
(function(){
 var SITE=${JSON.stringify(siteUrl)};
 var BADGE=${JSON.stringify(badgeUrl)};
 var NAME=${JSON.stringify(name)};
 var UTM=${JSON.stringify(utm)};
 var input=document.getElementById('shopUrl');
 var out=document.getElementById('out');
 var empty=document.getElementById('empty');
 var pv=document.getElementById('preview');
 var ta=document.getElementById('snippet');

 function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
 // Accept a full URL or a bare /shops/... path; force it onto this site's
 // origin and keep only the path so we never emit someone else's domain.
 function normalize(v){
  v=(v||'').trim(); if(!v) return '';
  var path;
  try{ path=new URL(v, SITE+'/').pathname; }catch(e){ path=v.charAt(0)==='/'?v:'/'+v; }
  if(path.indexOf('/shops/')!==0) return '';
  if(path.charAt(path.length-1)!=='/') path+='/';
  return SITE+path;
 }
 function build(){
  var url=normalize(input.value);
  if(!url){ out.style.display='none'; empty.style.display=''; return; }
  var full=url+(url.indexOf('?')>-1?'&':'?')+UTM;
  var code='<a href="'+full+'" target="_blank" rel="noopener">\\n'
    +'  <img src="'+BADGE+'" alt="Listed on '+NAME+'" style="height:64px;border:0">\\n'
    +'</a>';
  pv.innerHTML='<a href="'+esc(full)+'" target="_blank" rel="noopener"><img src="'+esc(BADGE)+'" alt="Listed on '+esc(NAME)+'" style="height:64px;border:0"></a>';
  ta.value=code;
  empty.style.display='none'; out.style.display='';
 }
 input.addEventListener('input',build);
 document.getElementById('copyBtn').addEventListener('click',function(){
  ta.select();
  try{ navigator.clipboard.writeText(ta.value); }catch(e){ document.execCommand('copy'); }
  document.getElementById('copyMsg').textContent='Copied!';
  setTimeout(function(){document.getElementById('copyMsg').textContent='';},2000);
 });
 // Prefill from ?u=<path> (passed by the "Get your free badge" link on Tier A
 // shop pages) or ?url=<full url>.
 var p=new URLSearchParams(location.search);
 var seed=p.get('u')||p.get('url')||'';
 if(seed){ input.value=seed; build(); }
})();
</script>`;

  const breadcrumbSchema = schemas.breadcrumbList([
    { name: 'Home', url: siteUrl + '/' },
    { name: 'Featured badge', url: canonical },
  ]);

  const title = `Get Your Free ${name} Badge — Link Back to Your Listing`;
  const description = `Add the free ${name} badge to your website. It links customers straight to your shop's listing. Copy-paste HTML, works on any site builder.`;

  const html = pageShell({
    config,
    title,
    description,
    canonical,
    schema: [breadcrumbSchema],
    body,
  });

  return { html, canonical };
}

module.exports = { featuredPage, featuredBadgeSvg };
