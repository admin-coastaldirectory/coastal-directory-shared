// Daily Feed lane filter — drop-in for any directory's daily-feed.html.
// Replace the site's loadFeed()/renderFeed() with the block below.
// EDIT TWO THINGS per site:
//   - CATEGORY_LABEL : the exact Title-Case category in cf_content_items (e.g. "Coins")
//   - CATEGORY_SLUG  : its slug as produced by the site's categorySlug() (e.g. "coins")
// Assumes existing globals: CF_SB_URL, CF_SB_KEY, $, allItems, displayedCount,
// PAGE_SIZE, renderItem, categorySlug.

const CATEGORY_LABEL = 'Coins';   // <-- set per site
const CATEGORY_SLUG  = 'coins';   // <-- set per site

// Lane filter (All / News / Social / Video / Blog). Initial lane from ?type=.
const LANES = ['news', 'social', 'video', 'blog'];
let activeLane = (function () {
  const p = (new URLSearchParams(location.search).get('type') || '').toLowerCase();
  return LANES.includes(p) ? p : 'all';
})();

function laneItems() {
  return activeLane === 'all'
    ? allItems
    : allItems.filter(i => (i.type || 'news').toLowerCase() === activeLane);
}

function updateLaneCounts() {
  const counts = { all: allItems.length, news: 0, social: 0, video: 0, blog: 0 };
  allItems.forEach(i => { const t = (i.type || 'news').toLowerCase(); if (counts[t] != null) counts[t]++; });
  document.querySelectorAll('#df-lanes .df-pill').forEach(p => {
    const c = p.querySelector('.df-pill-count');
    if (c) c.textContent = counts[p.dataset.lane] != null ? counts[p.dataset.lane] : 0;
    p.classList.toggle('active', p.dataset.lane === activeLane);
  });
}

function setLane(lane) {
  activeLane = lane;
  displayedCount = PAGE_SIZE;
  const u = new URL(location.href);
  if (lane === 'all') u.searchParams.delete('type'); else u.searchParams.set('type', lane);
  history.replaceState(null, '', u);
  updateLaneCounts();
  renderFeed();
}

document.getElementById('df-lanes').addEventListener('click', (e) => {
  const b = e.target.closest('[data-lane]');
  if (b) setLane(b.dataset.lane);
});

function renderFeed() {
  const filtered = laneItems();
  const slice = filtered.slice(0, displayedCount);
  if (slice.length === 0) {
    $('df-feed').innerHTML = '<div class="df-empty">No items yet for this filter. Check back soon.</div>';
    $('df-load-more').style.display = 'none';
    return;
  }
  $('df-feed').innerHTML = slice.map(renderItem).join('');
  $('df-load-more').style.display = filtered.length > displayedCount ? 'block' : 'none';
}

async function loadFeed() {
  try {
    // Pull all approved rows for this category (all types); lanes filter client-side.
    const url = CF_SB_URL + '/rest/v1/cf_content_items?select=*&status=eq.approved&category=eq.'
      + encodeURIComponent(CATEGORY_LABEL)
      + '&order=published_at.desc.nullslast,created_at.desc&limit=500';
    const res = await fetch(url, {
      headers: { 'apikey': CF_SB_KEY, 'Authorization': 'Bearer ' + CF_SB_KEY }
    });
    if (!res.ok) throw new Error();
    const all = await res.json();
    allItems = all.filter(i => categorySlug(i.category) === CATEGORY_SLUG);
    updateLaneCounts();
    renderFeed();
  } catch (e) {
    $('df-feed').innerHTML = '<div class="df-empty">Could not load feed.</div>';
  }
}

loadFeed();
