# English Perfume on Vercel: website + admin panel (ek hi project)

Ye poora folder ek GitHub repo banega aur ek hi Vercel project mein jayega.
- Website: `public/` ke pages
- Admin panel: `https://AAPKADOMAIN.com/admin`
- Orders, products, photos aur admin login: free Upstash Redis database mein (Vercel se jura hua)

## 1. GitHub par upload
1. github.com par account banayein, New repository, naam `english-perfume`, **Private**.
2. "uploading an existing file" par click karein. Is folder ke **andar ki saari files aur folders** (api, admin, public, server.js, store.js, vercel.json, package.json waghera) drag karke daalein. Folder `english-perfume-vercel` khud nahi, sirf uske andar ka sab kuch.
3. Commit changes.

## 2. Vercel par import
1. vercel.com par GitHub se login. Add New, Project, `english-perfume` repo, Import.
2. **Framework Preset: Other.** Build Command, Output Directory, Install Command ko khali/default chhor dein (vercel.json khud set karti hai).
3. Environment Variables (Deploy se pehle) mein ye daalein:
   - `ADMIN_PASSWORD` = apna strong password (kam az kam 8 characters). **Zaroori.**
   - `ADMIN_USER` = admin (chahein to koi aur naam)
   - `SESSION_SECRET` = koi lamba random text, jaise 40 keys ka
   - Optional: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `WA_OWNER_NUMBER`, `CALLMEBOT_APIKEY`
4. Deploy.

## 3. Database jodna (Upstash Redis, free)
1. Vercel project mein Storage tab (ya Marketplace) kholein, Create Database / Upstash, **Redis**, Free plan, region Singapore ke qareeb.
2. Isay is project se Connect karein (sab environments). Vercel khud `KV_REST_API_URL` aur `KV_REST_API_TOKEN` daal dega.
3. Deployments tab mein latest deployment par Redeploy karein, taake naye variables lag jayein.

## 4. Test
1. `https://PROJECT.vercel.app/api/catalog` kholein: products ki list (JSON) aani chahiye.
2. `https://PROJECT.vercel.app/admin` par admin + ADMIN_PASSWORD se login karein.
3. Website par ek test order dein; admin mein dikhna chahiye. `track.html` par order number + phone se tracking dekhein.
4. Admin mein product ki photo upload karke dekhein (photo khud chhoti ho jati hai).

## 5. Apna domain
1. Vercel project, Settings, Domains, Add: `apkadomain.com` aur `www.apkadomain.com`.
2. Vercel jo DNS records dikhaye (A / CNAME) wahi apne domain ke DNS panel mein daalein.
3. Agar pehle se koi purana Vercel project is domain par laga hai to usay wahan se Remove karein.
4. Alag admin domain (optional): Domains mein `admin.apkadomain.com` bhi add karein, aur vercel.json ke rewrites ke shuru mein ye add karein:
   `{ "source": "/", "has": [{ "type": "host", "value": "admin.apkadomain.com" }], "destination": "/api" }`
   Phir `/admin` wala page us domain ke root par khulega.

## Yaad rakhein
- Vercel Hobby (free) plan sirf personal/non-commercial use ke liye hai. Asal sales shuru karte waqt Pro plan chahiye.
- Admin password bhool gaye: Upstash console mein key `ep:admin` delete karein, agle login par `ADMIN_PASSWORD` se naya ban jayega.
- `catalog.json` sirf pehli dafa database mein jata hai. Baad ki tabdeeliyan admin panel se karein.
- Free Upstash database kuch din idle rahe to archive ho sakta hai. Is liye roz ek chhota keepalive cron (vercel.json mein) laga hai.
- Photos ka size 700 KB se chhota hona chahiye. Admin panel upload se pehle khud chhota kar deta hai.
