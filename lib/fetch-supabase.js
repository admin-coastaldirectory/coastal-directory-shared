// ============================================================
// fetch-supabase.js — paginated Supabase REST fetcher
// ============================================================
//
// Supabase's anon REST endpoint caps at 1000 rows per request.
// We page through using offset/limit until we've got everything.
//
// Usage:
//   const shops = await fetchAll(config.supabase, 'cnm_shops', 'status=eq.published');

// Home, online-only and by-appointment sellers (seller_type =
// 'appointment_online', added 2026-11-01, Joe's call: list them, but as their
// own category). Many are people's homes, so no page ever shows their street
// address, ZIP, map pin or directions link. Done here, where every builder
// loads its rows, so nothing can leak an address by accident. With no street
// address their pages also stay out of Google's index (isIndexable needs one).
// lat/lng become undefined, not null: Number(null) is 0, which distance math
// would read as a real point at 0,0.
function hideApptAddress(r) {
  if (!r || r.seller_type !== 'appointment_online') return;
  r.appointment_only = true;
  r.address = '';
  r.zip = '';
  r.lat = undefined;
  r.lng = undefined;
  r.google_maps = '';
  r.googleMaps = '';
}

async function fetchAll(supabaseConfig, table, filter = '', pageSize = 1000) {
  const { url: baseUrl, key } = supabaseConfig;
  if (!baseUrl || !key) {
    throw new Error(
      'Supabase URL or key missing. Set SUPABASE_URL and SUPABASE_KEY env vars, ' +
      'or pass them in via the site config.'
    );
  }

  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
  };

  let all = [];
  let offset = 0;

  // Loop until a page comes back smaller than pageSize, meaning we've hit the end.
  while (true) {
    const filterPart = filter ? `&${filter}` : '';
    const url = `${baseUrl}/rest/v1/${table}?select=*${filterPart}&order=name.asc&limit=${pageSize}&offset=${offset}`;

    const response = await fetch(url, { headers });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Supabase fetch failed for table "${table}" (status ${response.status}): ${body.slice(0, 300)}`
      );
    }

    const rows = await response.json();
    for (const r of rows) hideApptAddress(r);
    all = all.concat(rows);

    if (rows.length < pageSize) break;
    offset += pageSize;
  }

  return all;
}

module.exports = { fetchAll, hideApptAddress };
