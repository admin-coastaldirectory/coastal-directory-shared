// ============================================================
// city-local.js — computed "Local <shops> in <city>" paragraphs (2026-11-01)
// ============================================================
//
// City pages opened with two boilerplate paragraphs that read the same in
// every city ("Browse 12 verified card shops in Houston... Supporting your
// local shop is how the hobby stays alive"). Google sees thousands of pages
// with the same words and treats them as thin. This replaces them with facts
// worked out from the city's own listings, so each page says something only
// that page can say:
//
//   - how many walk-in shops (plus by-appointment sellers), total Google
//     reviews and the typical rating
//   - how many open on Sundays (named and linked) and stay open late
//   - what they carry, from the service / category badges
//   - how spread out they are (ZIP codes, farthest distance)
//   - upcoming shows in the city, else across the state
//
// Only walk-in shops count (appointment sellers have no address on the
// site). Every number comes from the same rows the page lists, so the copy
// can never contradict the list. Falls back to the old intro when a city has
// fewer than 3 walk-in shops or fewer than 2 facts to say.

const { escHtml, escAttr, slugify } = require('./util');
const { parseHours } = require('./shop-insights');

const WEEKNIGHTS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const LATE = 19 * 60; // 7 PM

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }

function listJoin(xs) {
  if (xs.length <= 1) return xs.join('');
  if (xs.length === 2) return xs[0] + ' and ' + xs[1];
  return xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1];
}

// Closing time of one day's hours text, in minutes after midnight.
// "10:00 AM – 7:00 PM" -> 1140, "11 AM to 1 AM" -> 1500, "Open 24 hours" -> 1440.
function closeMinutes(text) {
  const t = String(text || '');
  if (/24 hours/i.test(t)) return 24 * 60;
  if (!/[–—-]|\bto\b/i.test(t)) return null;
  // The closing time is the last clock time that carries AM/PM
  // ("12:00 – 8:00 PM", "10 AM to 5 PM", "12 PM to 12 AM").
  const times = [...t.matchAll(/(\d{1,2})(?::(\d{2}))?\s*([AaPp])\.?\s*[Mm]\b/g)];
  if (!times.length) return null;
  const last = times[times.length - 1];
  let h = Number(last[1]) % 12;
  if (/p/i.test(last[3])) h += 12;
  let mins = h * 60 + (Number(last[2]) || 0);
  if (mins < 6 * 60) mins += 24 * 60; // closes after midnight
  return mins;
}

function km(a, b) {
  const r = Math.PI / 180;
  const x = (b.lng - a.lng) * r * Math.cos(((a.lat + b.lat) / 2) * r);
  const y = (b.lat - a.lat) * r;
  return Math.sqrt(x * x + y * y) * 6371;
}

function median(xs) {
  const s = xs.slice().sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
}

function shopLink(s, stSlug, citySlug) {
  const slug = s.slug || slugify((s.name || '') + '-' + (s.city || ''));
  return `<a href="/shops/${stSlug}/${citySlug}/${escAttr(slug)}/">${escHtml(s.name)}</a>`;
}

// Event names come from scraped listings: "&#038;" entities, double spaces.
function cleanName(t) {
  return String(t || '').replace(/&#0?38;|&amp;/g, '&').replace(/&#0?39;|&#8217;/g, "'").replace(/\s+/g, ' ').trim();
}

// "November 7", or "June 13, 2027" when the date isn't in the current year.
function fmtDate(iso, today) {
  const d = new Date(String(iso).slice(0, 10) + 'T12:00:00Z');
  if (isNaN(d)) return String(iso);
  const sameYear = String(iso).slice(0, 4) === String(today || '').slice(0, 4);
  return d.toLocaleDateString('en-US', Object.assign({ month: 'long', day: 'numeric', timeZone: 'UTC' }, sameYear ? {} : { year: 'numeric' }));
}

// opts: { stateEvents, stateName, today }
function cityLocalHtml(city, shops, config, stSlug, citySlug, opts = {}) {
  try {
    const niche = config.niche || {};
    const plural = niche.shopTypePluralCapitalized
      ? niche.shopTypePluralCapitalized.toLowerCase()
      : ((niche.shopType || 'shop') + 's');
    const isAppt = s => !!(s.appointment_only || s.seller_type === 'appointment_online');
    const walk = shops.filter(s => !isAppt(s));
    const appt = shops.length - walk.length;
    if (walk.length < 3) return '';
    const C = escHtml(city);
    const facts = [];

    // 1. Size and reviews
    const rated = walk.filter(s => (num(s.total_score != null ? s.total_score : s.totalScore) || 0) > 0
      && (num(s.reviews_count != null ? s.reviews_count : s.reviewsCount) || 0) > 0);
    const totalReviews = rated.reduce((n, s) => n + num(s.reviews_count != null ? s.reviews_count : s.reviewsCount), 0);
    let p1 = `${C} has ${walk.length} walk-in ${plural} listed here`
      + (appt ? `, plus ${appt} that sell${appt === 1 ? 's' : ''} by appointment or online only` : '') + '.';
    if (rated.length >= 2) {
      const med = median(rated.map(s => num(s.total_score != null ? s.total_score : s.totalScore)));
      p1 += ` Between them they have ${totalReviews.toLocaleString('en-US')} Google reviews, and the typical shop rates ${med.toFixed(1)} stars.`;
    }

    // 2. Hours: Sundays and late nights
    const withHours = walk.map(s => ({ s, rows: parseHours(s.hours) })).filter(x => x.rows);
    if (withHours.length >= 2) {
      const sunday = withHours.filter(x => {
        const r = x.rows.find(d => d.day === 'Sunday');
        return r && !/^closed$/i.test(String(r.text).trim());
      });
      const late = withHours.filter(x => x.rows.some(d => WEEKNIGHTS.includes(d.day)
        && !/^closed$/i.test(String(d.text).trim()) && (closeMinutes(d.text) || 0) >= LATE));
      // Named examples: the most-reviewed Sunday shops (stable across builds).
      const rv = x => num(x.s.reviews_count != null ? x.s.reviews_count : x.s.reviewsCount) || 0;
      sunday.sort((a, b) => rv(b) - rv(a) || String(a.s.name).localeCompare(String(b.s.name)));
      const sundayNames = sunday.slice(0, 3).map(x => shopLink(x.s, stSlug, citySlug));
      let sun;
      if (!sunday.length) sun = `none list Sunday hours, so plan a weekend visit for Saturday`;
      else if (sunday.length <= 3) sun = `${sunday.length} open on Sundays (${listJoin(sundayNames)})`;
      else sun = `${sunday.length} open on Sundays, including ${listJoin(sundayNames)}`;
      const lateTxt = late.length
        ? `${late.length} stay${late.length === 1 ? 's' : ''} open until 7 PM or later on at least one weeknight`
        : `none stay open past 7 PM on weeknights`;
      facts.push(`Of the ${withHours.length} that post their hours, ${sun}, and ${lateTxt}.`);
    }

    // 3. What they carry (service badges, or Cards' category codes)
    const badge = niche.serviceBadge || {};
    const counts = {};
    for (const s of walk) {
      const codes = new Set([...(s.services || []), ...(Array.isArray(s.categories) ? s.categories : [])]
        .map(c => String(c).trim().toLowerCase()));
      for (const c of codes) if (badge[c]) counts[c] = (counts[c] || 0) + 1;
    }
    const top = Object.entries(counts).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 4);
    if (top.length >= 2) {
      // "Sports cards" -> "sports cards" mid-sentence; names and acronyms stay.
      const lc = l => (/^(Pokémon|Magic|Yu-Gi-Oh)/.test(l) || !/^[A-Z][a-z]/.test(l)) ? l : l[0].toLowerCase() + l.slice(1);
      const parts = top.map(([c, n], i) => `${escHtml(lc(badge[c]))} (${n}${i === 0 ? ` of ${walk.length} shops` : ''})`);
      facts.push(`What they list most often: ${listJoin(parts)}.`);
    }

    // 4. Spread: ZIP codes and farthest distance
    const zips = {};
    for (const s of walk) { const z = String(s.zip || '').trim().slice(0, 5); if (/^[0-9A-Z]{3,5}$/i.test(z)) zips[z] = (zips[z] || 0) + 1; }
    const zipList = Object.entries(zips).sort((a, b) => b[1] - a[1]);
    const pts = walk.map(s => ({ lat: num(s.lat), lng: num(s.lng) }))
      .filter(p => p.lat != null && p.lng != null && (p.lat !== 0 || p.lng !== 0));
    let spreadMi = null;
    if (pts.length >= 3) {
      const mid = { lat: median(pts.map(p => p.lat)), lng: median(pts.map(p => p.lng)) };
      const near = pts.filter(p => km(mid, p) <= 60);
      let max = 0;
      for (let i = 0; i < near.length; i++) for (let j = i + 1; j < near.length; j++) max = Math.max(max, km(near[i], near[j]));
      if (max >= 1.6) spreadMi = Math.round(max / 1.609);
    }
    if (zipList.length >= 2 && Object.values(zips).reduce((a, b) => a + b, 0) >= 3) {
      let t = `They're spread across ${zipList.length} ZIP codes`;
      if (spreadMi) t += `, up to about ${spreadMi} miles apart`;
      if (zipList[0][1] >= 2) t += `; ${escHtml(zipList[0][0])} has the most, with ${zipList[0][1]}`;
      facts.push(t + '.');
    } else if (spreadMi) {
      facts.push(`The farthest two are about ${spreadMi} miles apart.`);
    }

    // 5. Upcoming shows
    const today = opts.today || new Date().toISOString().slice(0, 10);
    const showNoun = String(niche.eventNounCapitalized || 'shows').toLowerCase();
    const upcoming = (opts.stateEvents || [])
      .filter(e => e && e.name && e.start_date && String(e.end_date || e.start_date).slice(0, 10) >= today)
      .sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)));
    if (upcoming.length) {
      const here = upcoming.filter(e => String(e.city || '').trim().toLowerCase() === String(city).trim().toLowerCase());
      const evLink = `/events/${stSlug}/`;
      if (here.length) {
        const e = here[0];
        facts.push(`${here.length === 1 ? 'One' : here.length} upcoming ${escHtml(here.length === 1 ? showNoun.replace(/s$/, '') : showNoun)} ${here.length === 1 ? 'is' : 'are'} listed in ${C}; the next is ${escHtml(cleanName(e.name))} ${String(e.start_date).slice(0, 10) < today ? `(on now, through ${fmtDate(e.end_date, today)})` : `on ${fmtDate(e.start_date, today)}`}.`
          + (!opts.stateName ? ''
            : upcoming.length > here.length ? ` <a href="${evLink}">See all ${upcoming.length} across ${escHtml(opts.stateName)}</a>.`
            : ` Dates and details are on the <a href="${evLink}">${escHtml(opts.stateName)} ${escHtml(showNoun)} page</a>.`));
      } else if (opts.stateName) {
        facts.push(`No ${escHtml(showNoun)} are listed in ${C} right now, but there ${upcoming.length === 1 ? 'is' : 'are'} <a href="${evLink}">${upcoming.length} coming up across ${escHtml(opts.stateName)}</a>.`);
      }
    }

    if (facts.length < 2) return '';
    return `<!-- city-local:start -->
<h2>Local ${escHtml(niche.shopType || 'shop')}s in ${C}</h2>
<p>${p1}</p>
<p>${facts.join(' ')}</p>
<!-- city-local:end -->`;
  } catch (e) {
    return '';
  }
}

module.exports = { cityLocalHtml, closeMinutes };

// Swaps the generic intro on a finished city page for the computed one.
// Called from generate.js right after cityPage(), which still renders
// descriptions.cityIntroHtml(); the generic block is the same string both
// places compute, so the replace is exact. Small cities keep the generic
// intro (cityLocalHtml returns '').
function applyCityLocal(html, city, stateCode, shops, config, stateEvents) {
  try {
    const { stateName } = require('./states');
    const descriptions = require('./descriptions');
    const sn = stateName(stateCode);
    const local = cityLocalHtml(city, shops, config, slugify(sn), slugify(city) || 'other', { stateEvents, stateName: sn });
    if (!local) return html;
    const generic = descriptions.cityIntroHtml(city, stateCode, shops, config);
    const i = html.indexOf(generic);
    return i === -1 ? html : html.slice(0, i) + local + html.slice(i + generic.length);
  } catch (e) {
    return html;
  }
}

module.exports.applyCityLocal = applyCityLocal;
