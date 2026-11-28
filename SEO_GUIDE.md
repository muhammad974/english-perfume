# SEO guide: English Perfume

## Is code ne kya kiya (automatic)
- Har page ka alag title aur description, canonical link, Facebook/WhatsApp/Twitter share preview (images/og-*.jpg).
- Har product ka apna saaf address: `/dior-sauvage-edp-for-men-100ml-p11`. Is mein product ka naam, price, brand, photos, delivery aur breadcrumb ka structured data (Google ko price aur stock samajhne ke liye) khud lagta hai.
- `/sitemap.xml` (sab pages, sab products aur unki photos; naya product admin se add karte hi khud aa jata hai) aur `/robots.txt`.
- Home page par FAQ (6 sawal, structured data ke saath) aur category pages par chhota intro text.
- Checkout, track aur admin pages search se bahar (noindex).
- Galat ya purane product address par 301 redirect, aur gayab product par 404.

## Aap ko ye karna hai

### 1. Vercel mein `SITE_URL` daalein (zaroori)
Settings, Environment Variables, Add New:
- Name: `SITE_URL`
- Value: aapki website ka poora address, jaise `https://englishperfume.store` (https ke saath, aakhir mein / nahi)
- Production tick karein, Save, phir Redeploy.

### 2. Check karein (Redeploy ke baad)
- `https://AAPKADOMAIN/robots.txt`: Sitemap ki line mein aapka domain hona chahiye.
- `https://AAPKADOMAIN/sitemap.xml`: pages aur products ki list.
- Kisi product ka page kholein, right click, View page source: `<title>`, `canonical` aur `application/ld+json` nazar aane chahiye.

### 3. Domain theek karein
- Vercel, Domains mein `www` ko main domain par Redirect karein (ya ulta), taake ek hi address chale.
- `*.vercel.app` wala address kisi ko na dein, sirf apna domain share karein.

### 4. Google Search Console (free, sabse zaroori)
1. search.google.com/search-console par jayein, Add property.
2. Domain ya URL-prefix chunein aur verify karein (Domain wale mein DNS TXT record lagta hai).
3. Sitemaps mein `sitemap.xml` submit karein.
4. URL Inspection mein home page aur 2-3 products daal kar "Request indexing" dabayein.
5. Bing Webmaster Tools (bing.com/webmasters) mein Search Console se import kar lein.

### 5. Content (ranking ke liye sabse zyada asar)
- Admin mein har product ke **About this product** mein 60-100 alfaaz ki apni likhi hui description likhein (notes, kis mausam/mauqe ke liye, kitni der tiktey hai). Dusron se copy na karein.
- **Brand** field zaroor bharein.
- Har product ki kam az kam 3-4 photos upload karein.
- Footer ke Instagram/Facebook/TikTok icons abhi `#` par hain. Asli profile ke links lagwa dein aur un profiles par website ka link daalein.
- Customers se reviews lein, doosre sites/social par apni website ka zikr karwayein (backlinks).
- Facebook/Instagram/TikTok par product pages ke links share karein. Ab share preview sahi dikhega.

### 6. Aage ke options
- Google Merchant Center (free product listings): products Google Shopping mein aa sakte hain.
- Google Business Profile: agar aapka asli address/service area hai.
- Blog ya buying guides (jaise "best perfumes for Malaysian weather") lambe arse mein traffic laate hain.

## Sach batata hoon
Ranking koi guarantee nahi hoti. Naye domain ko Google mein jagah banane mein hafte se mahine lagte hain, aur "perfume Malaysia" jaisi cheezon par bade muqable hain. Ye code technical buniyad pakki karta hai; asal farq content, reviews aur backlinks se parta hai.

## Maloom hadood
- Products ki list pehle se JS se bharti hai (Google JS chala leta hai, magar HTML mein seedha nahi hoti). Sitemap ki wajah se products phir bhi dhoondhe jate hain.
- Purane products (1-10) ki gallery ki extra photos (jaise 1-2.jpg) maujood nahi, is liye browser mein 404 aata hai. Admin se in products ko Edit karke asli photos upload kar dein.
