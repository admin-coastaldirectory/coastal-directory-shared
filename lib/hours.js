// ============================================================
// hours.js — turn "Monday: 11 AM to 6 PM; Tuesday: …" into data
// ============================================================
//
// Added 2026-10-27 (competitor review, all 3 sites). Competitors show
// today's hours / open-now on every listing, and Google reads hours from
// schema.org openingHoursSpecification, not from a free-text string.
//
//   dayRanges(text)         "12 to 9 PM, 10 PM to 2 AM" -> [[720,1260],[1320,120]]
//                           "Closed" -> [] ; "Open 24 hours" -> [[0,1440]] ; junk -> null
//   openingHoursSpec(raw)   schema.org OpeningHoursSpecification[] or null
//   compactHours(raw)       "1100-1800|1100-1800|…|" (Mon..Sun, "" = closed) or ''
//   HOURS_TODAY_SCRIPT      tiny browser script that fills .hours-today on cards
//
// Pure functions, no I/O. Anything we can't read returns null/'' so the
// caller just leaves the fact out.

const { parseHours } = require('./shop-insights');

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// "11", "11:30", "12" + "AM"/"PM" -> minutes after midnight
function toMin(h, m, mer) {
  let hh = Number(h) % 12;
  if (/p/i.test(mer)) hh += 12;
  return hh * 60 + (Number(m) || 0);
}

const T = '(\\d{1,2})(?::(\\d{2}))?\\s*(AM|PM|a\\.m\\.|p\\.m\\.)?';
const RANGE = new RegExp('^' + T + '\\s*(?:to|-|–|—)\\s*' + T + '$', 'i');

function oneRange(part) {
  const p = part.trim().replace(/\s+/g, ' ');
  if (/^open 24 hours$/i.test(p)) return [0, 1440];
  const m = p.match(RANGE);
  if (!m) return null;
  let [, h1, m1, a1, h2, m2, a2] = m;
  if (!a2) return null;               // need at least the closing meridiem
  const close = toMin(h2, m2, a2);
  let open;
  if (a1) open = toMin(h1, m1, a1);
  else {
    // "12 to 9 PM" shares the closing meridiem unless that puts the
    // opening after the close on the same day ("11 to 2 PM" = 11 AM).
    open = toMin(h1, m1, a2);
    if (open > close) open = toMin(h1, m1, /p/i.test(a2) ? 'AM' : 'PM');
  }
  return [open, close];
}

function dayRanges(text) {
  const t = String(text || '').trim();
  if (!t) return null;
  if (/^closed$/i.test(t)) return [];
  const out = [];
  for (const part of t.split(/\s*,\s*/)) {
    const r = oneRange(part);
    if (!r) return null;
    out.push(r);
  }
  return out;
}

function hhmm(min) {
  const m = ((min % 1440) + 1440) % 1440;
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}

// Week as [[day, ranges]] or null when any day can't be read.
function week(raw) {
  const rows = parseHours(raw);
  if (!rows) return null;
  const out = [];
  for (const r of rows) {
    const ranges = dayRanges(r.text);
    if (ranges == null) return null;
    out.push([r.day, ranges]);
  }
  return out;
}

function openingHoursSpec(raw) {
  const w = week(raw);
  if (!w) return null;
  const spec = [];
  for (const [day, ranges] of w) {
    for (const [o, c] of ranges) {
      spec.push({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: 'https://schema.org/' + day,
        opens: hhmm(o),
        closes: c >= 1440 || (c === 0 && o > 0) ? '23:59' : hhmm(c),
      });
    }
  }
  return spec.length ? spec : null;
}

// Mon..Sun separated by "|"; each day "HHMM-HHMM,HHMM-HHMM", "" = closed,
// "x" = unknown (day missing from the data).
function compactHours(raw) {
  const w = week(raw);
  if (!w) return '';
  const byDay = Object.fromEntries(w);
  return DAYS.map(d => {
    if (!byDay[d]) return 'x';
    return byDay[d].map(([o, c]) => hhmm(o).replace(':', '') + '-' + hhmm(c >= 1440 ? 1439 : c).replace(':', '')).join(',');
  }).join('|');
}

// Fills every <span class="hours-today" data-h="…"> with today's hours and
// open/closed, using the visitor's clock (they are almost always in the same
// time zone as a shop they're browsing by city). No data -> span stays empty.
const HOURS_TODAY_SCRIPT = `<script>(function(){var d=new Date(),i=(d.getDay()+6)%7,n=d.getHours()*60+d.getMinutes();
function f(m){var h=Math.floor(m/60)%24,mm=m%60,ap=h<12?'AM':'PM',h12=h%12||12;return h12+(mm?':'+(mm<10?'0':'')+mm:'')+' '+ap}
function p(s){return s.split(',').filter(Boolean).map(function(r){var a=r.split('-');return[+a[0].slice(0,2)*60+ +a[0].slice(2),+a[1].slice(0,2)*60+ +a[1].slice(2)]})}
document.querySelectorAll('.hours-today[data-h]').forEach(function(el){var w=el.getAttribute('data-h').split('|');if(w.length!==7||w[i]==='x')return;
var r=p(w[i]),open=r.some(function(x){return x[1]>x[0]?n>=x[0]&&n<x[1]:n>=x[0]||n<x[1]}),t;
if(!r.length){t='Closed today'}else if(r.length===1&&r[0][0]===0&&r[0][1]>=1439){t='Open 24 hours'}else{t='Today '+r.map(function(x){return f(x[0])+'–'+f(x[1]===1439?1440:x[1])}).join(', ')}
el.innerHTML=(r.length?'<b style="color:'+(open?'#1b7f3b':'#9a3412')+'">'+(open?'Open now':'Closed now')+'</b> · ':'')+t;});})();</script>`;

module.exports = { dayRanges, openingHoursSpec, compactHours, HOURS_TODAY_SCRIPT };
