/*
 * English Perfume – "All brands" menu
 * Adds an "All brands" dropdown to the main navigation (and an expandable "All Brands" item in the mobile menu) on every page.
 * Each brand opens /shop.html?brand=<slug>, which lists the products whose name contains that brand.
 * To add or rename a brand, edit the BRANDS list below. `m` = words that identify the brand inside a product name.
 */
(function () {
  var BRANDS = [
    ['Amouage', ['amouage']], ['Ariana Grande', ['ariana grande']], ['Armaf', ['armaf']], ['Burberry', ['burberry']],
    ['Bvlgari', ['bvlgari', 'bulgari']], ['Calvin Klein', ['calvin klein', 'ck one', 'ck be', 'eternity']], ['Carolina Herrera', ['carolina herrera', '212 vip', 'good girl']],
    ['Celine', ['celine']], ['Chanel', ['chanel']], ['Chloé', ['chloe']], ['Coach', ['coach']], ['Creed', ['creed']],
    ['Davidoff', ['davidoff']], ['Dior', ['dior']], ['Dolce & Gabbana', ['dolce', 'gabbana']], ['Giorgio Armani', ['armani']],
    ['Gucci', ['gucci']], ['Hermès', ['hermes']], ['Hugo Boss', ['hugo', 'boss']], ['Issey Miyake', ['issey miyake']],
    ['Jo Malone', ['jo malone']], ['Lancôme', ['lancome']], ['Maison Francis Kurkdjian', ['kurkdjian', 'mfk']], ['Moschino', ['moschino']],
    ['Mont Blanc', ['mont blanc', 'montblanc']], ['Narciso Rodriguez', ['narciso rodriguez']], ['Paco Rabanne', ['paco rabanne', 'rabanne']],
    ['Penhaligon’s', ['penhaligon']], ['Prada', ['prada']], ['Ralph Lauren', ['ralph lauren']], ['Terre d’Hermès', ['terre d']],
    ['Tom Ford', ['tom ford']], ['Valentino', ['valentino']], ['Versace', ['versace']], ['Victoria’s Secret', ['victoria']],
    ['Yves Saint Laurent', ['yves saint laurent', 'saint laurent', 'ysl']]
  ];
  var norm = function (s) { return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[’'`]/g, '').replace(/&/g, ' and ').replace(/\s+/g, ' ').trim(); };
  var slug = function (n) { return norm(n).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); };
  var LIST = BRANDS.map(function (b) { return { name: b[0], slug: slug(b[0]), m: b[1].map(norm) }; });
  window.EP_BRANDS = LIST;
  window.epBrandByslug = function (s) { return LIST.filter(function (b) { return b.slug === s; })[0] || null; };
  window.epBrandMatch = function (p, s) {
    var b = window.epBrandByslug(s); if (!b) return false;
    var t = ' ' + norm((p.brand && p.brand !== 'English Perfume' ? p.brand + ' ' : '') + p.name) + ' ';
    return b.m.some(function (w) { return t.indexOf(' ' + w) > -1; });
  };
  var href = function (b) { return '/shop.html?brand=' + b.slug; };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };

  var css = '.epb{position:relative;display:inline-flex;align-items:center}'
    + '.epb-t{font:inherit;font-size:.92rem;color:inherit;background:none;border:0;padding:8px 0;cursor:pointer;display:inline-flex;align-items:center;gap:7px;transition:color .3s}'
    + '.epb-t:hover,.epb.open .epb-t{color:var(--oud,#8a5a3c)}.epb-t svg{width:10px;height:10px;transition:transform .3s}.epb.open .epb-t svg,.epb:hover .epb-t svg{transform:rotate(180deg)}'
    + '.epb-m{position:absolute;left:50%;top:calc(100% + 6px);transform:translate(-50%,8px);width:min(760px,92vw);max-height:min(72vh,520px);overflow:auto;background:#fff;border:1px solid var(--line,#e8e0d8);border-radius:20px;box-shadow:0 24px 60px rgba(43,36,35,.16);padding:18px 22px 20px;z-index:1400;opacity:0;visibility:hidden;transition:opacity .22s,transform .22s,visibility .22s}'
    + '.epb-m::before{content:"";position:absolute;left:0;right:0;top:-12px;height:12px}'
    + '.epb:hover .epb-m,.epb.open .epb-m,.epb:focus-within .epb-m{opacity:1;visibility:visible;transform:translate(-50%,0)}'
    + '.epb-h{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:0 4px 12px;border-bottom:1px solid var(--line,#e8e0d8);margin-bottom:10px;font-size:.78rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted,#7a6f68)}'
    + '.epb-h a{letter-spacing:0;text-transform:none;font-size:.88rem;color:var(--oud,#8a5a3c)}'
    + '.epb-g{display:grid;grid-template-columns:repeat(3,1fr);gap:0 18px}'
    + '.menu .epb-g a{display:block;padding:8px 6px;border-radius:8px;font-size:.92rem;line-height:1.25;color:inherit;white-space:normal}.menu .epb-g a::after{display:none}.menu .epb-g a:hover{background:rgba(138,90,60,.09);color:var(--oud,#8a5a3c)}'
    + '.menu .epb-h a::after{display:none}'
    + '.m-links .epb-mt{display:flex;align-items:center;gap:14px;width:100%;padding:15px 0;border:0;border-bottom:1px solid var(--line,#e8e0d8);background:none;text-align:left;cursor:pointer;color:inherit;font-family:var(--serif,Georgia,serif);font-size:1.45rem}'
    + '.m-links .epb-mt .ar{margin-left:auto;transition:transform .3s}.m-links .epb-mt[aria-expanded=true] .ar{transform:rotate(180deg)}'
    + '.m-links .epb-ml{max-height:0;overflow:hidden;transition:max-height .35s ease}.m-links .epb-ml.open{max-height:55vh;overflow:auto;border-bottom:1px solid var(--line,#e8e0d8)}'
    + '.m-links .epb-ml a{display:block;padding:11px 4px 11px 46px;border-bottom:0;font-family:inherit;font-size:1.05rem}.m-links .epb-ml a:hover{padding-left:50px}'
    + '@media(max-width:1100px){.epb-g{grid-template-columns:repeat(2,1fr)}}@media(max-width:900px){.epb{display:none}}';

  function init() {
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var links = LIST.map(function (b) { return '<a href="' + href(b) + '" role="menuitem">' + esc(b.name) + '</a>'; }).join('');
    var menu = document.querySelector('nav.menu');
    if (menu && !menu.querySelector('.epb')) {
      var w = document.createElement('div'); w.className = 'epb';
      w.innerHTML = '<button class="epb-t" type="button" aria-haspopup="true" aria-expanded="false">All brands <svg viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 1l4 4 4-4"/></svg></button>'
        + '<div class="epb-m" role="menu" aria-label="All brands"><div class="epb-h"><span>Shop by brand</span><a href="/shop.html">View all perfumes →</a></div><div class="epb-g">' + links + '</div></div>';
      menu.appendChild(w);
      var bt = w.querySelector('.epb-t');
      bt.addEventListener('click', function (e) { e.stopPropagation(); var o = w.classList.toggle('open'); bt.setAttribute('aria-expanded', o); });
      document.addEventListener('click', function (e) { if (!w.contains(e.target)) { w.classList.remove('open'); bt.setAttribute('aria-expanded', 'false'); } });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { w.classList.remove('open'); bt.setAttribute('aria-expanded', 'false'); } });
    }
    var ml = document.querySelector('.m-links');
    if (ml && !ml.querySelector('.epb-mt')) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'epb-mt'; b.setAttribute('aria-expanded', 'false');
      b.innerHTML = '<span class="li"><i class="fa-solid fa-tags"></i></span>All Brands<i class="fa-solid fa-chevron-down ar"></i>';
      var l = document.createElement('div'); l.className = 'epb-ml';
      l.innerHTML = '<a href="/shop.html">All perfumes</a>' + LIST.map(function (x) { return '<a href="' + href(x) + '">' + esc(x.name) + '</a>'; }).join('');
      ml.appendChild(b); ml.appendChild(l);
      b.addEventListener('click', function () { var o = l.classList.toggle('open'); b.setAttribute('aria-expanded', o); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
