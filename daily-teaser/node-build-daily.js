// === Node: "Build Daily Email" (n8n Code node) ===
// Templates items[] from "Get Daily Items" into the Axios-style daily teaser email.
// Pure templating - NO AI call. Output: { skip, subject, emailHtml, site }.
// Unsubscribe is the %%UNSUBSCRIBE%% placeholder - the GHL send step replaces it.
const data = $input.first().json;
if (data.skip) return [{ json: { skip: true, site: data.site } }];

const cfg = data.cfg;
const A = cfg.accent;
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const trunc = (s, n) => { s = String(s == null ? '' : s).trim(); return s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '...' : s; };

const UTM = '?utm_source=email&utm_medium=daily-teaser';
const feedUrl = 'https://' + cfg.domain + '/daily-feed' + UTM;
const feedFor = (cat) => (cfg.catFeeds && cat && cfg.catFeeds[cat]) ? cfg.catFeeds[cat] + UTM : feedUrl;

const eyebrow = 'font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:' + A;

const items = data.items || [];
let itemsHtml = '';

if (cfg.categoryHeaders) {
  // Multi-category layout: one section per category, header links to that category's feed.
  items.forEach(function (it, i) {
    const lead = i === 0;
    itemsHtml += '<div style="' + (i ? 'border-top:1px solid #f1f1f1;margin-top:16px;' : '') + 'padding-top:' + (i ? 14 : 4) + 'px">' +
      '<div style="margin:0 0 5px"><a href="' + esc(feedFor(it.category)) + '" style="' + eyebrow + ';text-decoration:none">' + esc(it.category || 'Collectibles') + ' &rarr;</a></div>' +
      '<div style="font-size:' + (lead ? 16 : 14.5) + 'px;font-weight:700;color:#111;line-height:1.35;margin:0 0 6px">' + esc(it.title) + '</div>' +
      '<p style="font-size:' + (lead ? 14 : 13.5) + 'px;color:#333;line-height:1.65;margin:0 0 6px">' + esc(trunc(it.summary, lead ? 600 : 400)) + '</p>' +
      '<p style="font-size:12.5px;font-weight:600;margin:0"><a href="' + esc(it.url) + '" style="color:' + A + ';text-decoration:none">Read at source (' + esc(it.source_name || 'source') + ') &rarr;</a></p></div>';
  });
} else {
  // Single-category layout: lead + "Catch up fast" + optional "In case you missed it" (24-48h backfill).
  const fresh = items.filter(function (it) { return !it.icymi; });
  const icymi = items.filter(function (it) { return it.icymi; });
  const lead = fresh[0];
  const row = (it) => '<div style="padding:12px 0;border-bottom:1px solid #f1f1f1">' +
    '<div style="font-size:14px;color:#333;line-height:1.6"><b>' + esc(it.title) + '.</b> ' + esc(trunc(it.summary, 400)) + '</div>' +
    '<div style="font-size:12.5px;font-weight:600;margin-top:2px"><a href="' + esc(it.url) + '" style="color:' + A + ';text-decoration:none">Read at source (' + esc(it.source_name || 'source') + ') &rarr;</a></div></div>';
  const restHtml = fresh.slice(1).map(row).join('');
  const icymiHtml = icymi.map(row).join('');
  itemsHtml = '<div style="' + eyebrow + ';margin:18px 0 6px">Top story</div>' +
    '<div style="font-size:16px;font-weight:700;color:#111;line-height:1.35;margin:0 0 7px">' + esc(lead.title) + '</div>' +
    '<p style="font-size:14px;color:#333;line-height:1.65;margin:0 0 8px">' + esc(trunc(lead.summary, 600)) + '</p>' +
    '<p style="font-size:13px;font-weight:600;margin:2px 0 0"><a href="' + esc(lead.url) + '" style="color:' + A + ';text-decoration:none">Read at source (' + esc(lead.source_name || 'source') + ') &rarr;</a></p>' +
    (restHtml ? '<div style="' + eyebrow + ';margin:24px 0 2px">Catch up fast</div>' + restHtml : '') +
    (icymiHtml ? '<div style="' + eyebrow + ';margin:24px 0 2px">In case you missed it</div>' + icymiHtml : '');
}

// Up to 2 videos. Backward compatible with the old single `video` field.
const vidList = Array.isArray(data.videos) ? data.videos : (data.video ? [data.video] : []);
let videoHtml = '';
if (vidList.length) {
  videoHtml = '<div style="' + eyebrow + ';margin:22px 0 6px">Watch</div>';
  vidList.forEach(function (v) {
    const vidCat = (cfg.categoryHeaders && v.category) ? esc(v.category) + ' &middot; ' : '';
    videoHtml += '<div style="padding:4px 0 8px"><div style="font-size:13.5px;font-weight:600;color:#111">' + esc(v.title) + '</div>' +
      '<div style="font-size:12px;color:#777;line-height:1.6">' + vidCat + esc(v.channel || '') + ' &middot; <a href="' + esc(v.url) + '" style="color:' + A + ';text-decoration:none">Watch &rarr;</a></div></div>';
  });
}

const countLabel = items.length + (items.length === 1 ? ' story' : ' stories') + ' worth your time';

const emailHtml = '<div style="max-width:640px;margin:0 auto;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;background:#fafaf7;padding:14px">' +
  '<div style="text-align:center;font-size:11px;color:#888;padding:0 0 8px"><a href="' + feedUrl + '" style="color:' + A + '">View today\'s full feed &rarr;</a></div>' +
  '<div style="background:#fff;border-radius:8px;overflow:hidden;border:1px solid #eee">' +
  '<div style="border-bottom:3px solid ' + cfg.rule + ';padding:18px 26px 14px">' +
  '<div style="font-family:Georgia,serif;font-size:21px;color:#111">' + cfg.brand + ' Daily</div>' +
  '<div style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#999;margin-top:3px">' + countLabel + ' &middot; ' + esc(data.dateLabel) + '</div></div>' +
  '<div style="padding:12px 26px 24px">' +
  itemsHtml +
  videoHtml +
  '<div style="text-align:center;padding:22px 0 4px"><a href="' + feedUrl + '" style="display:inline-block;background:' + A + ';color:#fff;text-decoration:none;font-weight:600;font-size:13px;padding:11px 22px;border-radius:6px">See everything on the Daily Feed</a></div>' +
  '</div></div>' +
  '<div style="text-align:center;font-size:11px;color:#999;line-height:1.7;padding:18px 16px 4px">You subscribed at ' + cfg.domain + ' &middot; %%UNSUBSCRIBE%%</div></div>';

return [{ json: { skip: false, subject: data.subject, emailHtml: emailHtml, site: data.site } }];
