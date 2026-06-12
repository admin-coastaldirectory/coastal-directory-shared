// === Node: "Send via GHL" (n8n Code node) ===
// For each audience member: find (or upsert) the GHL contact by email, skip DND,
// swap %%UNSUBSCRIBE%% for their personal manage-subscriptions link, then send the
// email through GHL conversations. Throttled. Never set executeOnce on this node.
const GHL = 'PASTE_NEWSLETTER_CONTACTS_TOKEN';
const SITE_DOMAIN = 'comicstoresnearme.com';   // per-site: comicstoresnearme.com | coinsnearme.co | collectiblesfamous.com
const LOC = 'MHmcNUWmcWAPevl1QVXm';
const B = 'https://services.leadconnectorhq.com';
const H = { Authorization: 'Bearer ' + GHL, Version: '2021-07-28', 'Content-Type': 'application/json', Accept: 'application/json' };

// Same tags the live subscriber-sync workflow writes - used only when upserting a missing contact.
const SITE_TAG = { 'comicstoresnearme.com': 'comics-digest', 'coinsnearme.co': 'coins-digest', 'collectiblesfamous.com': 'collectibles-digest' }[SITE_DOMAIN];

const a = $input.first().json;
const label = 'Daily Teaser (' + SITE_DOMAIN + ')';
if (a.skip) return [{ json: { skip: true, sent: 0, reportSubject: label + ': skipped - ' + (a.reason || 'no items'), reportHtml: '<p>No approved items in the last 24 hours, so no email was sent. This is normal on quiet days.</p>' } }];

if (GHL.indexOf('PASTE_') === 0) throw new Error('Paste the Newsletter & Contacts GHL token into the Send via GHL node first.');

const built = $('Build Daily Email').first().json;

const self = this;
async function http(method, url, body) {
  return await self.helpers.httpRequest({ method: method, url: url, headers: H, body: body || undefined, json: true });
}
const sleep = (ms) => new Promise(function (res) { setTimeout(res, ms); });

let sent = 0, dndSkipped = 0, upserted = 0; const failures = [];
for (const sub of (a.audience || [])) {
  try {
    let contact = null;
    try {
      const s = await http('GET', B + '/contacts/?locationId=' + LOC + '&query=' + encodeURIComponent(sub.email));
      contact = ((s && s.contacts) || []).find(function (c) { return String(c.email || '').toLowerCase() === sub.email; }) || null;
    } catch (e) {}
    if (!contact) {
      const up = await http('POST', B + '/contacts/upsert', { locationId: LOC, email: sub.email, tags: [SITE_TAG, 'digest-daily', 'newsletter'] });
      contact = (up && up.contact) || null;
      upserted++;
    }
    if (!contact || !contact.id) { failures.push(sub.email + ': no GHL contact'); continue; }
    if (contact.dnd === true) { dndSkipped++; continue; }

    const unsub = '<a href="https://' + SITE_DOMAIN + '/manage-subscriptions.html?token=' + encodeURIComponent(sub.unsub_token || '') + '" style="color:#999">Unsubscribe</a>';
    const html = String(built.emailHtml).split('%%UNSUBSCRIBE%%').join(unsub);

    await http('POST', B + '/conversations/messages', { type: 'Email', contactId: contact.id, subject: built.subject, html: html });
    sent++;
  } catch (e) {
    failures.push(sub.email + ': ' + (e && e.message ? e.message.slice(0, 200) : 'error'));
  }
  await sleep(500); // throttle
}

const mode = a.testMode ? ' [TEST MODE - only ' + (a.audience[0] && a.audience[0].email) + ']' : '';
const reportSubject = label + ': ' + sent + ' sent' + mode + ' - ' + built.subject;
const reportHtml = '<p><b>' + label + '</b>' + mode + '</p>' +
  '<p>Sent: ' + sent + ' &middot; DND skipped: ' + dndSkipped + ' &middot; upserted into GHL: ' + upserted +
  ' &middot; real daily audience: ' + a.realCount + (failures.length ? ' &middot; <b style="color:#b00">failures: ' + failures.length + '</b>' : '') + '</p>' +
  (failures.length ? '<p style="color:#b00;font-size:12px">' + failures.join('<br>') + '</p>' : '') +
  '<hr><p><b>What subscribers got:</b> (subject: ' + built.subject + ')</p>' + built.emailHtml;

return [{ json: { skip: false, sent: sent, dndSkipped: dndSkipped, upserted: upserted, failures: failures, testMode: a.testMode, reportSubject: reportSubject, reportHtml: reportHtml } }];
