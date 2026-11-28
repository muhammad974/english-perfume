/*
 * English Perfume – live catalogue
 * Loads the current products, prices and delivery settings from the server (/api/catalog), so whatever you
 * change in the admin panel shows on every page. If the server is not running (e.g. a page opened by
 * double-click), the pages simply keep their built-in products.
 * Must be loaded in <head>, BEFORE the page's own script.
 */
(function () {
  var data = null;
  try {
    var x = new XMLHttpRequest();
    x.open('GET', '/api/catalog?t=' + Date.now(), false);   // synchronous on purpose: pages render once with the right data
    x.send(null);
    if (x.status === 200) { var j = JSON.parse(x.responseText); if (j && Array.isArray(j.products)) data = j; }
  } catch (e) { /* no server: keep built-in products */ }
  window.EP_CATALOG = data;

  /* Replace the page's PRODUCTS array contents (in place, so const arrays work too) */
  window.epMerge = function (list) {
    if (!data) return list;
    var old = new Map(list.map(function (q) { return [q.id, q]; }));
    var out = data.products.filter(function (x) { return x.active !== false; }).map(function (x) {
      var o = old.get(Number(x.id)) || {}, pr = Number(x.price) || 0;
      var nt = String(x.label || '').split(/[·,]/).map(function (v) { return v.trim(); }).filter(Boolean);
      var was = ('was' in x) ? (Number(x.was) || pr) : (o.was || pr); if (was < pr) was = pr;
      return {
        id: Number(x.id), name: x.name, brand: 'English Perfume', cat: x.cat || o.cat || 'unisex',
        label: x.label || o.label || '', price: pr, was: was, rating: o.rating || 0, reviews: o.reviews || 0,
        best: ('best' in x) ? !!x.best : !!o.best, luxury: ('luxury' in x) ? !!x.luxury : !!o.luxury, img: x.img || o.img || '', images: (Array.isArray(x.images) && x.images.length) ? x.images : undefined, h: o.h != null ? o.h : (Number(x.id) * 47) % 360,
        notes: nt.length ? nt : (o.notes || []), desc: x.description || o.desc || x.label || ''
      };
    });
    list.splice.apply(list, [0, list.length].concat(out));
    return list;
  };

  /* Delivery fee and free-shipping limit come from the server too */
  window.epConfig = function (cfg) {
    if (!data || !data.config || !cfg) return cfg;
    var d = Number(data.config.deliveryFee), f = Number(data.config.freeShippingOver);
    if (isFinite(d)) cfg.deliveryFee = d;
    if (isFinite(f)) cfg.freeShippingOver = f;
    return cfg;
  };

  /* Hide "−0%" badges and a repeated struck-through price for products that have no compare-at price */
  function tidy() {
    document.querySelectorAll('.s,.sale,.save,.save-badge').forEach(function (e) {
      if (/^\s*(−|-|Save\s*)?0\s*%\s*$/.test(e.textContent) || /^\s*Save\s*0\s*%\s*$/.test(e.textContent)) e.style.display = 'none';
    });
    document.querySelectorAll('s').forEach(function (s) {
      var b = s.parentElement && s.parentElement.querySelector('b'); var t = s.textContent.trim();
      if (b && b.textContent.trim() === t) s.style.display = 'none';
      else if (!b) { var p = s.parentElement && s.parentElement.firstChild; if (p && p.nodeType === 3 && p.textContent.trim() === t) s.style.display = 'none'; }
    });
  }
  var timer;
  function later() { clearTimeout(timer); timer = setTimeout(tidy, 60); }
  document.addEventListener('DOMContentLoaded', function () {
    tidy();
    new MutationObserver(later).observe(document.body, { childList: true, subtree: true });
  });
})();
