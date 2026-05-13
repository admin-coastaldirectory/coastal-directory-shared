// ============================================================
// states.js — US states, Canadian provinces, neighbor map
// ============================================================
//
// STATES_FULL: ISO 2-letter code → full display name
// NEIGHBORS: state code → array of neighboring state codes
//
// Used for:
//   - converting `state: "CA"` from Supabase into "California" in copy
//   - generating URL slugs from full state names
//   - building "find shops in nearby states" cross-link blocks (topical
//     authority for SEO)

const STATES_FULL = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas',
  CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho',
  IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas',
  KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah',
  VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia',
  WI: 'Wisconsin', WY: 'Wyoming', DC: 'Washington DC',
  // Canadian provinces / territories
  ON: 'Ontario', BC: 'British Columbia', AB: 'Alberta', QC: 'Quebec',
  MB: 'Manitoba', NS: 'Nova Scotia', SK: 'Saskatchewan', NB: 'New Brunswick',
  NL: 'Newfoundland and Labrador', PE: 'Prince Edward Island',
  NT: 'Northwest Territories', NU: 'Nunavut', YT: 'Yukon',
};

const NEIGHBORS = {
  AL: ['MS', 'TN', 'GA', 'FL'],
  AK: ['YT', 'BC'],
  AZ: ['CA', 'NV', 'UT', 'NM'],
  AR: ['MO', 'TN', 'MS', 'LA', 'TX', 'OK'],
  CA: ['OR', 'NV', 'AZ'],
  CO: ['WY', 'NE', 'KS', 'OK', 'NM', 'UT'],
  CT: ['NY', 'MA', 'RI'],
  DE: ['PA', 'NJ', 'MD'],
  FL: ['AL', 'GA'],
  GA: ['FL', 'AL', 'TN', 'NC', 'SC'],
  HI: ['CA'],
  ID: ['WA', 'OR', 'NV', 'UT', 'WY', 'MT'],
  IL: ['WI', 'IN', 'KY', 'MO', 'IA'],
  IN: ['MI', 'OH', 'KY', 'IL'],
  IA: ['MN', 'WI', 'IL', 'MO', 'NE', 'SD'],
  KS: ['NE', 'MO', 'OK', 'CO'],
  KY: ['OH', 'WV', 'VA', 'TN', 'MO', 'IL', 'IN'],
  LA: ['TX', 'AR', 'MS'],
  ME: ['NH'],
  MD: ['PA', 'DE', 'VA', 'WV', 'DC'],
  MA: ['NY', 'VT', 'NH', 'RI', 'CT'],
  MI: ['WI', 'IN', 'OH', 'ON'],
  MN: ['ND', 'SD', 'IA', 'WI', 'ON', 'MB'],
  MS: ['LA', 'AR', 'TN', 'AL'],
  MO: ['IA', 'IL', 'KY', 'TN', 'AR', 'OK', 'KS', 'NE'],
  MT: ['ID', 'WY', 'SD', 'ND', 'AB', 'SK', 'BC'],
  NE: ['SD', 'IA', 'MO', 'KS', 'CO', 'WY'],
  NV: ['OR', 'ID', 'UT', 'AZ', 'CA'],
  NH: ['ME', 'VT', 'MA'],
  NJ: ['NY', 'PA', 'DE'],
  NM: ['CO', 'OK', 'TX', 'AZ', 'UT'],
  NY: ['PA', 'NJ', 'CT', 'MA', 'VT', 'ON', 'QC'],
  NC: ['VA', 'TN', 'GA', 'SC'],
  ND: ['MN', 'SD', 'MT', 'SK', 'MB'],
  OH: ['MI', 'PA', 'WV', 'KY', 'IN'],
  OK: ['KS', 'MO', 'AR', 'TX', 'NM', 'CO'],
  OR: ['WA', 'ID', 'NV', 'CA'],
  PA: ['NY', 'NJ', 'DE', 'MD', 'WV', 'OH'],
  RI: ['CT', 'MA'],
  SC: ['NC', 'GA'],
  SD: ['ND', 'MN', 'IA', 'NE', 'WY', 'MT'],
  TN: ['KY', 'VA', 'NC', 'GA', 'AL', 'MS', 'AR', 'MO'],
  TX: ['NM', 'OK', 'AR', 'LA'],
  UT: ['ID', 'WY', 'CO', 'NM', 'AZ', 'NV'],
  VT: ['NY', 'NH', 'MA', 'QC'],
  VA: ['WV', 'MD', 'DC', 'NC', 'TN', 'KY'],
  WA: ['ID', 'OR', 'BC'],
  WV: ['OH', 'PA', 'MD', 'VA', 'KY'],
  WI: ['MN', 'IA', 'IL', 'MI'],
  WY: ['MT', 'SD', 'NE', 'CO', 'UT', 'ID'],
  DC: ['MD', 'VA'],
  ON: ['MB', 'QC', 'NY', 'MI', 'MN'],
  BC: ['AB', 'YT', 'WA', 'AK'],
  AB: ['BC', 'SK', 'NT', 'MT'],
  QC: ['ON', 'NB', 'NY', 'VT', 'NL'],
  MB: ['SK', 'ON', 'NU', 'ND', 'MN'],
  NS: ['NB', 'PE'],
  SK: ['AB', 'MB', 'NT', 'MT', 'ND'],
  NB: ['QC', 'NS', 'PE', 'ME'],
  NL: ['QC'],
  PE: ['NB', 'NS'],
  NT: ['YT', 'NU', 'AB', 'SK', 'BC'],
  NU: ['NT', 'MB'],
  YT: ['NT', 'BC', 'AK'],
};

function stateName(code) {
  if (!code) return '';
  return STATES_FULL[String(code).toUpperCase()] || code;
}

function stateSlug(code) {
  const { slugify } = require('./util');
  return slugify(stateName(code));
}

function neighborsOf(code) {
  return NEIGHBORS[String(code).toUpperCase()] || [];
}

module.exports = { STATES_FULL, NEIGHBORS, stateName, stateSlug, neighborsOf };
