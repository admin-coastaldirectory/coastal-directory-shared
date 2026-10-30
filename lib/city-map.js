// ============================================================
// city-map.js — "Map of <shops> in <city>" on city pages (added 2026-10-29)
// ============================================================
//
// Competitor directories (NGC's dealer locator, Yelp, the comic/card shop
// locators) show shops on a map; our city pages were a list only. This adds
// a map block above the full list on every city page where 2+ shops have
// coordinates (lat/lng columns exist on all three shop tables).
//
// Page speed and tile policy: nothing loads until the visitor taps
// "Show map". Then Leaflet comes from cdnjs and tiles from OpenStreetMap
// (attribution shown, as their usage policy requires). The shop points are
// a small JSON block in the page, so the map needs no extra data request.
// Markers are circle markers (no image files), each linking to the shop page.
//
// Shops geocoded far from the rest of the city (bad geocodes) are left off
// so one stray point can't zoom the map out to half the country.

const { escHtml, slugify } = require('./util');

const LEAFLET = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4';
const MAX_KM = 60;

function km(a, b) {
  const r = Math.PI / 180;
  const x = (b.lng - a.lng) * r * Math.cos(((a.lat + b.lat) / 2) * r);
  const y = (b.lat - a.lat) * r;
  return Math.sqrt(x * x + y * y) * 6371;
}

function median(xs) {
  const s = xs.slice().sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function cityMapSection(city, shops, stSlug, citySlug, shopTypePlural, config) {
  try {
    if (config && config.niche && config.niche.cityMap === false) return '';
    const pts = shops.map(s => ({ s, lat: Number(s.lat), lng: Number(s.lng) }))
      .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng) && (p.lat !== 0 || p.lng !== 0)
        && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180);
    if (pts.length < 2) return '';
    const mid = { lat: median(pts.map(p => p.lat)), lng: median(pts.map(p => p.lng)) };
    const near = pts.filter(p => km(mid, p) <= MAX_KM);
    if (near.length < 2) return '';

    const data = near.map(p => {
      const slug = p.s.slug || slugify((p.s.name || '') + '-' + (p.s.city || ''));
      const score = Number(p.s.total_score != null ? p.s.total_score : p.s.totalScore) || 0;
      const reviews = Number(p.s.reviews_count != null ? p.s.reviews_count : p.s.reviewsCount) || 0;
      const rating = score > 0 && reviews > 0 ? score.toFixed(1) : null;
      return [String(p.s.name || ''), `/shops/${stSlug}/${citySlug}/${slug}/`,
        Math.round(p.lat * 1e5) / 1e5, Math.round(p.lng * 1e5) / 1e5, rating];
    });
    // JSON inside <script>: escape "<" so a shop name can never close the tag.
    const json = JSON.stringify(data).replace(/</g, '\\u003c');
    const color = (config && config.brand && config.brand.accentColor) || '#b8860b';
    const missing = shops.length - near.length;

    return `<!-- city-map:start -->
<section class="city-map" style="margin:8px 0 28px">
<h2>Map of ${escHtml(shopTypePlural)} in ${escHtml(city)}</h2>
<div id="cityMap" style="position:relative;height:380px;border:1px solid #e3e3e3;border-radius:12px;background:#f3f1ec;overflow:hidden">
<button type="button" id="cityMapBtn" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);padding:12px 20px;border-radius:24px;border:1px solid #ccc;background:#fff;font-size:15px;font-weight:600;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.08)">&#128205; Show ${near.length} ${escHtml(shopTypePlural)} on a map</button>
</div>
${missing > 0 ? `<p style="font-size:13px;color:#666;margin:6px 0 0">${missing} listing${missing === 1 ? ' is' : 's are'} not on the map (no exact location yet); ${missing === 1 ? 'it is' : 'they are'} in the list below.</p>` : ''}
<script type="application/json" id="cityMapData">${json}</script>
<script>(function(){var b=document.getElementById('cityMapBtn');if(!b)return;b.addEventListener('click',function(){
b.disabled=true;b.textContent='Loading map…';
var c=document.createElement('link');c.rel='stylesheet';c.href='${LEAFLET}/leaflet.min.css';document.head.appendChild(c);
var s=document.createElement('script');s.src='${LEAFLET}/leaflet.min.js';
s.onerror=function(){b.disabled=false;b.textContent='Map could not load. Tap to try again.';};
s.onload=function(){try{var d=JSON.parse(document.getElementById('cityMapData').textContent);b.remove();
var m=L.map('cityMap',{scrollWheelZoom:false});
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(m);
var e=function(t){return String(t).replace(/[&<>"']/g,function(ch){return'&#'+ch.charCodeAt(0)+';'})};
var g=[];d.forEach(function(p){g.push([p[2],p[3]]);L.circleMarker([p[2],p[3]],{radius:8,weight:2,color:'#fff',fillColor:'${color}',fillOpacity:.95}).addTo(m)
.bindPopup('<a href="'+e(p[1])+'" style="font-weight:600">'+e(p[0])+'</a>'+(p[4]?'<br>'+p[4]+' &#9733; on Google':''));});
m.fitBounds(g,{padding:[30,30],maxZoom:15});}catch(x){b.disabled=false;b.textContent='Map could not load.';}};
document.head.appendChild(s);});})();</script>
</section>
<!-- city-map:end -->`;
  } catch (e) {
    return '';
  }
}

module.exports = { cityMapSection };
