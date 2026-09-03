# INVENTORY — do not rebuild, extend

_Seeded 2026-09-03. Partial — backfill from live tools. Precedence: live check > this file._

## Newsletters (Beehiiv — account jgreve@coastaldirectoryllc.com, workspace "Joe's Hiiv")
- **CoinsCollx** — pub_025f7d6d-29ac-45f4-8404-30d5d85b0e29 (coinsnearme.co)
- **CardsCollx** — pub_6b9a2d2e-a6ab-43e5-9990-0c6a95f896d1 (localcardshopsnearme.com)
- **ComicCollx** — pub_c30766db-0c0f-472d-a971-328ef604d39a (comicstoresnearme.com)
- Cadence: DAILY issues (~6 AM ET, auto-publish) + MONTHLY roundup (LIVE SEND, 2nd of month). Both verified sending 2026-09.
- Content pipeline: Supabase `vtlgfwldogsdueiahidp` tables `cf_newsletter_issues` (staged) + `cf_content_items` (feed). n8n builds + renders.

## Sites / repos (GitHub admin-coastaldirectory)
- coinsnearme · comicstore · localcardshopsnearme · coastal-directory-shared (canonical) · Collectiblefind · SMBprofind · youthsportsconnect · cheffind1 · Cheffind

## Scheduled tasks (21 live as of 2026-09-03) — key ones
- Monthly PUBLISH (LIVE SEND): CoinsCollx trig_011azuFnXPEM3j36DbAvcfQw · CardsCollx trig_015YkuPVSUiWE2VRAfMt8cEk · ComicCollx trig_01WhTkUCm7uXBYqMsSuAnqTv (all `... 2 * *`, ~1 AM UTC). Status shows ABANDONED but SEND COMPLETES — cosmetic, verify by beehiiv published post.
- Daily Guard — newsletter sends + lead-flow tripwire (silent on success) trig_0181pMVPM1j1sLKkpuJ9tTRE (20 12 * * 1-6)
- Weekly newsletter spot-check trig_018eDdgVtgmhmVAnTJUtXjNP (Sun)
- Nightly ad offer pre-claim (all 3 pubs) trig_01B27sHrtN7mV26vyr8hjimb
- CoS: Sunday review trig_019LP8fTNwoTW4kkGQ8WWimA · Evening check-in trig_015wmWc9CVykiVV2t213NFXK · Morning brief trig_01YM8uzGzAhRBB1KondaYL6Q
- Events monthly refresh: Comic trig_014dipodcdWcVxJrYYi2sTmD · Coins trig_01P5NUdjEJBmNWtJTmLvU6D3 · LCS trig_01YHeaW5tnQsXv7FZatno5Ag
- eBay MI scope watcher trig_01RF6Uxe14vPLYkYZH6nWwwW · CoinsNearMe warmup check trig_01RZzuBScBEZekmNZQetzvnC

## Connectors (verify with ListConnectors)
Beehiiv, Supabase, n8n, GitHub, Gmail, Google Cal/Drive, Netlify, Clay, Hunter, Instantly, Smartlead, Facebook Ads, Stripe, GHL, Cloudflare.
