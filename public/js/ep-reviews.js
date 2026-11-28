/*
 * English Perfume – real customer reviews on the product page.
 * Reviews come from /api/reviews (approved in the admin panel). Only customers with a shipped or
 * delivered order can write one (order number + phone number are checked on the server).
 */
(function () {
  var P = (typeof p !== 'undefined') ? p : null;
  var info = document.querySelector('.info'), pd = document.querySelector('.pd');
  if (!P || !info || !pd) return;

  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
  var stars = function (n) { n = Math.max(0, Math.min(5, Math.round(n))); return '★★★★★'.slice(0, n) + '<span style="opacity:.28">' + '★★★★★'.slice(0, 5 - n) + '</span>'; };

  var css = document.createElement('style');
  css.textContent =
    '.ep-rate{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:2px 0 4px;font-size:.92rem;color:var(--muted)}' +
    '.ep-rate .st{color:var(--brass-l);letter-spacing:2px;font-size:1rem}.ep-rate a{color:var(--oud);text-decoration:underline;text-underline-offset:3px}' +
    '.ep-rv{padding:20px 0 70px;border-top:1px solid var(--line)}' +
    '.ep-rv h2{font-family:var(--serif);font-weight:400;font-size:clamp(1.9rem,3.4vw,2.6rem);margin:34px 0 22px}' +
    '.ep-top{display:grid;grid-template-columns:minmax(0,300px) 1fr auto;gap:28px 40px;align-items:center;background:#fff;border:1px solid var(--line);border-radius:12px;padding:28px 32px;margin-bottom:26px}' +
    '.ep-top.empty{grid-template-columns:1fr auto}' +
    '.ep-score b{font-family:var(--serif);font-weight:400;font-size:4.6rem;line-height:.9;color:var(--oud);display:block}' +
    '.ep-score .st{color:var(--brass-l);letter-spacing:3px;font-size:1.1rem;display:block;margin:10px 0 4px}.ep-score small{color:var(--muted)}' +
    '.ep-bars{display:grid;gap:7px}.ep-bars div{display:grid;grid-template-columns:34px 1fr 30px;align-items:center;gap:10px;font-size:.82rem;color:var(--muted)}' +
    '.ep-bars span.t{height:7px;border-radius:99px;background:var(--linen,#f1ece4);overflow:hidden}.ep-bars span.t i{display:block;height:100%;background:var(--brass-l);border-radius:99px}' +
    '.ep-write{background:var(--oud);color:#fff;border-radius:999px;padding:13px 26px;font-weight:500;font-size:.92rem;transition:background .25s}.ep-write:hover{background:var(--oud-d,#431f2e)}' +
    '.ep-none{color:var(--muted);max-width:46ch}.ep-none b{display:block;color:var(--ink);font-family:var(--serif);font-weight:400;font-size:1.6rem;margin-bottom:4px}' +
    '.ep-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px}' +
    '.ep-card{background:#fff;border:1px solid var(--line);border-radius:12px;padding:22px 22px 18px;display:flex;flex-direction:column;gap:10px}' +
    '.ep-card .hd{display:flex;align-items:center;gap:12px}.ep-av{width:42px;height:42px;border-radius:50%;background:var(--oud);color:#fff;display:grid;place-items:center;font-family:var(--serif);font-size:1.2rem;flex:none}' +
    '.ep-card b{font-weight:600;font-size:.95rem;display:block;line-height:1.2}.ep-card small{color:var(--muted);font-size:.78rem}' +
    '.ep-vb{display:inline-flex;align-items:center;gap:5px;color:#2e7d4f;font-size:.74rem;font-weight:500}' +
    '.ep-card .st{color:var(--brass-l);letter-spacing:2px;font-size:.95rem}.ep-card h4{font-family:var(--serif);font-weight:400;font-size:1.3rem;line-height:1.2}.ep-card p{font-size:.93rem;color:#4a403d}' +
    '.ep-reply{background:var(--linen,#f1ece4);border-radius:8px;padding:10px 12px;font-size:.85rem;color:var(--muted)}.ep-reply b{display:inline;font-size:.85rem;color:var(--oud)}' +
    '.ep-form{display:none;background:#fff;border:1px solid var(--line);border-radius:12px;padding:26px 28px;margin-bottom:26px}.ep-form.open{display:block}' +
    '.ep-form h3{font-family:var(--serif);font-weight:400;font-size:1.6rem;margin-bottom:6px}.ep-form .sub{color:var(--muted);font-size:.88rem;margin-bottom:18px}' +
    '.ep-f{display:grid;grid-template-columns:1fr 1fr;gap:14px}.ep-f .full{grid-column:1/-1}' +
    '.ep-f label{display:block;font-size:.8rem;color:var(--muted);margin-bottom:5px}' +
    '.ep-f input,.ep-f textarea{width:100%;font:inherit;font-size:.95rem;padding:11px 13px;border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--ink)}' +
    '.ep-f textarea{min-height:110px;resize:vertical}.ep-f input:focus,.ep-f textarea:focus{outline:2px solid var(--oud);outline-offset:1px}' +
    '.ep-pick{display:flex;gap:4px;font-size:1.9rem;color:#d9cfc4;cursor:pointer;user-select:none}.ep-pick span.on{color:var(--brass-l)}' +
    '.ep-msg{margin-top:14px;font-size:.9rem}.ep-msg.err{color:#a63a3a}.ep-msg.ok{color:#2e7d4f}' +
    '.ep-hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}' +
    '@media(max-width:860px){.ep-top,.ep-top.empty{grid-template-columns:1fr;padding:22px}.ep-write{justify-self:start}.ep-f{grid-template-columns:1fr}}';
  document.head.appendChild(css);

  var sec = document.createElement('section');
  sec.className = 'ep-rv'; sec.id = 'reviews';
  pd.insertAdjacentElement('afterend', sec);

  function render(d) {
    var count = d.count || 0;

    /* rating line under the product title (only when there are real reviews) */
    var old = document.getElementById('epRate'); if (old) old.remove();
    if (count) {
      var h1 = info.querySelector('h1'), r = document.createElement('div');
      r.id = 'epRate'; r.className = 'ep-rate';
      r.innerHTML = '<span class="st">' + stars(d.avg) + '</span><b style="color:var(--ink)">' + d.avg.toFixed(1) + '</b><a href="#reviews">' + count + (count === 1 ? ' review' : ' reviews') + '</a>';
      if (h1) h1.insertAdjacentElement('afterend', r);
    }

    var top;
    if (count) {
      var bars = d.dist.map(function (n, i) { return '<div><span>' + (5 - i) + ' ★</span><span class="t"><i style="width:' + Math.round(n / count * 100) + '%"></i></span><span>' + n + '</span></div>'; }).join('');
      top = '<div class="ep-top"><div class="ep-score"><b>' + d.avg.toFixed(1) + '</b><span class="st">' + stars(d.avg) + '</span><small>Based on ' + count + (count === 1 ? ' review' : ' reviews') + '</small></div><div class="ep-bars">' + bars + '</div><button class="ep-write" type="button" id="epWrite">Write a review</button></div>';
    } else {
      top = '<div class="ep-top empty"><div class="ep-none"><b>No reviews yet</b>Bought this fragrance? Be the first to share your experience.</div><button class="ep-write" type="button" id="epWrite">Write a review</button></div>';
    }

    var form =
      '<form class="ep-form" id="epForm" novalidate><h3>Write a review</h3>' +
      '<p class="sub">Reviews are for customers who have received their order. Enter your order number and the phone number you used at checkout so we can confirm your purchase. Your review appears after we approve it.</p>' +
      '<div class="ep-f">' +
      '<div class="full"><label>Your rating</label><div class="ep-pick" id="epPick" role="radiogroup" aria-label="Star rating">' + [1, 2, 3, 4, 5].map(function (n) { return '<span data-v="' + n + '" role="radio" aria-label="' + n + ' stars">★</span>'; }).join('') + '</div></div>' +
      '<div><label for="epName">Your name</label><input id="epName" maxlength="60" autocomplete="name"></div>' +
      '<div><label for="epTitle">Review title (optional)</label><input id="epTitle" maxlength="80"></div>' +
      '<div class="full"><label for="epText">Your review</label><textarea id="epText" maxlength="1000" placeholder="How does it smell, how long does it last, would you recommend it?"></textarea></div>' +
      '<div><label for="epOrder">Order number</label><input id="epOrder" placeholder="EP-1001" autocomplete="off"></div>' +
      '<div><label for="epPhone">Phone number used on the order</label><input id="epPhone" type="tel" autocomplete="tel"></div>' +
      '<input class="ep-hp" id="epWeb" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<div class="full"><button class="ep-write" type="submit" id="epSend">Submit review</button></div></div>' +
      '<p class="ep-msg" id="epMsg" role="status"></p></form>';

    var cards = (d.reviews || []).map(function (r) {
      var dt = new Date(r.createdAt);
      return '<article class="ep-card"><div class="hd"><span class="ep-av">' + esc(r.name.charAt(0)) + '</span><div><b>' + esc(r.name) + '</b><small>' + dt.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) + '</small></div></div>' +
        '<span class="st">' + stars(r.rating) + '</span><span class="ep-vb"><i class="fa-solid fa-circle-check"></i> Verified buyer</span>' +
        (r.title ? '<h4>' + esc(r.title) + '</h4>' : '') + '<p>' + esc(r.text) + '</p>' +
        (r.reply ? '<div class="ep-reply"><b>English Perfume:</b> ' + esc(r.reply) + '</div>' : '') + '</article>';
    }).join('');

    sec.innerHTML = '<h2>Customer reviews</h2>' + top + form + (cards ? '<div class="ep-grid">' + cards + '</div>' : '');
    wire();
  }

  function wire() {
    var w = document.getElementById('epWrite'), f = document.getElementById('epForm'), rating = 0;
    if (!w || !f) return;
    w.onclick = function () { f.classList.toggle('open'); if (f.classList.contains('open')) f.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
    var pick = document.getElementById('epPick');
    pick.onclick = function (e) {
      var s = e.target.closest('[data-v]'); if (!s) return;
      rating = Number(s.dataset.v);
      [].forEach.call(pick.children, function (c) { c.classList.toggle('on', Number(c.dataset.v) <= rating); });
    };
    f.onsubmit = function (e) {
      e.preventDefault();
      var msg = document.getElementById('epMsg'), btn = document.getElementById('epSend');
      var body = {
        productId: P.id, rating: rating,
        name: document.getElementById('epName').value, title: document.getElementById('epTitle').value, text: document.getElementById('epText').value,
        orderNo: document.getElementById('epOrder').value, phone: document.getElementById('epPhone').value, website: document.getElementById('epWeb').value
      };
      msg.className = 'ep-msg'; msg.textContent = '';
      btn.disabled = true; btn.textContent = 'Sending…';
      fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (x) {
          if (x.ok) { f.reset(); rating = 0; [].forEach.call(pick.children, function (c) { c.classList.remove('on'); }); msg.className = 'ep-msg ok'; msg.textContent = 'Thank you! Your review has been received and will appear once we approve it.'; }
          else { msg.className = 'ep-msg err'; msg.textContent = x.j.error || 'Something went wrong. Please try again.'; }
        })
        .catch(function () { msg.className = 'ep-msg err'; msg.textContent = 'Could not send your review. Please check your connection and try again.'; })
        .then(function () { btn.disabled = false; btn.textContent = 'Submit review'; });
    };
  }

  fetch('/api/reviews?id=' + encodeURIComponent(P.id))
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) { if (d) render(d); })
    .catch(function () { /* no server (page opened as a file): show nothing */ });
})();
