// === Node: "Get Daily Items" (n8n Code node) ===
// Daily teaser pull: top approved news+blog items from the last 24 hours (+ up to 2 videos)
// for one site's category. Set SITE below - 'comics' | 'coins' | 'collectibles'.
const SITE = 'comics';

const CONFIG = {
  comics: {
    brand: 'ComicStoresNearMe',
    domain: 'comicstoresnearme.com',
    accent: '#c03030',
    rule: '#c03030',
    gtag: 'G-3LKP95PGDN',
    categoryFilter: '&category=eq.Comics',
    categoryHeaders: false
  },
  coins: {
    brand: 'CoinsNearMe',
    domain: 'coinsnearme.co',
    accent: '#1a3a5c',        // NAVY accent. Gold is the brand-rule ONLY, never the accent.
    rule: '#c9a227',          // gold brand-rule under the logo
    gtag: 'G-6NBHQKVXET',
    categoryFilter: '&category=eq.Coins',
    categoryHeaders: false
  },
  collectibles: {
    brand: 'CollectiblesFamous',
    domain: 'collectiblesfamous.com',
    accent: '#B8872A',
    rule: '#B8872A',
    gtag: 'G-4J2DWC5P8K',
    categoryFilter: '&category=not.in.(%22N%2FA%22%2C%22Off-topic%22)',
    categoryHeaders: true,
    onePerCategory: true,
    catFeeds: {
      'Comics': 'https://comicstoresnearme.com/daily-feed',
      'Coins': 'https://coinsnearme.co/daily-feed',
      'Sports Cards': 'https://collectiblesfamous.com/sports-cards',
      'Trading Cards': 'https://collectiblesfamous.com/trading-cards',
      'Stamps': 'https://collectiblesfamous.com/stamps',
      'Toys': 'https://collectiblesfamous.com/toys',
      'Antiques & Art': 'https://collectiblesfamous.com/antiques-art',
      'Memorabilia': 'https://collectiblesfamous.com/memorabilia',
      'Vintage': 'https://collectiblesfamous.com/vintage',
      'Sneakers': 'https://collectiblesfamous.com/sneakers',
      'Jewelry': 'https://collectiblesfamous.com/jewelry',
      'Watches': 'https://collectiblesfamous.com/watches'
    }
  }
};
const cfg = CONFIG[SITE];

const SB = 'https://vtlgfwldogsdueiahidp.supabase.co/rest/v1/cf_content_items';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0bGdmd2xkb2dzZHVlaWFoaWRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMjYyOTgsImV4cCI6MjA4ODYwMjI5OH0.L3rNdeNh_282W1BRsYBc64-64_l8bgHG6kMGSU4C048';

let HOURS = 24;

async function fetchRows(qs) {
  const url = SB + qs;
  const headers = { apikey: KEY, Authorization: 'Bearer ' + KEY };
  let resp;
  if (typeof this !== 'undefined' && this && this.helpers && this.helpers.httpRequest) {
    resp = await this.helpers.httpRequest({ method: 'GET', url: url, headers: headers });
  } else {
    const r = await fetch(url, { headers: headers });
    resp = await r.json();
  }
  const out = (typeof resp === 'string') ? JSON.parse(resp) : resp;
  return Array.isArray(out) ? out : [];
}

const sinceIso = new Date(Date.now() - HOURS * 3600000).toISOString();
const since48Iso = new Date(Date.now() - 2 * HOURS * 3600000).toISOString();
const SELECT = '?select=category,type,title,summary,url,source_name,author,published_at,quality_score';

// Fresh pool: news + blog items from the last 24h.
const rows = await fetchRows(
  SELECT + '&type=in.(news,blog)&status=eq.approved' + cfg.categoryFilter +
  '&published_at=gte.' + sinceIso +
  '&order=quality_score.desc.nullslast,published_at.desc&limit=' + (cfg.onePerCategory ? 40 : 7)
);

// onePerCategory: best story per category, top 6 categories.
let items = rows;
if (cfg.onePerCategory) {
  const byCat = {};
  rows.forEach(function (r) { const c = r.category || 'Other'; if (!byCat[c]) byCat[c] = r; });
  items = Object.keys(byCat).map(function (c) { return byCat[c]; })
    .sort(function (a, b) {
      return (Number(b.quality_score) || 0) - (Number(a.quality_score) || 0) ||
             new Date(b.published_at) - new Date(a.published_at);
    })
    .slice(0, 6);
}
items.forEach(function (r) { r.icymi = false; });
const freshCount = items.length;

// Thin day on a single-category site? Backfill to 5 from the 24-48h window ("In case you missed it").
// Only when there IS fresh news - never send a teaser made purely of reruns.
if (!cfg.onePerCategory && freshCount > 0 && freshCount < 5) {
  const older = await fetchRows(
    SELECT + '&type=in.(news,blog)&status=eq.approved' + cfg.categoryFilter +
    '&published_at=gte.' + since48Iso + '&published_at=lt.' + sinceIso +
    '&order=quality_score.desc.nullslast,published_at.desc&limit=' + (5 - freshCount)
  );
  older.forEach(function (r) { r.icymi = true; items.push(r); });
}

// Up to 2 recent videos (48h window so quiet days still get one).
const vids = await fetchRows(
  SELECT + '&type=eq.video&status=eq.approved' + cfg.categoryFilter +
  '&published_at=gte.' + since48Iso +
  '&order=quality_score.desc.nullslast,published_at.desc&limit=2'
);

// --- date label pinned to US Eastern ---
let dateLabel;
try {
  dateLabel = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date());
} catch (e) {
  const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const MON = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const now = new Date();
  dateLabel = DAYS[now.getDay()] + ', ' + MON[now.getMonth()] + ' ' + now.getDate() + ', ' + now.getFullYear();
}

const decode = (s) => String(s == null ? '' : s)
  .replace(/&#(\d+);/g, function (m, n) { return String.fromCharCode(Number(n)); })
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'")
  .replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ');

let subject = items.length ? decode(items[0].title).trim() : '';
if (subject.length > 78) subject = subject.slice(0, 75).replace(/\s+\S*$/, '') + '...';
if (!subject) subject = cfg.brand + ' Daily - ' + dateLabel;

return [{ json: {
  skip: freshCount === 0,   // workflow MUST stop on skip:true - never send an empty teaser
  site: SITE,
  cfg: cfg,
  subject: subject,
  dateLabel: dateLabel,
  freshCount: freshCount,
  items: items.map(function (r) { return {
    category: r.category,
    title: decode(r.title),
    summary: decode(r.summary),
    url: decode(r.url),
    source_name: r.source_name,
    icymi: r.icymi === true
  }; }),
  videos: vids.map(function (v) { return {
    category: v.category,
    title: decode(v.title),
    url: decode(v.url),
    channel: v.author || v.source_name
  }; })
} }];
