// === Node: "Get Week's Comics" (n8n Code node) ===
// Pulls the past 7 days of approved Comics items (news + video) from the shared feed.
// Uses the public anon key (reads only) — same key the public daily-feed pages use.
const SB = 'https://vtlgfwldogsdueiahidp.supabase.co/rest/v1/cf_content_items';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0bGdmd2xkb2dzZHVlaWFoaWRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMjYyOTgsImV4cCI6MjA4ODYwMjI5OH0.L3rNdeNh_282W1BRsYBc64-64_l8bgHG6kMGSU4C048';

async function fetchRows(qs) {
  let resp = await this.helpers.httpRequest({
    method: 'GET', url: SB + qs,
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }
  });
  const r = (typeof resp === 'string') ? JSON.parse(resp) : resp;
  return Array.isArray(r) ? r : [];
}

const DAY = 86400000;
const sinceIso = new Date(Date.now() - 7 * DAY).toISOString();

const news = await fetchRows(
  '?select=title,summary,url,source_name,quality_score,published_at' +
  '&category=eq.Comics&type=eq.news&status=eq.approved' +
  '&published_at=gte.' + sinceIso +
  '&order=quality_score.desc.nullslast,published_at.desc&limit=10'
);
const videos = await fetchRows(
  '?select=title,author,url,quality_score,published_at' +
  '&category=eq.Comics&type=eq.video&status=eq.approved' +
  '&published_at=gte.' + sinceIso +
  '&order=quality_score.desc.nullslast,published_at.desc&limit=4'
);

// --- date labels + slug for this week ---
const MON = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const now = new Date();
const start = new Date(Date.now() - 6 * DAY);
const sameMonth = start.getMonth() === now.getMonth();
const dateRange = sameMonth
  ? MON[start.getMonth()] + ' ' + start.getDate() + '-' + now.getDate() + ', ' + now.getFullYear()
  : MON[start.getMonth()] + ' ' + start.getDate() + ' - ' + MON[now.getMonth()] + ' ' + now.getDate() + ', ' + now.getFullYear();
const slug = 'comic-news-week-of-' + MON[start.getMonth()].toLowerCase() + '-' + start.getDate() + '-' + now.getFullYear();

const LF = String.fromCharCode(10);
const stories_text = news.map((r, i) =>
  (i + 1) + '. ' + r.title + (r.summary ? '  --  ' + r.summary : '') +
  '  [source_name: ' + (r.source_name || 'source') + ' | url: ' + r.url + ']'
).join(LF);
const videos_text = videos.map((r, i) =>
  (i + 1) + '. ' + r.title + '  (channel: ' + (r.author || '') + ')  [url: ' + r.url + ']'
).join(LF);

return [{ json: { count: news.length, vcount: videos.length, dateRange, slug, year: now.getFullYear(), stories_text, videos_text, news, videos } }];
