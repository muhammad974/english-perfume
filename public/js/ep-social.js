/*
 * English Perfume – product page live proof (all numbers are REAL)
 *  - "N sold in the last 24 hours": from real orders (/api/sold), hidden until there is at least 1 sale.
 *  - "N people are viewing this right now": real visitors on this product page (/api/viewing),
 *    shown only when 2 or more people are on the page.
 */
(function () {
  var P = (typeof p !== 'undefined') ? p : null;
  var info = document.querySelector('.info');
  if (!P || !info) return;

  var css = document.createElement('style');
  css.textContent =
    '.ep-pills{display:grid;gap:10px;margin:16px 0 4px}' +
    '.ep-pill{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;max-width:420px;padding:13px 22px;border:1px solid var(--line);border-radius:999px;background:linear-gradient(#fff,#fbf8f4);font-size:.95rem;color:var(--muted);text-align:center}' +
    '.ep-pill b{color:var(--brass);font-weight:600}' +
    '.ep-dot{width:9px;height:9px;border-radius:50%;background:#2e9e5b;flex:none;animation:epPulse 1.8s infinite}' +
    '@keyframes epPulse{0%{box-shadow:0 0 0 0 rgba(46,158,91,.5)}70%{box-shadow:0 0 0 9px rgba(46,158,91,0)}100%{box-shadow:0 0 0 0 rgba(46,158,91,0)}}';
  document.head.appendChild(css);

  var box = document.createElement('div');
  box.className = 'ep-pills';
  var anchor = info.querySelector('.tax');
  if (anchor) anchor.insertAdjacentElement('afterend', box); else info.appendChild(box);

  function pill(id, html) {
    var d = document.getElementById(id);
    if (!html) { if (d) d.remove(); return; }
    if (!d) { d = document.createElement('div'); d.className = 'ep-pill'; d.id = id; box.appendChild(d); }
    d.innerHTML = html;
  }

  /* sold in the last 24 hours (real orders) */
  fetch('/api/sold?id=' + encodeURIComponent(P.id))
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) { if (j && j.sold >= 1) pill('epSold', '<b>' + Number(j.sold) + '</b> sold in the last <b>24</b> hours'); })
    .catch(function () {});

  /* people viewing right now (real visitors on this page) */
  var vid;
  try { vid = sessionStorage.getItem('ep_vid'); if (!vid) { vid = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)); sessionStorage.setItem('ep_vid', vid); } }
  catch (e) { vid = String(Date.now()) + Math.random().toString(16).slice(2); }
  vid = String(vid).replace(/[^a-z0-9-]/gi, '').slice(0, 40);

  function beat() {
    if (document.hidden) return;
    fetch('/api/viewing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: P.id, vid: vid }) })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (j && j.viewing >= 2) pill('epView', '<span class="ep-dot"></span><span><b>' + Number(j.viewing) + '</b> people are viewing this right now</span>');
        else pill('epView', '');
      })
      .catch(function () {});
  }
  beat();
  setInterval(beat, 30000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) beat(); });
})();
