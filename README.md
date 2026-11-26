# English Perfume: website + backend + admin (all connected)

One folder runs everything: the shop, the order system, the admin panel and the WhatsApp alert.

## How it all connects
```
Customer ──> public/*.html (the website)
   │            │  reads products, prices, delivery fee from  GET /api/catalog      (js/ep-catalog.js)
   │            └─ Checkout page  ──POST /api/orders──>  server.js
   │                                                       ├─ prices are re-calculated on the server (never trusted from the browser)
   │                                                       ├─ saves the order in data/orders.json
   │                                                       ├─ sends a WhatsApp message to you   (whatsapp-notify.js)
   │                                                       └─ sends a Telegram message (optional)
   └─ sees "Thank you" with the real order number (EP-1001, EP-1002 ...)

You ──> /admin ──> sees every order, changes status, edits products/prices/photos
                   (anything you change shows on the website immediately)
```

## Run it on your computer (Windows)
1. Install **Node.js (LTS)** from https://nodejs.org (one time).
2. Double-click **start.bat**. The first time, the black window asks you to **choose an admin password** (or press Enter for a random one). **Write it down.**
3. Website: http://localhost:3000     Admin: http://localhost:3000/admin
   Always open the site through `http://localhost:3000` (not by double-clicking the HTML files), otherwise checkout cannot reach the server.

## Pages (all in `public/`)
index, shop, men, women, bestsellers, product, **checkout**, shipping-policy, customer-support, **policies** (returns, privacy, terms).
Favicon files and `site.webmanifest` are in `public/` as well.

## WhatsApp message on every new order
1. Copy `.env.example` to `.env`.
2. Easiest (free): open https://www.callmebot.com/blog/free-api-whatsapp-messages/ , activate your WhatsApp there and copy the API key.
3. In `.env` set:
   `WA_OWNER_NUMBER=60177468939`  (digits only, country code, no +)
   `WA_PROVIDER=callmebot`
   `CALLMEBOT_APIKEY=the_key_you_got`
4. Restart the server. Place a test order: the message arrives on your WhatsApp. (Errors, if any, are printed in the black window and never stop an order.)
Official option instead: `WA_PROVIDER=cloud` with the Meta WhatsApp Business Cloud API (see `.env.example`).

## What you control from the admin panel
- **Orders:** search, status (new, confirmed, packed, shipped, delivered, cancelled), notes, CSV export.
- **Products:** add / edit / hide / delete, price, compare-at price, photos, stock. The website updates immediately.
- **Delivery fee and free-shipping limit:** `catalog.json` > `config` (now RM 8 and RM 150, the same numbers shown on the website).

## Put it online
You need hosting that can run Node.js (a small VPS, Render, Railway, or cPanel "Setup Node.js App").
1. Upload this whole folder (not `node_modules`), run `npm install`, then `npm start`.
2. In `.env` add `COOKIE_SECURE=1` and `TRUST_PROXY=1`. Use HTTPS (most hosts give it free).
3. Use a host with a **persistent disk**, and **back up the `data` folder** (orders and the admin login live there).
4. Forgot the admin password? Double-click **reset-admin-password.bat** (or run `npm run reset-admin`) and choose a new one. It works even while the server is running.

## Folder layout
- `server.js`, `whatsapp-notify.js`, `catalog.json`, `package.json`, `start.bat`: the backend
- `public/`: the website, `public/js/ep-catalog.js` (live products), `public/images/`
- `admin/`: the admin panel (open at /admin)
- `data/`: orders and admin login (back it up)

## Before you publish
- Add your real product photos to `public/images/products/` (or upload them in the admin panel).
- Add your real Facebook / Instagram / TikTok links (they still point to `#`).
- Check the return rules on the Policies page match how you really work, and have the Privacy and Terms text reviewed.
