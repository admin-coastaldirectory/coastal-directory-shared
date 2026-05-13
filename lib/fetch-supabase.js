// ============================================================
// fetch-supabase.js — paginated Supabase REST fetcher
// ============================================================
//
// Supabase's anon REST endpoint caps at 1000 rows per request.
// We page through using offset/limit until we've got everything.
//
// Usage:
//   const shops = await fetchAll(config.supabase, 'cnm_shops', 'status=eq.published');

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
    all = all.concat(rows);

    if (rows.length < pageSize) break;
    offset += pageSize;
  }

  return all;
}

module.exports = { fetchAll };
