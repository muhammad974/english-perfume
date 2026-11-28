'use strict';
/*
 * Build step for Vercel: copies public/ to dist/ and adds the SEO tags (title, description, canonical address,
 * social-share tags, structured data) to every page, using your real website address.
 * Set SITE_URL in Vercel (for example https://englishperfume.store). Without it, the Vercel project address is used.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'public');
const OUT = path.join(ROOT, 'dist');
const SITE = (process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL : '')).trim().replace(/\/+$/, '');

const he = v => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ld = o => JSON.stringify(o).replace(/</g, '\\u003c');
const abs = u => (SITE ? SITE + u : null);

const BUSINESS = { name: 'English Perfume', email: 'hello@englishperfume.store', phone: '+60177468939',
  street: 'Equatorial Plaza, Jln Sultan Ismail', city: 'Kuala Lumpur', zip: '50250' };

const FAQ = [
  ['Are your perfumes 100% authentic?', 'Yes. Every fragrance we sell is 100% authentic.'],
  ['Do you offer cash on delivery?', 'Yes. You can pay in cash when your order is delivered anywhere in Malaysia.'],
  ['How long does delivery take?', 'Most orders arrive within 2–5 working days across Malaysia.'],
  ['Is shipping free?', 'Shipping is free on orders over RM 150. A small delivery fee applies to smaller orders.'],
  ['How can I track my order?', 'Open the Track your order page and enter your order number and the phone number you used at checkout.'],
  ['How can I contact English Perfume?', 'Message us on WhatsApp at +60 17-746 8939 or email hello@englishperfume.store. We are available Mon–Sat, 9am – 6pm.']
];

const PAGES = {
  'index.html': { path: '/', title: 'Authentic Perfumes in Malaysia | English Perfume',
    desc: '100% authentic perfumes for men and women in Malaysia. Long-lasting fragrances, cash on delivery, free shipping over RM 150, delivered in 2–5 working days.', img: '/images/og-default.jpg', kind: 'home' },
  'shop.html': { path: '/shop.html', title: 'Shop All Perfumes Online in Malaysia | English Perfume', crumb: 'Shop all perfumes',
    desc: 'Browse every perfume: men, women and unisex fragrances. Authentic, long-lasting scents with cash on delivery across Malaysia.', img: '/images/og-default.jpg', kind: 'collection',
    copy: ['Shop perfumes online in Malaysia', 'Find your signature scent from our full range of men’s, women’s and unisex fragrances. Every bottle is 100% authentic, delivered across Malaysia in 2–5 working days, and you can pay with cash on delivery. Orders over RM 150 ship free.', 'Looking for something specific? Visit our <a href="men.html">men’s perfumes</a>, <a href="women.html">women’s perfumes</a> or the <a href="bestsellers.html">best sellers</a>, or <a href="customer-support.html">contact us</a> and we will help you choose.'] },
  'men.html': { path: '/men.html', title: 'Men’s Perfumes in Malaysia | English Perfume', crumb: 'Men’s perfumes',
    desc: 'Buy authentic men’s perfumes online in Malaysia: fresh, woody and spicy fragrances for every day. Cash on delivery and free shipping over RM 150.', img: '/images/og-men.jpg', kind: 'collection',
    copy: ['Men’s perfumes in Malaysia', 'Discover men’s fragrances for work, weekends and evenings out, from fresh and citrusy to deep, woody and spicy. Every bottle is 100% authentic, and you pay when it arrives with cash on delivery anywhere in Malaysia.', 'Orders over RM 150 ship free and usually arrive in 2–5 working days. Browse <a href="women.html">women’s perfumes</a>, see the <a href="bestsellers.html">best sellers</a> or <a href="shop.html">shop all fragrances</a>.'] },
  'women.html': { path: '/women.html', title: 'Women’s Perfumes in Malaysia | English Perfume', crumb: 'Women’s perfumes',
    desc: 'Buy authentic women’s perfumes online in Malaysia: floral, fruity and warm vanilla fragrances. Cash on delivery and free shipping over RM 150.', img: '/images/og-women.jpg', kind: 'collection',
    copy: ['Women’s perfumes in Malaysia', 'Explore women’s fragrances, from soft florals and fresh fruity notes to warm vanilla and amber. Every bottle is 100% authentic, and you can pay in cash when your order is delivered anywhere in Malaysia.', 'Orders over RM 150 ship free and usually arrive in 2–5 working days. Browse <a href="men.html">men’s perfumes</a>, see the <a href="bestsellers.html">best sellers</a> or <a href="shop.html">shop all fragrances</a>.'] },
  'bestsellers.html': { path: '/bestsellers.html', title: 'Best Selling Perfumes in Malaysia | English Perfume', crumb: 'Best sellers',
    desc: 'Our best selling perfumes in Malaysia: the most loved men’s and women’s fragrances. 100% authentic with cash on delivery.', img: '/images/og-default.jpg', kind: 'collection',
    copy: ['Best selling perfumes', 'These are the fragrances our customers love most. Every bottle is 100% authentic, with cash on delivery across Malaysia and free shipping on orders over RM 150.', 'Want more choice? Browse <a href="men.html">men’s perfumes</a>, <a href="women.html">women’s perfumes</a> or <a href="shop.html">everything we sell</a>.'] },
  'customer-support.html': { path: '/customer-support.html', title: 'Customer Support & FAQ | English Perfume',
    desc: 'Get help with your English Perfume order: delivery, cash on delivery, tracking and returns. Contact us on WhatsApp or email.', img: '/images/og-default.jpg' },
  'shipping-policy.html': { path: '/shipping-policy.html', title: 'Shipping & Delivery Policy | English Perfume',
    desc: 'Delivery across Malaysia in 2–5 working days with cash on delivery. Read the English Perfume shipping policy.', img: '/images/og-default.jpg' },
  'policies.html': { path: '/policies.html', title: 'Returns, Privacy & Terms | English Perfume',
    desc: 'Read the English Perfume returns policy, privacy policy and terms of service for shopping with us in Malaysia.', img: '/images/og-default.jpg' },
  'checkout.html': { path: '/checkout.html', title: 'Checkout | English Perfume', desc: 'Complete your English Perfume order. Cash on delivery across Malaysia.', noindex: true },
  'track.html': { path: '/track.html', title: 'Track your order | English Perfume', desc: 'Track your English Perfume order with your order number and phone number.', noindex: true },
  'product.html': { path: '/product.html', title: 'English Perfume | Product', desc: 'English Perfume – premium fragrances. Cash on delivery across Malaysia.', noindex: true } // template; real product pages are made by the server
};

const orgNode = () => ({ '@type': 'Organization', '@id': SITE + '/#organization', name: BUSINESS.name, url: SITE + '/',
  logo: SITE + '/icon-512.png', email: BUSINESS.email, telephone: BUSINESS.phone,
  address: { '@type': 'PostalAddress', streetAddress: BUSINESS.street, addressLocality: BUSINESS.city, postalCode: BUSINESS.zip, addressCountry: 'MY' },
  contactPoint: { '@type': 'ContactPoint', contactType: 'customer service', telephone: BUSINESS.phone, email: BUSINESS.email, areaServed: 'MY', availableLanguage: ['English', 'Malay'],
    hoursAvailable: { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], opens: '09:00', closes: '18:00' } } });

function jsonLd(file, pg) {
  if (!SITE || pg.noindex) return [];
  const out = [];
  if (pg.kind === 'home') {
    out.push({ '@context': 'https://schema.org', '@graph': [orgNode(),
      { '@type': 'WebSite', '@id': SITE + '/#website', url: SITE + '/', name: BUSINESS.name, inLanguage: 'en-MY', publisher: { '@id': SITE + '/#organization' } }] });
    out.push({ '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });
  } else if (pg.kind === 'collection') {
    out.push({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: pg.title, description: pg.desc, url: SITE + pg.path, isPartOf: { '@id': SITE + '/#website' } });
    out.push({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name: pg.crumb, item: SITE + pg.path }] });
  }
  return out;
}

function seoBlock(file, pg) {
  const t = he(pg.title), d = he(pg.desc), url = abs(pg.path);
  const L = ['<!--SEO-START-->', `<title>${t}</title>`, `<meta name="description" content="${d}">`,
    pg.noindex ? '<meta name="robots" content="noindex,follow">' : '<meta name="robots" content="index,follow,max-image-preview:large">'];
  if (!pg.noindex) {
    if (url) L.push(`<link rel="canonical" href="${he(url)}">`);
    L.push('<meta property="og:type" content="website">', '<meta property="og:site_name" content="English Perfume">', '<meta property="og:locale" content="en_MY">',
      `<meta property="og:title" content="${t}">`, `<meta property="og:description" content="${d}">`);
    if (url) L.push(`<meta property="og:url" content="${he(url)}">`);
    if (pg.img && SITE) L.push(`<meta property="og:image" content="${he(SITE + pg.img)}">`, `<meta property="og:image:alt" content="${t}">`);
    L.push('<meta name="twitter:card" content="summary_large_image">', `<meta name="twitter:title" content="${t}">`, `<meta name="twitter:description" content="${d}">`);
    if (pg.img && SITE) L.push(`<meta name="twitter:image" content="${he(SITE + pg.img)}">`);
  }
  for (const o of jsonLd(file, pg)) L.push(`<script type="application/ld+json">${ld(o)}</script>`);
  if (pg.kind === 'home' || pg.copy) L.push('<style>.seo-copy{padding:clamp(44px,6vw,84px) 0;background:var(--bg,#faf8f5);border-top:1px solid var(--line,#e8e0da)}.seo-copy h2{font-family:var(--serif,Georgia,serif);font-weight:400;font-size:clamp(1.6rem,3.4vw,2.3rem);color:var(--oud,#5b2c3f);margin:0 0 14px}.seo-copy h2+p,.seo-copy p{max-width:72ch;color:var(--muted,#6f6560);line-height:1.7;margin:0 0 14px}.seo-copy a{color:var(--oud,#5b2c3f);text-decoration:underline;text-underline-offset:3px}.seo-copy .faq-h{margin-top:34px}.seo-copy details{max-width:72ch;border-bottom:1px solid var(--line,#e8e0da);padding:14px 0}.seo-copy summary{cursor:pointer;font-weight:500;color:var(--ink,#2b2220)}.seo-copy details p{margin:10px 0 0}</style>');
  L.push('<!--SEO-END-->');
  return L.join('\n');
}

function extraContent(pg) {
  if (pg.kind === 'home') {
    return '<section class="seo-copy" id="about-perfumes"><div class="container"><h2>Buy original perfumes online in Malaysia</h2>' +
      '<p>English Perfume is a Malaysian online perfume shop for men’s, women’s and unisex fragrances. Every bottle is 100% authentic, and you pay with cash on delivery when your order arrives anywhere in Malaysia.</p>' +
      '<p>Not sure where to start? Explore our <a href="men.html">men’s perfumes</a>, <a href="women.html">women’s perfumes</a> or the <a href="bestsellers.html">best sellers</a>, or <a href="shop.html">shop all fragrances</a>. Orders over RM 150 ship free and usually arrive in 2–5 working days.</p>' +
      '<h2 class="faq-h">Frequently asked questions</h2>' +
      FAQ.map(([q, a]) => `<details><summary>${he(q)}</summary><p>${he(a)}${q.startsWith('How can I track') ? ' <a href="track.html">Track your order</a>.' : ''}</p></details>`).join('') +
      '</div></section>';
  }
  if (pg.copy) return `<section class="seo-copy"><div class="container"><h2>${pg.copy[0]}</h2><p>${pg.copy[1]}</p><p>${pg.copy[2]}</p></div></section>`;
  return '';
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(SRC, OUT, { recursive: true });

let n = 0;
for (const [file, pg] of Object.entries(PAGES)) {
  const f = path.join(OUT, file);
  if (!fs.existsSync(f)) { console.warn('missing page', file); continue; }
  let html = fs.readFileSync(f, 'utf8');
  html = html.replace(/<title>[\s\S]*?<\/title>/i, '').replace(/<meta name="description"[^>]*>/i, '').replace(/<meta name="robots"[^>]*>/i, '')
    .replace(/<!--SEO-START-->[\s\S]*?<!--SEO-END-->/g, '');
  html = html.replace('</head>', seoBlock(file, pg) + '\n</head>');
  const extra = extraContent(pg);
  if (extra && html.includes('</main>')) html = html.replace('</main>', extra + '\n</main>');
  fs.writeFileSync(f, html); n++;
}

fs.writeFileSync(path.join(OUT, '404.html'), '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Page not found | English Perfume</title><link rel="icon" href="/favicon.svg" type="image/svg+xml"></head><body style="font-family:Georgia,serif;text-align:center;padding:12vh 20px;color:#2b2220;background:#faf8f5"><h1 style="font-weight:400">This page could not be found</h1><p><a href="/" style="color:#5b2c3f">Go to the English Perfume home page</a> or <a href="/shop.html" style="color:#5b2c3f">browse all perfumes</a>.</p></body></html>');
console.log(`SEO build done: ${n} pages, site address: ${SITE || '(not set: add SITE_URL in Vercel to get canonical links and social previews)'}`);
