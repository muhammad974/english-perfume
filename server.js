'use strict';
/**
 * English Perfume – backend
 * - Serves the website from /public
 * - POST /api/orders          (public)  receives customer orders
 * - /api/admin/*              (login)   used by the admin panel at /admin
 * Orders are stored in data/orders.json (back this file up regularly).
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { notifyNewOrder: sendWhatsApp } = require('./whatsapp-notify');

/* ---------- tiny .env loader ---------- */
try {
  fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/).forEach(l => {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
} catch { /* no .env file – that's fine */ }

const PORT = Number(process.env.PORT) || 3000;
const SESSION_MS = 12 * 60 * 60 * 1000;
const STATUSES = ['new', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];
const DATA = path.join(__dirname, 'data');
fs.mkdirSync(DATA, { recursive: true });

/* ---------- catalogue (prices are ALWAYS taken from here, never from the browser) ---------- */
let CATALOG = JSON.parse(fs.readFileSync(path.join(__dirname, 'catalog.json'), 'utf8'));
const PRODUCTS = new Map(CATALOG.products.map(p => [p.id, p]));
let deliveryFee = CATALOG.config.deliveryFee, freeShippingOver = CATALOG.config.freeShippingOver;
function persistCatalog(){ const tmp=path.join(__dirname,'catalog.json.tmp'); fs.writeFileSync(tmp, JSON.stringify(CATALOG,null,2)); fs.renameSync(tmp,path.join(__dirname,'catalog.json')); PRODUCTS.clear(); CATALOG.products.forEach(p=>PRODUCTS.set(Number(p.id),p)); deliveryFee=Number(CATALOG.config.deliveryFee)||0; freeShippingOver=Number(CATALOG.config.freeShippingOver)||0; }

/* ---------- order storage (JSON file, written atomically) ---------- */
const ORDERS_FILE = path.join(DATA, 'orders.json');
let DB = { counter: 1000, orders: [] };
try { DB = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8')); } catch { /* first run */ }
function save() {
  const tmp = ORDERS_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(DB));
  fs.renameSync(tmp, ORDERS_FILE);
}

/* ---------- admin account ---------- */
const ADMIN_FILE = path.join(DATA, 'admin.json');
const hashPw = (pw, salt = crypto.randomBytes(16).toString('hex')) =>
  salt + ':' + crypto.scryptSync(pw, salt, 64).toString('hex');
const checkPw = (pw, stored) => {
  const [salt, h] = stored.split(':');
  const a = crypto.scryptSync(String(pw), salt, 64), b = Buffer.from(h, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
let ADMIN = null;
function admin() { // always read the file, so a password reset works even while the server is running
  try { ADMIN = JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf8')); } catch { /* not created yet */ }
  return ADMIN;
}
admin();
const ask = q => new Promise(resolve => {
  const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
  rl.question(q, a => { rl.close(); resolve(a.trim()); });
});
async function createAdmin() {
  const user = process.env.ADMIN_USER || 'admin';
  let pw = process.env.ADMIN_PASSWORD, how = 'env';
  if (!pw && process.stdin.isTTY && process.stdout.isTTY) {
    console.log('\n  First start: let\'s create your admin login.');
    console.log('  Username will be:', user);
    for (;;) {
      const a = await ask('  Choose a password (at least 8 characters), or just press Enter for a random one: ');
      if (!a) break;
      if (a.length >= 8) { pw = a; how = 'chosen'; break; }
      console.log('  That is too short. Please use at least 8 characters.');
    }
  }
  if (!pw) { pw = crypto.randomBytes(6).toString('base64url'); how = 'random'; }
  const a = { user, hash: hashPw(pw) };
  fs.writeFileSync(ADMIN_FILE, JSON.stringify(a));
  console.log('\n  ==============================================');
  console.log('   ADMIN LOGIN');
  console.log('   Username :', user);
  console.log('   Password :', how === 'env' ? '(the ADMIN_PASSWORD from your .env file)' : pw);
  console.log('  ==============================================');
  if (how !== 'env') console.log('  Write this down. Forgot it later? Run reset-admin-password.bat (or: npm run reset-admin).');
  return a;
}

/* ---------- sessions + rate limiting (in memory) ---------- */
const sessions = new Map();
const hits = new Map();
function limit(key, max, windowMs) {
  const now = Date.now();
  const a = (hits.get(key) || []).filter(t => now - t < windowMs);
  if (a.length >= max) { hits.set(key, a); return false; }
  a.push(now); hits.set(key, a); return true;
}
setInterval(() => {
  const now = Date.now();
  for (const [k, a] of hits) if (!a.some(t => now - t < 3600e3)) hits.delete(k);
  for (const [k, s] of sessions) if (s.exp < now) sessions.delete(k);
}, 600e3).unref();
const getCookie = (req, n) => {
  const m = (req.headers.cookie || '').split(/;\s*/).find(c => c.startsWith(n + '='));
  return m ? decodeURIComponent(m.slice(n.length + 1)) : null;
};
function auth(req, res, next) {
  const t = getCookie(req, 'ep_admin');
  const s = t && sessions.get(t);
  if (!s || s.exp < Date.now()) { if (t) sessions.delete(t); return res.status(401).json({ error: 'Please sign in' }); }
  if (req.method !== 'GET' && req.headers['x-requested-with'] !== 'ep-admin') return res.status(403).json({ error: 'Bad request' });
  s.exp = Date.now() + SESSION_MS; req.session = s; req.token = t; next();
}

/* ---------- helpers ---------- */
const str = (v, max) => (typeof v === 'string' ? v.trim().replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, max) : '');
const round2 = n => Math.round(n * 100) / 100;
const counts = () => {
  const c = { all: DB.orders.length };
  STATUSES.forEach(s => (c[s] = 0));
  DB.orders.forEach(o => { c[o.status] = (c[o.status] || 0) + 1; });
  return c;
};
function stats() {
  const now = new Date(), day = now.toDateString();
  let today = 0, todaySales = 0, monthSales = 0, open = 0;
  for (const o of DB.orders) {
    const d = new Date(o.createdAt);
    if (['new', 'confirmed', 'packed'].includes(o.status)) open++;
    if (o.status === 'cancelled') continue;
    if (d.toDateString() === day) { today++; todaySales += o.totals.total; }
    if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) monthSales += o.totals.total;
  }
  return { today, todaySales: round2(todaySales), monthSales: round2(monthSales), open };
}
async function notifyTelegram(o) {
  const t = process.env.TELEGRAM_BOT_TOKEN, c = process.env.TELEGRAM_CHAT_ID;
  if (!t || !c) return;
  const text = `New order ${o.orderNo}\n${o.customer.name} | ${o.customer.phone}\n${o.shipping.city}, ${o.shipping.state}\n` +
    o.items.map(i => `${i.qty} x ${i.name}`).join('\n') + `\nTotal: RM ${o.totals.total} (cash on delivery)`;
  try {
    await fetch(`https://api.telegram.org/bot${t}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: c, text })
    });
  } catch (e) { console.error('Telegram notification failed:', e.message); }
}
// WhatsApp alert to the owner (CallMeBot or WhatsApp Cloud API). Only runs when WA_OWNER_NUMBER is set in .env
async function notifyWhatsApp(o) {
  if (!process.env.WA_OWNER_NUMBER) return;
  try { await sendWhatsApp(o); }
  catch (e) { console.error('WhatsApp notification failed:', e.message); }
}
// Never blocks or breaks the customer's order: runs in the background
const notify = o => { Promise.allSettled([notifyTelegram(o), notifyWhatsApp(o)]); };

/* ---------- app ---------- */
const app = express();
if (process.env.TRUST_PROXY) app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin' });
  if (req.path.startsWith('/admin') || req.path.startsWith('/api/admin')) res.set({ 'X-Frame-Options': 'DENY', 'Cache-Control': 'no-store' });
  next();
});
app.use('/api/admin/product-image', express.json({ limit: '8mb' })); // photo uploads only
app.use(express.json({ limit: '20kb' }));

// Only needed if the website is hosted on a different domain than this server
app.use('/api/orders', (req, res, next) => {
  const origin = process.env.ALLOWED_ORIGIN;
  if (origin) {
    res.set({ 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST,OPTIONS' });
    if (req.method === 'OPTIONS') return res.sendStatus(204);
  }
  next();
});

/* ===== PUBLIC: current product catalogue ===== */
app.get('/api/catalog', (req,res)=>res.set('Cache-Control','no-store').json({products:CATALOG.products,config:CATALOG.config}));

/* ===== PUBLIC: place an order ===== */
app.post('/api/orders', (req, res) => {
  // generous cap on raw attempts (typos, retries); the stricter cap below counts only real orders
  if (!limit('try:' + req.ip, 60, 3600e3)) return res.status(429).json({ error: 'Too many attempts. Please try again later or message us on WhatsApp.' });
  const b = req.body || {};
  if (b.website) return res.status(201).json({ ok: true, order: { orderNo: 'EP-0000', shipping: {}, items: [], totals: { total: 0 } } }); // bot trap

  const c = b.customer || {}, s = b.shipping || {};
  const customer = { name: str(c.name, 80), phone: str(c.phone, 20), email: str(c.email, 120) };
  const shipping = { state: str(s.state, 40), city: str(s.city, 60), address: str(s.address, 300) };
  const notes = str(b.notes, 500);

  const errors = [];
  if (customer.name.length < 2) errors.push('Please enter your full name.');
  if (!/^\+?[0-9][0-9 \-]{7,15}$/.test(customer.phone)) errors.push('Please enter a valid phone number.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) errors.push('Please enter a valid email address.');
  if (!shipping.state) errors.push('Please select your state.');
  if (shipping.city.length < 2) errors.push('Please enter your city.');
  if (shipping.address.length < 8) errors.push('Please enter your complete delivery address.');

  const merged = new Map();
  if (!Array.isArray(b.items) || b.items.length === 0 || b.items.length > 30) errors.push('Your cart is empty.');
  else for (const it of b.items) {
    const id = Number(it && it.productId), qty = Math.floor(Number(it && it.qty));
    if (!PRODUCTS.has(id) || PRODUCTS.get(id).active === false || !(qty >= 1 && qty <= 20)) { errors.push('One of the items in your cart is no longer available.'); break; }
    merged.set(id, Math.min(20, (merged.get(id) || 0) + qty));
  }
  if (errors.length) return res.status(400).json({ error: errors[0], errors });

  if (!limit('order:' + req.ip, 15, 3600e3)) return res.status(429).json({ error: 'Too many orders from this connection. Please try again later or message us on WhatsApp.' });

  const items = [...merged].map(([id, qty]) => {
    const p = PRODUCTS.get(id);
    return { productId: id, name: p.name, qty, unitPrice: p.price, lineTotal: round2(p.price * qty), img: p.img || '' };
  });
  const subtotal = round2(items.reduce((t, i) => t + i.lineTotal, 0));
  const ship = subtotal >= freeShippingOver ? 0 : deliveryFee;
  const now = new Date().toISOString();
  const order = {
    id: crypto.randomUUID(), orderNo: 'EP-' + (++DB.counter), createdAt: now, status: 'new',
    customer, shipping, notes, items, payment: { method: 'COD', status: 'unpaid' },
    totals: { subtotal, shipping: ship, total: round2(subtotal + ship) }, currency: 'MYR',
    adminNote: '', history: [{ status: 'new', at: now, by: 'customer' }]
  };
  DB.orders.unshift(order);
  save();
  notify(order);
  res.status(201).json({ ok: true, order: {
    orderNo: order.orderNo, createdAt: now, shipping: { city: shipping.city, state: shipping.state },
    items: items.map(i => ({ name: i.name, qty: i.qty })), totals: order.totals
  } });
});


/* ===== PUBLIC: customer order tracking (order number + phone number) ===== */
app.post('/api/track', (req, res) => {
  if (!limit('track:' + req.ip, 20, 3600e3)) return res.status(429).json({ error: 'Too many lookups. Please try again in a while or message us on WhatsApp.' });
  const b = req.body || {};
  const raw = str(b.orderNo, 20).toUpperCase().replace(/\s+/g, '');
  const orderNo = /^\d+$/.test(raw) ? 'EP-' + raw : raw;
  const digits = str(b.phone, 25).replace(/\D/g, '');
  const notFound = () => res.status(404).json({ error: "We couldn't find an order with those details. Check the order number and the phone number you used at checkout." });
  if (!/^EP-\d{1,8}$/.test(orderNo) || digits.length < 8) return notFound();
  const tail = v => String(v || '').replace(/\D/g, '').slice(-8);
  const o = DB.orders.find(x => x.orderNo === orderNo);
  if (!o || tail(o.customer && o.customer.phone) !== tail(digits)) return notFound();
  // only share what the customer needs: no email, no full address, no admin notes
  res.set('Cache-Control', 'no-store').json({ order: {
    orderNo: o.orderNo, createdAt: o.createdAt, status: o.status,
    history: (o.history || []).map(h => ({ status: h.status, at: h.at })),
    items: o.items.map(i => ({ name: i.name, qty: i.qty })),
    totals: o.totals,
    shipping: { city: o.shipping.city, state: o.shipping.state },
    payment: { method: o.payment.method, status: o.payment.status }
  } });
});

/* ===== ADMIN PRODUCT MANAGEMENT (authenticated) ===== */
app.get('/api/admin/products', auth, (req,res)=>res.json({products:CATALOG.products, config:CATALOG.config}));
app.post('/api/admin/products', auth, (req,res)=>{
  const b=req.body||{}; const name=str(b.name,120); const price=Number(b.price), id=Math.max(0,...CATALOG.products.map(p=>Number(p.id)||0))+1;
  if(name.length<2 || !Number.isFinite(price) || price<0) return res.status(400).json({error:'Product name and valid price are required.'});
  const p={id,name,price,cat:['men','women','unisex'].includes(b.cat)?b.cat:'unisex',label:str(b.label,100),img:str(b.img,2000),was:Number(b.was)||0,active:b.active!==false,stock:Math.max(0,Math.floor(Number(b.stock)||0)),sku:str(b.sku,40),description:str(b.description,1000)};
  CATALOG.products.push(p); persistCatalog(); res.status(201).json({product:p});
});
app.put('/api/admin/products/:id', auth, (req,res)=>{
  const p=PRODUCTS.get(Number(req.params.id)); if(!p) return res.status(404).json({error:'Product not found'}); const b=req.body||{};
  if(b.name!==undefined){const n=str(b.name,120); if(n.length<2)return res.status(400).json({error:'Name is required'});p.name=n;}
  if(b.price!==undefined){const v=Number(b.price);if(!Number.isFinite(v)||v<0)return res.status(400).json({error:'Invalid price'});p.price=v;}
  if(b.cat!==undefined)p.cat=['men','women','unisex'].includes(b.cat)?b.cat:'unisex';
  if(b.was!==undefined)p.was=Math.max(0,Number(b.was)||0);
  for(const k of ['label','img','sku','description'])if(b[k]!==undefined)p[k]=str(b[k], k==='img'?2000:k==='description'?1000:120);
  if(b.active!==undefined)p.active=!!b.active;if(b.stock!==undefined)p.stock=Math.max(0,Math.floor(Number(b.stock)||0));
  persistCatalog();res.json({product:p});
});
app.delete('/api/admin/products/:id', auth, (req,res)=>{const id=Number(req.params.id);if(!PRODUCTS.has(id))return res.status(404).json({error:'Product not found'});CATALOG.products=CATALOG.products.filter(p=>Number(p.id)!==id);persistCatalog();res.json({ok:true});});
app.patch('/api/admin/products/:id/stock', auth, (req,res)=>{const p=PRODUCTS.get(Number(req.params.id));if(!p)return res.status(404).json({error:'Product not found'});p.stock=Math.max(0,Math.floor(Number(req.body.stock)||0));persistCatalog();res.json({product:p});});
app.patch('/api/admin/products/:id/active', auth, (req,res)=>{const p=PRODUCTS.get(Number(req.params.id));if(!p)return res.status(404).json({error:'Product not found'});p.active=!!req.body.active;persistCatalog();res.json({product:p});});
app.post('/api/admin/product-image', auth, (req,res)=>{
 const {data,filename}=req.body||{}; if(typeof data!=='string'||!data.startsWith('data:image/'))return res.status(400).json({error:'Invalid image'});
 const m=data.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);if(!m)return res.status(400).json({error:'Use PNG, JPEG, or WebP images'});
 const ext=m[1]==='jpeg'?'jpg':m[1], buf=Buffer.from(m[2],'base64');if(buf.length>5*1024*1024)return res.status(400).json({error:'Image must be under 5 MB'});
 const dir=path.join(__dirname,'public','images','products');fs.mkdirSync(dir,{recursive:true});const safe=(String(filename||'product').replace(/[^a-z0-9_-]/gi,'').slice(0,40)||'product')+'-'+crypto.randomBytes(4).toString('hex')+'.'+ext;fs.writeFileSync(path.join(dir,safe),buf);res.json({url:'/images/products/'+safe});
});

/* ===== ADMIN ===== */
app.post('/api/admin/login', (req, res) => {
  if (!limit('login:' + req.ip, 6, 15 * 60e3)) return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });
  const { user, password } = req.body || {};
  const A = admin();
  const pwOk = checkPw(typeof password === 'string' ? password : '', A.hash);
  if (!(typeof user === 'string' && user === A.user && pwOk)) return res.status(401).json({ error: 'Wrong username or password.' });
  const t = crypto.randomBytes(32).toString('hex');
  sessions.set(t, { exp: Date.now() + SESSION_MS, user });
  res.cookie('ep_admin', t, { httpOnly: true, sameSite: 'strict', secure: process.env.COOKIE_SECURE === '1', maxAge: SESSION_MS, path: '/' });
  res.json({ ok: true, user });
});
app.post('/api/admin/logout', auth, (req, res) => { sessions.delete(req.token); res.clearCookie('ep_admin', { path: '/' }); res.json({ ok: true }); });
app.get('/api/admin/me', auth, (req, res) => res.json({ user: req.session.user }));

app.get('/api/admin/orders', auth, (req, res) => {
  let list = DB.orders;
  const { status, q } = req.query;
  if (status && STATUSES.includes(status)) list = list.filter(o => o.status === status);
  if (q) {
    const s = String(q).toLowerCase().slice(0, 80);
    list = list.filter(o => `${o.orderNo} ${o.customer.name} ${o.customer.phone} ${o.customer.email}`.toLowerCase().includes(s));
  }
  res.json({ orders: list.slice(0, 500), counts: counts(), stats: stats() });
});

app.patch('/api/admin/orders/:id', auth, (req, res) => {
  const o = DB.orders.find(x => x.id === req.params.id);
  if (!o) return res.status(404).json({ error: 'Order not found' });
  const { status, adminNote } = req.body || {};
  if (status !== undefined) {
    if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    if (status !== o.status) {
      o.status = status;
      o.history.push({ status, at: new Date().toISOString(), by: 'admin' });
      o.payment.status = status === 'delivered' ? 'paid' : 'unpaid';
    }
  }
  if (typeof adminNote === 'string') o.adminNote = adminNote.slice(0, 1000);
  o.updatedAt = new Date().toISOString();
  save();
  res.json({ order: o, counts: counts(), stats: stats() });
});

app.delete('/api/admin/orders/:id', auth, (req, res) => {
  const i = DB.orders.findIndex(x => x.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Order not found' });
  if (DB.orders[i].status !== 'cancelled') return res.status(400).json({ error: 'Only cancelled orders can be deleted.' });
  DB.orders.splice(i, 1); save();
  res.json({ ok: true, counts: counts(), stats: stats() });
});

app.get('/api/admin/orders.csv', auth, (req, res) => {
  const cell = v => { v = String(v ?? ''); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
  const head = ['Order No', 'Date', 'Status', 'Name', 'Phone', 'Email', 'State', 'City', 'Address', 'Items', 'Subtotal', 'Delivery', 'Total', 'Payment', 'Customer notes', 'Admin note'];
  const rows = DB.orders.map(o => [o.orderNo, o.createdAt, o.status, o.customer.name, o.customer.phone, o.customer.email, o.shipping.state, o.shipping.city, o.shipping.address,
    o.items.map(i => `${i.qty} x ${i.name}`).join('; '), o.totals.subtotal, o.totals.shipping, o.totals.total, o.payment.status, o.notes, o.adminNote].map(cell).join(','));
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="orders-' + new Date().toISOString().slice(0, 10) + '.csv"' });
  res.send('\ufeff' + [head.map(cell).join(','), ...rows].join('\r\n'));
});

app.post('/api/admin/password', auth, (req, res) => {
  const { current, next } = req.body || {};
  const A = admin();
  if (!checkPw(typeof current === 'string' ? current : '', A.hash)) return res.status(400).json({ error: 'Current password is wrong.' });
  if (typeof next !== 'string' || next.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  A.hash = hashPw(next);
  fs.writeFileSync(ADMIN_FILE, JSON.stringify(A));
  for (const k of sessions.keys()) if (k !== req.token) sessions.delete(k);
  res.json({ ok: true });
});

/* ===== static files ===== */
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));
app.use('/admin', express.static(path.join(__dirname, 'admin'), { index: false })); // admin.css + admin.js
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  if (err.type !== 'entity.parse.failed' && err.type !== 'entity.too.large') console.error(err);
  res.status(err.status && err.status < 500 ? err.status : 500).json({ error: err.status && err.status < 500 ? 'Invalid request' : 'Server error' });
});

(async () => {
  if (!admin()) ADMIN = await createAdmin();
  app.listen(PORT, () => {
    console.log(`\n  English Perfume is running`);
    console.log(`  Website : http://localhost:${PORT}`);
    console.log(`  Admin   : http://localhost:${PORT}/admin`);
    console.log(`  Login   : username "${ADMIN.user}". Forgot the password? Close this window and run reset-admin-password.bat\n`);
  });
})();
