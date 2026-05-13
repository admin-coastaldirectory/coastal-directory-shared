// ============================================================
// coastal-directory-shared/assets/shared.js
// Canonical client-side JavaScript for all Coastal Directory sites.
// ============================================================
//
// Loaded via <script src="/shared.js" defer> in the page shell.
// Each site can override or extend this with a per-site `app.js`
// loaded after this one.
//
// What lives here:
//   - mobile nav toggle
//   - external-link safety (rel=noopener on user-supplied URLs)
//   - lightweight read-only Supabase fetch helpers used by client
//     pages like /finder, /locator, /event-finder
//
// Secrets policy: Supabase URL/anon key are NOT hardcoded here.
// They're injected by the page shell as window.COASTAL_CONFIG so
// the canonical script stays generic across sites.

(function () {
  'use strict';

  // --------------------------------------------------------
  // CONFIG (read from window.COASTAL_CONFIG injected by shell)
  // --------------------------------------------------------
  const config = (typeof window !== 'undefined' && window.COASTAL_CONFIG) || {};
  const SUPABASE_URL = config.supabaseUrl || '';
  const SUPABASE_KEY = config.supabaseAnonKey || '';

  // --------------------------------------------------------
  // MOBILE NAV TOGGLE
  // --------------------------------------------------------
  function initNavToggle() {
    const btn = document.querySelector('.nav-toggle');
    const nav = document.querySelector('nav.primary');
    if (!btn || !nav) return;
    btn.addEventListener('click', function () {
      nav.classList.toggle('is-open');
      btn.setAttribute(
        'aria-expanded',
        nav.classList.contains('is-open') ? 'true' : 'false'
      );
    });
  }

  // --------------------------------------------------------
  // EXTERNAL LINK SAFETY
  // Add rel="noopener noreferrer" to any external links that
  // don't already have it. Prevents reverse-tabnabbing attacks.
  // --------------------------------------------------------
  function hardenExternalLinks() {
    const links = document.querySelectorAll('a[target="_blank"]');
    links.forEach(function (a) {
      const rel = a.getAttribute('rel') || '';
      if (!/noopener/.test(rel)) a.setAttribute('rel', (rel + ' noopener noreferrer').trim());
    });
  }

  // --------------------------------------------------------
  // SUPABASE FETCH HELPERS (used by /finder, /locator, etc.)
  // --------------------------------------------------------
  window.coastal = window.coastal || {};

  window.coastal.sbFetch = async function (table, queryString, extraHeaders) {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error('Supabase is not configured (window.COASTAL_CONFIG missing).');
    }
    const url = SUPABASE_URL + '/rest/v1/' + table + (queryString ? '?' + queryString : '');
    const res = await fetch(url, {
      headers: Object.assign(
        {
          apikey: SUPABASE_KEY,
          Authorization: 'Bearer ' + SUPABASE_KEY,
          'Content-Type': 'application/json',
        },
        extraHeaders || {}
      ),
    });
    if (!res.ok) throw new Error('Supabase fetch failed: ' + res.status);
    return res.json();
  };

  window.coastal.sbInsert = async function (table, data) {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error('Supabase is not configured (window.COASTAL_CONFIG missing).');
    }
    const res = await fetch(SUPABASE_URL + '/rest/v1/' + table, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Supabase insert failed: ' + res.status);
    return res.json();
  };

  // --------------------------------------------------------
  // BOOT
  // --------------------------------------------------------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initNavToggle();
      hardenExternalLinks();
    });
  } else {
    initNavToggle();
    hardenExternalLinks();
  }
})();
