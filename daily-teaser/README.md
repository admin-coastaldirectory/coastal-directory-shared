# Daily Teaser Kit (daily email + GHL send engine)

Canonical, reusable engine for the network's **daily teaser email** - email only, no blog page
(a daily page would be thin, near-duplicate content). Each morning a site's subscribers get the
top approved feed items from the last 24h, Axios Smart Brevity style, each linking out to the
source, plus a button to the site's /daily-feed.

**LIVE since 2026-06-12 on all three sites** (n8n, 7:00 AM ET daily, workflow timezone pinned
to America/New_York):

| Site | n8n workflow | id |
|---|---|---|
| ComicStoresNearMe | Daily Teaser - Comics | qEsNNEK3jqNzjbjM |
| CoinsNearMe | Daily Teaser - Coins | HwFVVUjtXJkWlyaw |
| CollectiblesFamous | Daily Teaser - Collectibles | hISkKY0HYOqHz9n7 |

n8n is the source of truth; this folder is the canonical copy of the node code for reuse / new sites.

## Pipeline (one n8n workflow, 6 nodes)

`Daily 7 AM -> Get Daily Items -> Build Daily Email -> Fetch Audience -> Send via GHL -> Report (Outlook)`

| File | Node |
|---|---|
| node-get-daily.js | Pulls top news+blog items (24h) + up to 2 videos (48h) from cf_content_items. Up to 7 fresh stories; CF picks the best story per category (top 6, linked category headers). Thin days backfill to 5 from the 24-48h window ("In case you missed it"). Emits skip:true when 0 FRESH items - the send is skipped (never send an empty teaser). |
| node-build-daily.js | Pure templating, no AI. Axios-style email -> { subject, emailHtml }. Subject = lead headline. Unsubscribe is the %%UNSUBSCRIBE%% placeholder. |
| node-fetch-audience.js | Audience = source of truth: cf_newsletter_subscribers (digest_frequency=daily, status=active, confirmed=true, source_site=<site>). Carries each subscriber's unsub_token so every email gets a real per-recipient unsubscribe link (manage-subscriptions.html?token=...). Needs the Supabase service_role key (RLS: anon is INSERT-only). TEST_EMAIL const = send only to that address while testing. |
| node-send-ghl.js | Per recipient: GHL contact lookup by email -> upsert if missing (heals sync gaps, same tags as subscriber-sync) -> skip DND -> POST /conversations/messages { type:'Email', contactId, subject, html } -> 500ms throttle. Outputs a report for the Outlook node. Never set executeOnce on this node. |
| build-daily-workflow.js | Assembles the 6-node workflow JSON from these files. |
| daily-teaser.workflow.json | Ready-to-import workflow (Comics variant, secrets as PASTE_ placeholders). |

## Cloning to a new site

Only 3 constants + the workflow name change:

1. node-get-daily.js: `const SITE = 'comics'` (add a CONFIG block for the new site: brand, domain, accent, categoryFilter)
2. node-fetch-audience.js: `const SOURCE_SITE = '<source_site value in cf_newsletter_subscribers>'`
3. node-send-ghl.js: `const SITE_DOMAIN = '<domain>'` (+ its entry in SITE_TAG)

Secrets: paste the Supabase service_role key into Fetch Audience and the "Newsletter & Contacts"
GHL Private Integration token (NOT the social one) into Send via GHL. Test first: set TEST_EMAIL,
run once, eyeball the email, then set TEST_EMAIL = '' and activate (n8n activate needs {versionId}).

## Audience / tag model

Subscribers flow: site /subscribe page -> cf_newsletter_subscribers -> live "Subscriber Sync" workflow
mirrors to GHL with tags `comics-digest|coins-digest|collectibles-digest` + `digest-daily|digest-weekly`
+ `newsletter`; unsubscribed -> GHL DND. The daily send reads Supabase directly (not GHL tags) so it
always has unsub_token; GHL DND is still respected as a second layer.

## Gotchas

- Inside n8n Code nodes use this.helpers.httpRequest - bare fetch is not defined.
- The weekly/monthly subscriber sends (Phase 2) can reuse Fetch Audience + Send via GHL unchanged -
  just switch digest_frequency and feed them the weekly emailHtml.
- Joe gets an Outlook report every run, including skip days.
