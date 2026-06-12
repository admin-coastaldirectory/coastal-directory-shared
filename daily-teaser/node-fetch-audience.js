// === Node: "Fetch Audience" (n8n Code node) ===
// Pulls this site's DAILY audience from the source of truth (cf_newsletter_subscribers):
// digest_frequency='daily' AND status='active' AND confirmed=true AND source_site=<site>.
// Reads email + unsub_token so every send carries a REAL per-recipient unsubscribe link
// (https://<domain>/manage-subscriptions.html?token=<unsub_token>).
// NOTE: the table's RLS only lets anon INSERT, so this read needs the service key.
//
// TEST MODE: while TEST_EMAIL is set, the send goes ONLY to that address. Set it to '' to go live.
const SB_SERVICE_KEY = 'PASTE_SUPABASE_SERVICE_KEY';
const SOURCE_SITE = 'comicstoresnearme';             // per-site: comicstoresnearme | coinsnearme | collectiblesfamous
const TEST_EMAIL = 'jhgreve@gmail.com';              // <-- TEST MODE. Set to '' to send to the real audience.

const data = $input.first().json;
if (data.skip) return [{ json: { skip: true, site: data.site, reason: 'no items in the last 24h' } }];

if (SB_SERVICE_KEY.indexOf('PASTE_') === 0) throw new Error('Paste the Supabase service_role key into the Fetch Audience node first.');

const SB = 'https://vtlgfwldogsdueiahidp.supabase.co/rest/v1/cf_newsletter_subscribers';
const qs = '?select=email,unsub_token&source_site=eq.' + SOURCE_SITE +
  '&digest_frequency=eq.daily&status=eq.active&confirmed=eq.true&limit=1000';
let resp = await this.helpers.httpRequest({
  method: 'GET', url: SB + qs,
  headers: { apikey: SB_SERVICE_KEY, Authorization: 'Bearer ' + SB_SERVICE_KEY }
});
const rows = Array.isArray(resp) ? resp : JSON.parse(resp || '[]');

const realCount = rows.length;
let audience = rows.map(function (r) { return { email: String(r.email || '').trim().toLowerCase(), unsub_token: r.unsub_token || '' }; })
  .filter(function (r) { return r.email; });

const testMode = !!(TEST_EMAIL && TEST_EMAIL.trim());
if (testMode) {
  const t = TEST_EMAIL.trim().toLowerCase();
  const match = audience.find(function (r) { return r.email === t; });
  audience = [match || { email: t, unsub_token: 'TEST' }];
}

return [{ json: { skip: false, site: data.site, testMode: testMode, realCount: realCount, audience: audience } }];
