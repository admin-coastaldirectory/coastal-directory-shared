// === Node: "Assemble Pages" (n8n Code node) ===
// Turns the AI JSON into: the full blog post HTML, an index card, and the Axios email HTML.
const meta = $('Get Week\'s Comics').first().json;
let raw = '';
const ai = $input.first().json;
if (ai && Array.isArray(ai.content) && ai.content[0]) raw = ai.content[0].text || '';
else if (ai && typeof ai.text === 'string') raw = ai.text;
raw = String(raw).trim().replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
const D = JSON.parse(raw);

const slug = meta.slug;
const postUrl = 'https://comicstoresnearme.com/blog/news/' + slug + '/';
const sub = (s) => String(s == null ? '' : s).split('%%POSTURL%%').join(postUrl);
const esc = (s) => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
// allow <em> in summary_html (already author-controlled); only escape stray &
const emHtml = (s) => String(s == null ? '' : s).replace(/&(?!amp;|lt;|gt;|#)/g,'&amp;');

const stories = Array.isArray(D.stories) ? D.stories : [];
const lead = stories.find(s => s.is_lead) || stories[0] || {};
const callout = stories.find(s => s.is_callout && s !== lead);
const rest = stories.filter(s => s !== lead && s !== callout);
const videos = Array.isArray(D.videos) ? D.videos : [];
const faq = Array.isArray(D.faq) ? D.faq : [];

const srcLine = (s) => s && s.url ? '<span class="src">Source: <a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.source_name || 'source') + '</a></span>' : '';

const CSS = "*,*::before,*::after{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#222;background:#fafaf7;line-height:1.5}a{color:inherit;text-decoration:none}.site-header{background:#fff;border-bottom:1px solid #ebebeb;position:sticky;top:0;z-index:50}.site-header .inner{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;max-width:1100px;margin:0 auto;gap:20px;flex-wrap:wrap}.brand-mark{font-size:19px;font-weight:500;color:#111;font-family:Georgia,serif}.brand-rule{height:3px;width:42px;background:#c03030;margin-top:5px}nav.primary{display:flex;gap:22px;font-size:14px;color:#444;align-items:center}nav.primary a:hover{color:#c03030}nav.primary .cta{padding:9px 16px;border-radius:8px;font-weight:500;font-size:13px}nav.primary .cta.outline{background:#fff;color:#c03030;border:1px solid #c03030}nav.primary .cta.filled{background:#c03030;color:#fff;border:1px solid #c03030}@media(max-width:820px){nav.primary{gap:14px;font-size:13px;flex-wrap:wrap}}.btn{display:inline-block;background:#c03030;color:#fff;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:500;text-decoration:none}.btn.outline{background:#fff;color:#c03030;border:1px solid #c03030}.page-intro{background:#fff;border-bottom:1px solid #ebebeb;padding:48px 20px 40px}.page-intro .wrap{max-width:760px;margin:0 auto}.breadcrumb{font-size:13px;color:#888;margin-bottom:14px}.breadcrumb a{color:#c03030}.eyebrow{display:inline-block;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#c03030;font-weight:500;margin-bottom:12px}h1{font-size:36px;font-weight:500;color:#111;line-height:1.15;font-family:Georgia,serif;margin:0 0 12px}.lede{font-size:16px;color:#666;margin:0;line-height:1.6}.article-meta{font-size:13px;color:#999;margin-top:18px}.article-meta strong{color:#666}main.content{max-width:760px;margin:0 auto;padding:48px 20px 68px}main.content h2{font-size:24px;font-weight:500;color:#111;font-family:Georgia,serif;margin:42px 0 14px;line-height:1.2}main.content h2:first-child{margin-top:0}main.content h3{font-size:18px;font-weight:600;color:#111;margin:30px 0 7px;line-height:1.3}main.content h3 a{color:#111}main.content h3 a:hover{color:#c03030}main.content p{font-size:15px;color:#444;line-height:1.75;margin:0 0 14px}main.content a:not(.btn){color:#c03030;font-weight:500}main.content strong{font-weight:500;color:#111}.src{display:block;font-size:12px;color:#999;margin:-4px 0 16px}.src a{color:#999;border-bottom:1px dotted #ccc}.callout{background:#fff;border:1px solid #ebebeb;border-left:3px solid #c03030;border-radius:10px;padding:20px 22px;margin:26px 0}.callout h3{margin:0 0 8px;font-family:Georgia,serif;font-weight:500;font-size:17px}.callout p{margin:0 0 6px}.vid-list{margin:18px 0 8px;display:flex;flex-direction:column;gap:14px}.vid-row{background:#fff;border:1px solid #ebebeb;border-radius:12px;padding:16px 18px}.vid-row .vt{font-family:Georgia,serif;font-size:16px;color:#111;font-weight:500}.vid-row .vt a{color:#111}.vid-row .vmeta{font-size:12px;color:#c03030;font-weight:600;margin:3px 0 6px}.vid-row .vd{font-size:13.5px;color:#555;line-height:1.6;margin:0}.endcta{display:flex;gap:10px;flex-wrap:wrap;margin:30px 0 8px}.faq h3{font-size:16px;margin:22px 0 4px}.faq p{margin-top:0}.subband{background:#1a1a1a;color:#fff;padding:46px 22px;text-align:center}.subband h2{font-size:24px;font-family:Georgia,serif;font-weight:500;margin:0 0 10px;color:#fff}.subband p{color:#bbb;font-size:15px;max-width:520px;margin:0 auto 20px}footer{background:#fff;border-top:1px solid #ebebeb;padding:40px 20px 24px;color:#666;text-align:center;font-size:13px}footer a{color:#666}.copyright{margin-top:16px;font-size:12px;color:#999}";

const HEADER = '<header class="site-header"><div class="inner"><a href="/" class="brand"><div class="brand-mark">ComicStoresNearMe</div><div class="brand-rule"></div></a><nav class="primary"><a href="/shops">Shops</a><a href="/events">Events</a><a href="/cgc-drop-off">CGC</a><a href="/daily-feed">Daily Feed</a><a href="/blog">Blog</a><a href="/advertise" class="cta outline">Advertise</a><a href="/submit" class="cta filled">Add Your Shop</a></nav></div></header>';
const FOOTER = '<section class="subband"><h2>Get the weekly roundup free</h2><p>New releases, variant covers, CGC news, record sales and the best collector videos, in your inbox every week.</p><a class="btn" href="/subscribe">Subscribe</a> &nbsp; <a class="btn outline" href="/shops">Find a comic shop</a></section><footer><div><a href="/">Home</a> &middot; <a href="/blog">Blog</a> &middot; <a href="/blog/news/">News Roundups</a> &middot; <a href="/daily-feed">Daily Feed</a> &middot; <a href="/shops">Shops</a> &middot; <a href="/subscribe">Subscribe</a></div><div class="copyright">&copy; ' + meta.year + ' ComicStoresNearMe.com &middot; Coastal Directory LLC, Wyoming.</div></footer>';

// ---- schema ----
const faqLd = { '@context':'https://schema.org','@type':'FAQPage','mainEntity': faq.map(f => ({ '@type':'Question','name':f.q,'acceptedAnswer':{'@type':'Answer','text':f.a} })) };
const artLd = { '@context':'https://schema.org','@type':'BlogPosting','headline': D.title,'description': D.meta_description,'datePublished': new Date().toISOString().slice(0,10),'author':{'@type':'Organization','name':'ComicStoresNearMe'},'mainEntityOfPage': postUrl };

// ---- body ----
let body = '<p>The stories collectors need to know from this week, each with a quick read and a link to the source, plus the videos worth your time. Want the live version? Our <a href="/daily-feed">Daily Feed</a> updates all week.</p>';
body += '<h2>' + esc(lead.headline || '') + '</h2><p>' + emHtml(lead.summary_html || '') + '</p>' + srcLine(lead);
if (callout) body += '<div class="callout"><h3>What\'s worth money right now</h3><p>' + emHtml(callout.summary_html || '') + '</p>' + srcLine(callout) + '</div>';
if (rest.length) {
  body += '<h2>Also worth knowing this week</h2>';
  rest.forEach(s => {
    body += '<h3><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.headline || '') + '</a></h3><p>' + emHtml(s.summary_html || '') + '</p>' + srcLine(s);
  });
}
if (videos.length) {
  body += '<h2>Watch this week</h2><div class="vid-list">';
  videos.forEach(v => {
    body += '<div class="vid-row"><div class="vt"><a href="' + esc(v.url) + '" target="_blank" rel="noopener">' + esc(v.title || '') + '</a></div><div class="vmeta">&#9654; ' + esc(v.channel || '') + '</div><p class="vd">' + esc(v.desc || '') + '</p></div>';
  });
  body += '</div>';
}
body += '<h2>What it means for your collection</h2><p>' + emHtml(D.bottom_line || '') + '</p>';
body += '<div class="endcta"><a class="btn" href="/shops">Find a comic shop near you</a><a class="btn outline" href="/subscribe">Get this roundup every week</a></div>';
if (faq.length) {
  body += '<h2 class="faq">Frequently asked questions</h2><div class="faq">';
  faq.forEach(f => { body += '<h3>' + esc(f.q) + '</h3><p>' + esc(f.a) + '</p>'; });
  body += '</div>';
}

const postHtml = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">' +
  '<script async src="https://www.googletagmanager.com/gtag/js?id=G-3LKP95PGDN"></script>' +
  '<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config","G-3LKP95PGDN");</script>' +
  '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
  '<title>' + esc(D.title) + ' | ComicStoresNearMe</title>' +
  '<meta name="description" content="' + esc(D.meta_description) + '">' +
  '<link rel="canonical" href="' + postUrl + '"><meta name="robots" content="index, follow">' +
  '<meta property="og:title" content="' + esc(D.title) + '"><meta property="og:description" content="' + esc(D.meta_description) + '">' +
  '<meta property="og:type" content="article"><meta property="og:url" content="' + postUrl + '">' +
  '<script type="application/ld+json">' + JSON.stringify(artLd) + '</script>' +
  '<script type="application/ld+json">' + JSON.stringify(faqLd) + '</script>' +
  '<style>' + CSS + '</style></head><body>' + HEADER +
  '<section class="page-intro"><div class="wrap"><nav class="breadcrumb"><a href="/">Home</a> / <a href="/blog">Blog</a> / <a href="/blog/news/">News Roundups</a> / This Week</nav>' +
  '<div class="eyebrow">Weekly Comic News</div><h1>Comic Book News Roundup: ' + esc(meta.dateRange) + '</h1>' +
  '<p class="lede">' + esc(D.lede) + '</p><div class="article-meta"><strong>Published</strong> ' + new Date().toDateString() + ' &middot; Curated from this week\'s comic news and video feed</div></div></section>' +
  '<main class="content">' + body + '</main>' + FOOTER + '</body></html>';

// ---- index card ----
const indexCard = '\n <a class="post-card" href="/blog/news/' + slug + '/"><span class="pc-tag">Weekly &middot; ' + esc(meta.dateRange) + '</span><div class="pc-title">Comic Book News Roundup: ' + esc(meta.dateRange) + '</div><div class="pc-desc">' + esc(D.meta_description) + '</div><div class="pc-date">Published ' + new Date().toDateString() + '</div></a>';

// ---- Axios email ----
let emailItems = '';
rest.slice(0,4).forEach(s => {
  emailItems += '<div style="padding:11px 0;border-bottom:1px solid #f1f1f1"><div style="font-size:14px;color:#333;line-height:1.6"><b>' + esc(s.headline) + '.</b> ' + esc((s.summary_html||'').replace(/<[^>]+>/g,'')) + '</div><div style="font-size:12.5px;font-weight:600"><a href="' + esc(s.url) + '" style="color:#c03030;text-decoration:none">' + esc(s.source_name||'source') + ' &rarr;</a></div></div>';
});
let emailVids='';
videos.slice(0,3).forEach(function(v){ emailVids+='<div style="padding:9px 0;border-bottom:1px solid #f4f4f4"><div style="font-size:13.5px;font-weight:600;color:#111">'+esc(v.title)+'</div><div style="font-size:12px;color:#777;line-height:1.5">'+esc(v.channel)+' &middot; <a href="'+esc(v.url)+'" style="color:#c03030;text-decoration:none">Watch &rarr;</a></div></div>'; });
const emailHtml = '<div style="max-width:680px;margin:0 auto;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a">' +
  '<div style="text-align:center;font-size:11px;color:#888;padding:8px 0"><a href="' + postUrl + '" style="color:#c03030">View in browser &rarr;</a></div>' +
  '<div style="background:#fff;border-radius:8px;overflow:hidden;border:1px solid #eee">' +
  '<div style="border-bottom:3px solid #c03030;padding:18px 26px 14px"><div style="font-family:Georgia,serif;font-size:21px;color:#111">ComicStoresNearMe Weekly</div><div style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#999;margin-top:3px">Smart roundup &middot; ' + esc(meta.dateRange) + '</div></div>' +
  '<div style="padding:8px 26px 24px">' +
  '<p style="font-size:14px;color:#333;line-height:1.6"><b>' + esc(D.email_intro) + '</b></p>' +
  '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#c03030;margin:22px 0 6px">The big one</div>' +
  '<div style="font-size:16px;font-weight:700;color:#111;line-height:1.35;margin:0 0 7px">' + esc(lead.headline) + '</div>' +
  '<p style="font-size:14px;color:#333;line-height:1.65;margin:0 0 8px">' + esc((lead.summary_html||'').replace(/<[^>]+>/g,'')) + '</p>' +
  '<p style="font-size:13px;font-weight:600;margin:2px 0 0"><a href="' + esc(lead.url) + '" style="color:#c03030;text-decoration:none">Go deeper (' + esc(lead.source_name||'source') + ') &rarr;</a></p>' +
  (callout ? '<div style="background:#fbf2f2;border-left:3px solid #c03030;border-radius:6px;padding:12px 14px;margin:16px 0"><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#c03030;margin-bottom:4px">Worth money</div><p style="font-size:12px;color:#555;margin:0;line-height:1.55">' + esc((callout.summary_html||'').replace(/<[^>]+>/g,'')) + ' <a href="' + esc(callout.url) + '" style="color:#c03030">' + esc(callout.source_name||'') + ' &rarr;</a></p></div>' : '') +
  '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#c03030;margin:22px 0 6px">Catch up fast</div>' + emailItems + (emailVids?'<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#c03030;margin:22px 0 6px">Watch this week</div>'+emailVids:'') +
  '<div style="text-align:center;padding:20px 0 4px"><a href="' + postUrl + '" style="display:inline-block;background:#c03030;color:#fff;text-decoration:none;font-weight:600;font-size:13px;padding:11px 20px;border-radius:6px">Read the full roundup</a></div>' +
  '</div></div>' +
  '<div style="text-align:center;font-size:11px;color:#999;line-height:1.7;padding:20px 16px 0">You subscribed at comicstoresnearme.com &middot; <a href="#" style="color:#999">Unsubscribe</a></div></div>';

// full /blog/news/ index page shell (used when the index doesn't exist yet)
const INDEX_CSS = ".post-list{display:flex;flex-direction:column;gap:14px;margin:20px 0 8px}.post-card{display:block;background:#fff;border:1px solid #ebebeb;border-radius:12px;padding:22px 24px}.post-card:hover{border-color:#c03030}.post-card .pc-tag{display:inline-block;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;color:#c03030;margin-bottom:8px}.post-card .pc-title{font-family:Georgia,serif;font-size:20px;color:#111;font-weight:500;margin-bottom:6px}.post-card .pc-desc{font-size:14px;color:#666;line-height:1.6}.post-card .pc-date{font-size:12px;color:#999;margin-top:10px}";
const indexHtml = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">'
  + '<title>Comic Book News Roundups | ComicStoresNearMe</title>'
  + '<meta name="description" content="Weekly comic book news roundups: the biggest stories, record sales, rising-value variants, and the best collector videos.">'
  + '<link rel="canonical" href="https://comicstoresnearme.com/blog/news/"><meta name="robots" content="index, follow"><meta name="viewport" content="width=device-width, initial-scale=1.0">'
  + '<script type="application/ld+json">' + JSON.stringify({'@context':'https://schema.org','@type':'CollectionPage','name':'Comic Book News Roundups','url':'https://comicstoresnearme.com/blog/news/'}) + '</scr'+'ipt>'
  + '<style>' + CSS + INDEX_CSS + '</style></head><body>' + HEADER
  + '<section class="page-intro"><div class="wrap"><nav class="breadcrumb"><a href="/">Home</a> / <a href="/blog">Blog</a> / News Roundups</nav><div class="eyebrow">Comic News</div><h1>Comic book news roundups</h1><p class="lede">Every week we round up the biggest comic stories, record sales, rising-value variants, and the best collector videos. New roundup every Sunday.</p></div></section>'
  + '<main class="content"><h2>Latest roundups</h2><div class="post-list"><!--NEWS-POSTS-->' + indexCard + '</div></main>' + FOOTER + '</body></html>';

return [{ json: {
  slug, postPath: 'blog/news/' + slug + '/index.html', postHtml,
  indexPath: 'blog/news/index.html', indexCard, indexHtml,
  emailHtml, subject: D.subject || ('Comic news: ' + meta.dateRange),
  social_fb: sub(D.social_fb), social_x: sub(D.social_x),
  postUrl, title: D.title
} }];
