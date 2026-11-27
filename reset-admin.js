'use strict';
/* Set a new admin password.   Usage:  node reset-admin.js            (asks you)
 *                              or:  node reset-admin.js NewPassword1  (no questions)  */
const fs = require('fs'), path = require('path'), crypto = require('crypto'), readline = require('readline');
try { fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/).forEach(l => { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }); } catch {}
const store = require('./store'); // same storage as the server (Upstash if the KV_REST_API_* variables are set, else a local file)
const hashPw = (pw, salt = crypto.randomBytes(16).toString('hex')) => salt + ':' + crypto.scryptSync(pw, salt, 64).toString('hex');
const ask = q => new Promise(r => { const rl = readline.createInterface({ input: process.stdin, output: process.stdout }); rl.question(q, a => { rl.close(); r(a.trim()); }); });
(async () => {
  const old = (await store.get('admin')) || {};
  const user = old.user || process.env.ADMIN_USER || 'admin';
  let pw = process.argv[2];
  if (!pw) {
    console.log('\n  Reset the admin password (username stays "' + user + '").');
    for (;;) {
      const a = await ask('  New password (at least 8 characters), or press Enter for a random one: ');
      if (!a) break;
      if (a.length >= 8) { pw = a; break; }
      console.log('  Too short, please use at least 8 characters.');
    }
  }
  if (pw && pw.length < 8) { console.log('\n  The password must be at least 8 characters.\n'); process.exit(1); }
  if (!pw) pw = crypto.randomBytes(6).toString('base64url');
  await store.set('admin', { user, hash: hashPw(pw) });
  console.log('\n  ==============================================');
  console.log('   ADMIN LOGIN');
  console.log('   Username :', user);
  console.log('   Password :', pw);
  console.log('  ==============================================');
  console.log('  Done. If the server is running it uses the new password straight away.\n');
})();
