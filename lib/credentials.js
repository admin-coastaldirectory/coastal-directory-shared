// ============================================================
// credentials.js — dealer credentials (Coins, added 2026-10-28)
// ============================================================
//
// shop.credentials is a text[] of codes matched from the public dealer
// directories (NGC dealer locator, PCGS authorized dealer directory, CAC
// authorized dealers, PNG member directory, ANA Dealer Directory) by phone,
// website domain or exact name + city. Evidence lives in
// enrich_facts.credentials. Every competitor locator that outranks us
// (NGC, ANA, PCGS) shows these; "is this a reputable dealer?" is the intent
// behind "coin dealer near me".
//
// Only Coins has the column. On other sites shop.credentials is undefined,
// so every helper here returns '' / [] and nothing renders.

const { escHtml, slugify } = require('./util');

const CREDENTIALS = {
  ngc: {
    label: 'NGC Authorized Dealer', short: 'NGC Authorized',
    org: 'Numismatic Guaranty Company (NGC)', url: 'https://www.ngccoin.com/',
    source: 'NGC Coin Dealer Locator',
  },
  'ngc-osc': {
    label: 'NGC Official Submission Center', short: 'NGC Submission Center',
    org: 'Numismatic Guaranty Company (NGC)', url: 'https://www.ngccoin.com/',
    source: 'NGC Coin Dealer Locator',
  },
  pcgs: {
    label: 'PCGS Authorized Dealer', short: 'PCGS Authorized',
    org: 'Professional Coin Grading Service (PCGS)', url: 'https://www.pcgs.com/',
    source: 'PCGS Authorized Dealer Directory',
  },
  cac: {
    label: 'CAC Authorized Dealer', short: 'CAC Authorized',
    org: 'CAC Grading', url: 'https://www.cacgrading.com/',
    source: 'CAC Authorized Dealer list',
  },
  png: {
    label: 'PNG Member', short: 'PNG Member',
    org: 'Professional Numismatists Guild (PNG)', url: 'https://www.pngdealers.org/',
    source: 'PNG Member Directory',
  },
  ana: {
    label: 'ANA Member Dealer', short: 'ANA Member',
    org: 'American Numismatic Association (ANA)', url: 'https://www.money.org/',
    source: 'ANA Dealer Directory',
  },
};
const ORDER = ['ngc', 'ngc-osc', 'pcgs', 'cac', 'png', 'ana'];

function credentialCodes(shop) {
  const raw = Array.isArray(shop && shop.credentials) ? shop.credentials : [];
  const set = new Set(raw.map(c => String(c).trim().toLowerCase()));
  return ORDER.filter(c => set.has(c));
}

// Small chips for listing cards (plain spans: the card is already an <a>).
function credentialChips(shop) {
  const codes = credentialCodes(shop).filter(c => c !== 'ngc-osc' || !credentialCodes(shop).includes('ngc'));
  if (!codes.length) return '';
  return '<div class="creds" style="display:flex;flex-wrap:wrap;gap:4px;margin:-4px 0 10px">'
    + codes.map(c => `<span title="${escHtml(CREDENTIALS[c].label)}" style="font-size:11px;font-weight:600;line-height:1;padding:4px 7px;border-radius:10px;border:1px solid #c9a227;color:#6b5310;background:#fdf8e6">&#10003; ${escHtml(CREDENTIALS[c].short)}</span>`).join('')
    + '</div>';
}

// "Dealer credentials" block for a shop page.
function credentialsSection(shop) {
  const codes = credentialCodes(shop);
  if (!codes.length) return '';
  const name = escHtml(shop.name);
  return '<div class="dealer-credentials" style="margin:20px 0;padding:16px 18px;border:1px solid #e8dcb0;border-radius:10px;background:#fffdf5">'
    + '<h2 style="margin:0 0 8px;font-size:20px">Dealer credentials</h2>'
    + `<p style="margin:0 0 10px;font-size:14px;color:#555">${name} appears in these public dealer directories:</p>`
    + '<ul style="margin:0;padding-left:20px;line-height:1.6">'
    + codes.map(c => `<li><strong>${escHtml(CREDENTIALS[c].label)}</strong> <span style="color:#666;font-size:13px">— listed in the <a href="${CREDENTIALS[c].url}" target="_blank" rel="noopener nofollow">${escHtml(CREDENTIALS[c].source)}</a></span></li>`).join('')
    + '</ul>'
    + '<p style="margin:10px 0 0;font-size:12px;color:#777">Checked October 2026 against each organization\'s public directory. Memberships change; confirm with the dealer before a large purchase or sale.</p>'
    + '</div>';
}

// Plain-text phrase for meta descriptions: "PCGS & NGC authorized".
function credentialPhrase(shop) {
  const codes = credentialCodes(shop);
  const auth = ['pcgs', 'ngc', 'cac'].filter(c => codes.includes(c)).map(c => c.toUpperCase());
  if (auth.length) return (auth.length === 1 ? auth[0] : auth.slice(0, -1).join(', ') + ' & ' + auth[auth.length - 1]) + ' authorized';
  if (codes.includes('png')) return 'PNG member';
  if (codes.includes('ana')) return 'ANA member';
  return '';
}

// schema.org: ProgramMembership for each credential (memberOf on the
// LocalBusiness). Authorized-dealer programs and memberships both fit.
function credentialsSchema(shop) {
  return credentialCodes(shop).map(c => ({
    '@type': 'ProgramMembership',
    programName: CREDENTIALS[c].label,
    hostingOrganization: { '@type': 'Organization', name: CREDENTIALS[c].org, url: CREDENTIALS[c].url },
  }));
}

// "Authorized and member dealers in <city>" block for a city page.
function cityCredentialsSection(city, shops, stSlug, citySlug, shopTypePlural) {
  const withCreds = shops.filter(s => credentialCodes(s).length);
  if (!withCreds.length) return '';
  const counts = {};
  for (const s of withCreds) for (const c of credentialCodes(s)) counts[c] = (counts[c] || 0) + 1;
  const COUNT_LABEL = { pcgs: 'PCGS authorized', ngc: 'NGC authorized', cac: 'CAC authorized', png: 'PNG member', ana: 'ANA member' };
  const summary = ['pcgs', 'ngc', 'cac', 'png', 'ana'].filter(c => counts[c])
    .map(c => `${counts[c]} ${COUNT_LABEL[c]}${/member$/.test(COUNT_LABEL[c]) && counts[c] > 1 ? 's' : ''}`);
  const items = withCreds.slice(0, 12).map(s => {
    const slug = s.slug || slugify((s.name || '') + '-' + (s.city || ''));
    const labels = credentialCodes(s).filter(c => c !== 'ngc-osc' || !credentialCodes(s).includes('ngc')).map(c => CREDENTIALS[c].short).join(' · ');
    return `<li><a href="/shops/${stSlug}/${citySlug}/${slug}/">${escHtml(s.name)}</a> <span style="color:#6b5310;font-size:13px">${escHtml(labels)}</span></li>`;
  }).join('\n');
  return '<section class="city-credentials" style="background:#fffdf5;border:1px solid #e8dcb0;border-radius:12px;padding:20px 24px;margin:8px 0 28px">'
    + `<h2 style="margin-top:0">Authorized and member coin dealers in ${escHtml(city)}</h2>`
    + `<p style="font-size:14px;color:#555;margin:0 0 12px">${withCreds.length} of the ${shops.length} ${escHtml(shopTypePlural)} here appear in a grading company's authorized-dealer list or a professional association's member directory (${escHtml(summary.join(', '))}). Checked October 2026 against the NGC, PCGS, CAC, PNG and ANA public directories.</p>`
    + `<ul style="margin:0;padding-left:20px;line-height:1.6">\n${items}\n</ul>`
    + (withCreds.length > 12 ? `<p style="font-size:13px;color:#666;margin:8px 0 0">Plus ${withCreds.length - 12} more — look for the gold badges on the listings below.</p>` : '')
    + '</section>';
}

module.exports = { CREDENTIALS, credentialCodes, credentialChips, credentialsSection, credentialPhrase, credentialsSchema, cityCredentialsSection };
