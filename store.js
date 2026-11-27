'use strict';
/*
 * Tiny storage layer used by server.js.
 *  - On Vercel (or anywhere you set KV_REST_API_URL + KV_REST_API_TOKEN, or the UPSTASH_REDIS_REST_* pair)
 *    everything is kept in Upstash Redis, so orders, products, photos and the admin login survive restarts.
 *  - Without those variables it falls back to one JSON file (data/store.json) for running on your own computer.
 * Every function is async and works the same on both.
 */
const fs = require('fs');
const path = require('path');

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const REDIS_URL = process.env.REDIS_URL;            // normal Redis address (Redis Cloud etc.): rediss://user:password@host:port
const REST = !!(URL_ && TOKEN);                     // Upstash REST
const REMOTE = REST || !!REDIS_URL;
const P = 'ep:';                       // key prefix, so the database can be shared with other things

/* ---------- Redis: Upstash REST API, or a normal Redis connection (REDIS_URL) ---------- */
async function restCmd(args) {
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(args.map(String))
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error('Redis: ' + (j.error || r.status));
  return j.result;
}
let client = null, connecting = null;
async function tcpClient() {
  if (client && !client.isOpen) { client = null; connecting = null; }
  if (!client) {
    const { createClient } = require('redis');
    client = createClient({ url: REDIS_URL, socket: { connectTimeout: 8000, reconnectStrategy: false } });
    client.on('error', () => {});                   // errors are reported by the command that hits them
    connecting = client.connect().catch(e => { client = null; connecting = null; throw e; });
  }
  await connecting;
  return client;
}
async function tcpCmd(args) {
  try { return await (await tcpClient()).sendCommand(args.map(String)); }
  catch (e) { throw new Error('Redis: ' + String((e && e.message) || e).slice(0, 150)); }
}
const cmd = REST ? restCmd : tcpCmd;
const parse = v => { if (v == null) return null; try { return JSON.parse(v); } catch { return null; } };

const remote = {
  async get(k) { return parse(await cmd(['GET', P + k])); },
  async set(k, v) { await cmd(['SET', P + k, JSON.stringify(v)]); },
  async del(k) { await cmd(['DEL', P + k]); },
  async incr(k) { return Number(await cmd(['INCR', P + k])); },
  async hget(h, f) { return parse(await cmd(['HGET', P + h, f])); },
  async hset(h, f, v) { await cmd(['HSET', P + h, f, JSON.stringify(v)]); },
  async hdel(h, f) { await cmd(['HDEL', P + h, f]); },
  async hall(h) {
    const flat = (await cmd(['HGETALL', P + h])) || [];
    const out = [];
    for (let i = 1; i < flat.length; i += 2) { const v = parse(flat[i]); if (v != null) out.push(v); }
    return out;
  },
  async hit(k, windowMs) {               // counts attempts inside a time window (rate limiting)
    const n = Number(await cmd(['INCR', P + 'rl:' + k]));
    if (n === 1) await cmd(['PEXPIRE', P + 'rl:' + k, Math.ceil(windowMs)]);
    return n;
  }
};

/* ---------- local JSON file (for your own computer) ---------- */
const FILE = path.join(process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, 'data'), 'store.json');
let mem = null;
const hits = new Map();
function load() {
  if (mem) return mem;
  try { mem = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { mem = { kv: {}, hash: {} }; }
  return mem;
}
function flush() {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(mem));
  fs.renameSync(tmp, FILE);
}
const clone = v => (v == null ? null : JSON.parse(JSON.stringify(v)));
const local = {
  async get(k) { return clone(load().kv[k]); },
  async set(k, v) { load().kv[k] = clone(v); flush(); },
  async del(k) { delete load().kv[k]; flush(); },
  async incr(k) { const d = load(); d.kv[k] = (Number(d.kv[k]) || 0) + 1; flush(); return d.kv[k]; },
  async hget(h, f) { const d = load(); return clone(d.hash[h] && d.hash[h][f]); },
  async hset(h, f, v) { const d = load(); (d.hash[h] = d.hash[h] || {})[f] = clone(v); flush(); },
  async hdel(h, f) { const d = load(); if (d.hash[h]) { delete d.hash[h][f]; flush(); } },
  async hall(h) { const d = load(); return Object.values(d.hash[h] || {}).map(clone); },
  async hit(k, windowMs) {
    const now = Date.now(), a = (hits.get(k) || []).filter(t => now - t < windowMs);
    a.push(now); hits.set(k, a); return a.length;
  }
};

/* On Vercel the disk is read-only, so without Redis nothing can be saved. Say so clearly instead of a vague "Server error". */
const NO_DB = !REMOTE && !!process.env.VERCEL;
const missing = {};
for (const n of ['get', 'set', 'del', 'incr', 'hget', 'hset', 'hdel', 'hall', 'hit']) {
  missing[n] = async () => {
    const e = new Error('The database is not connected. In Vercel open Storage, connect the Upstash Redis database to this project for Production, then Redeploy.');
    e.code = 'NO_DB'; throw e;
  };
}
const safeMsg = e => String((e && e.message) || e).replace(/https?:\/\/\S+/g, '[url]').slice(0, 200);

module.exports = Object.assign({ mode: REMOTE ? 'redis' : NO_DB ? 'missing' : 'local', safeMsg }, NO_DB ? missing : REMOTE ? remote : local);
