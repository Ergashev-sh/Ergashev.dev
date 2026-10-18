# ERGASHEV.DEV • Ghost Admin + Telegram Statistics (V3)

HTML/CSS/JS **premium portfolio**, yashirin **Ghost Admin**, GitHub orqali kontent boshqaruvi va **saqlab qolingan Telegram bot**. Xususan, `bot/main.py`, `bot/beta.py`, `bot/storage.py` eski imkoniyatlari o‘chirilmagan. Botga statistik hisobotlar qo‘shildi.

Sayt Netlify'da ishlaydi. **Rasmlar GitHub `assets/uploads/` da**, loyiha/blog/profil JSON fayllari GitHub'da. **Netlify Blobs** faqat ko‘rishlar statistikasi, maxfiy admin qoralamalari, login urinishlari va faoliyat tarixi uchun qo‘llanadi. Supabase kerak emas.

## 1) Yangi nimalar bor?

- **Ghost Admin:** pastki o‘ng tarafdagi `>_` ikonkasini **2.8 soniyada 5 marta bosish** yoki (input ichida bo‘lmaganida) `E R G A S H E V` ketma-ketligini yozish.
- **Haqiqiy login:** scrypt bilan xeshlangan parol, HttpOnly/Secure/SameSite sessiya (12 soat); login urinishlariga cheklov.
- **Dashboard:** bugun, oxirgi 7 kun, joriy oy va jami ko‘rishlar; taxminiy noyob brauzerlar; loyiha ochishlar; kunlar bo‘yicha mini grafik.
- **Loyihalar:** mavjud `data/projects.json` ma’lumotlarini tahrirlash va nashr qilish; qo‘shish / o‘chirish / yashirish; qoralama va preview.
- **Blog:** mavjud `data/blogs.json` bilan ishlaydi.
- **Profil / ranglar / SEO:** `data/profile.json`, `data/site-config.json`, `data/seo.json` ga saqlanadi. Premium ko‘k-qora / teal aksent dizayn; matnlar uchun Live Edit.
- **Media Manager:** JPG/PNG/WebP/GIF, 3 MB gacha, GitHub `assets/uploads/` ga.
- **Version History / Activity Log:** o‘zgarishlar tarixi, tanlangan JSON faylini eski GitHub commitidan tiklash.
- **Telegram statistikasi:** `/stats`, `/today`, `/week`, `/month` va menyudagi `📊 Statistika`.
- **Ixtiyoriy 23:55 Telegram digest:** Netlify Scheduled Function kunlik xabar yuboradi, yakshanba haftalik va oyning oxirida oylik yig‘indini qo‘shadi. Python bot kompyuterda ishlamasligi mumkin.

## 2) GitHub va Netlify'ga joylash

1. **Avval repository'ni backup/branch qil.** `Ergashev-sh/Ergashev.dev` ichidagi fayllarni **shu ZIP ichidagi fayllar bilan yangila**. `data/projects.json`, `data/blogs.json`, `data/profile.json`, eski botlar va rasmlar o‘zgartirilmagan (tekshirish uchun backup bor). ZIP ichidagi *papka tarkibi* repo ildizida bo‘lsin.
2. Netlify saytni GitHub repository'ga ulang: `Add new project → Import an existing project` yoki mavjud saytning Repository/Continuous deployment sozlamasi orqali. **Drag & drop** deploy kodni nashr qiladi, lekin GitHub o‘zgarishlariga avtomatik deploy ishlashi uchun repo ulanishi shart.
3. Netlify avtomatik sozlamalarni `netlify.toml` dan o‘qiydi:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`
4. Lokal kompyuterda maxfiy qiymatlarni yaratish uchun Node.js bor terminalda (repo ildizida):

   ```powershell
   node docs/generate-secrets.mjs
   ```

   Kamida 14 belgili kuchli admin parol tanla. **Parol terminalda ko‘rinishi mumkin; maxfiy kompyuterda bajargin.** Chiqqan qiymatlarni xavfsiz joyga saqla. `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, `STATS_READ_TOKEN`, `STATS_HASH_SECRET` hosil bo‘ladi.

5. Netlify → **Project configuration → Environment variables** ga quyidagilarni yoz:

   | Key | Qiymat |
   | --- | --- |
   | `ADMIN_PASSWORD_HASH` | Generator chiqargan hash |
   | `SESSION_SECRET` | Generator chiqargan uzun kalit |
   | `STATS_READ_TOKEN` | Generator chiqargan token (bot bilan bir xil) |
   | `STATS_HASH_SECRET` | Generator chiqargan kalit (bir marta qo‘yib saqla) |
   | `GITHUB_TOKEN` | Faqat shu repo uchun GitHub Fine-grained PAT, Contents: Read/Write |
   | `GITHUB_OWNER` | `Ergashev-sh` |
   | `GITHUB_REPO` | `Ergashev.dev` |
   | `GITHUB_BRANCH` | `main` (repository branchiga qarab) |

   `GITHUB_TOKEN` ni faqat Netlify maxfiy muhit sozlamasiga qo‘y, hech qachon GitHub, HTML yoki JS ichiga yozma. Generator chiqargan secretlarni ham repoga yuklama. Environment variable'lar yangilanganidan keyin Netlify'da yangi deploy qil.

6. **Production** `https://ergashevdev.netlify.app/` ni och. `>_` ikonkasini 5 marta bos → admin parolini kirit → Dashboard ochiladi. Funksiyalar Netlify'da deploy qilinganidan keyin ishlaydi. Oddiy `python -m http.server` ishlatilsa saytdagi dizayn ko‘rinadi, lekin Netlify Functions ishlamaydi va Ghost Admin login ochilmaydi.

7. Admin panel orqali kontent nashr qilganda Netlify GitHub commitni ko‘rib **avtomatik qayta deploy** qilishi uchun sayt aynan o‘sha GitHub repo va branchga ulangan bo‘lsin.

## 3) Telegram botni saqlash va statistika ulash

Eski bot fayllari saqlangan; u avvalgi GitHub admin imkoniyatlaridan ham foydalana oladi.

1. `.env.example` ni `.env` deb nusxala; `.env` **GitHub’ga yuklanmasin**.
2. `BOT_TOKEN` va `ADMIN_IDS` ni kiriting.
3. `STATS_API_URL` ni `https://ergashevdev.netlify.app/.netlify/functions/ghost-api` qilib qo‘ying. `STATS_READ_TOKEN` qiymati **Netlify'dagi `STATS_READ_TOKEN` bilan aynan bir xil** bo‘lsin.
4. Eski GitHub boshqaruv funksiyalari ham kerak bo‘lsa `GH_OWNER`, `GH_REPO`, `GH_TOKEN`, `GH_BRANCH` ni to‘ldiring. **Faqat statistika uchun ular shart emas.**
5. Windows terminalida:

   ```powershell
   python -m pip install -r bot/requirements.txt
   python bot/main.py
   ```

6. Telegram'da botga `/start`, keyin `/stats` yubor.

| Buyruq | Natija |
| --- | --- |
| `/stats` | Kun, hafta, oy, jami va loyiha ochishlar |
| `/today` | Bugungi ko‘rishlar va noyob brauzerlar |
| `/week` | Oxirgi 7 kun uchun |
| `/month` | Joriy kalendar oyi uchun |

**Python bot faqat ishlayotgan paytda buyruqlarga javob beradi.** Sayt statistikani esa bot o‘chiq bo‘lsa ham Netlify Blobs orqali yig‘ishni davom ettiradi.

### Ixtiyoriy avtomatik Telegram xabarlari

Python bot doimiy yoqilgan bo‘lishi shart emas. Netlify Scheduled Function `telegram-digest.mjs` har kuni **23:55 (Toshkent vaqti)** da xabar yubora oladi. Buni yoqish uchun Netlify Environment variables ichiga quyidagilarni qo‘sh:

- `TELEGRAM_REPORT_BOT_TOKEN` — mavjud Telegram botning tokeni (Netlify ichida maxfiy).
- `TELEGRAM_REPORT_CHAT_ID` — adminning raqamli Telegram chat ID'si. Botga avval `/start` yuborilgan bo‘lishi kerak.
- `STATS_READ_TOKEN` — avvaldan yuqorida sozlangan token.

Ular yo‘q bo‘lsa avtomatik xabar ishlamaydi. Netlify cron UTC bo‘yicha `18:55`ga sozlangan (Toshkent +5). Yakshanba kuni haftalik, oyning oxirgi kunida oylik xulosani qo‘shadi. **23:55–24:00 orasidagi kirishlar o‘sha xabarda bo‘lmasligi mumkin.** Xabarlar Netlify rejasining funksiyalar cheklovlariga bog‘liq.

## 4) Statistikani tushunish

- **Ko‘rishlar** — shu brauzer tabidagi bir sessiyada bitta pageview; boshqa tab yoki yangi sessiyada qayta hisoblanishi mumkin.
- **Noyob brauzerlar** — brauzer localStorage identifikatori bo‘yicha taxminiy. Bitta odamning boshqa qurilmasi yoki brauzer ma’lumotini tozalashi yangi odamdek sanaladi. Botlar/adblock/DNT sabab to‘liq aniqlik yo‘q.
- **Hafta** — hozirgi sanagacha oxirgi 7 kun; **oy** — joriy kalendar oyi; vaqt mintaqasi **Asia/Tashkent**.
- Statistikada brauzer IP manzili yoki login shaxsiy ma’lumotlari saqlanmaydi (admin login urinishini cheklash uchun serverda IP ning maxfiy xeshi alohida ishlatiladi).
- Tarix **yangi kod production'ga deploy qilinganidan boshlab** to‘planadi, oldingi tarix avtomatik paydo bo‘lmaydi.
- DNT (Do Not Track) yoki Global Privacy Control yoqilgan brauzerlar sanalmaydi.
- Bu yengil statistika tizimi kichik portfolio uchun mo‘ljallangan. `20 000` hodisalik server limiti oshsa hisobot `sampled` deb belgilanadi. Katta trafikda professional analitika/ma’lumotlar bazasi kerak.

## 5) Xavfsizlik

- `>_` ikonkasining 5 martaligi **xavfsizlik emas**, faqat terminalni yashirish. Haqiqiy ruxsat har bir o‘zgartirishda serverda tekshiriladi.
- Serverli endpointni GitHub tokenisiz nashr qilib bo‘lmaydi; Netlify env bo‘lmasa saytdagi `>_` login oynasi chiqadi, lekin admin kirishi sozlanmagan xatosi beradi.
- Barcha public GitHub fayllari va public kontent **ochiq**. Qoralamalar Netlify Blobs ichida, admin sessiyasi bilan o‘qiladi.
- Statistika API'sining o‘qish tokeni hech qachon ommaviy JS'ga joylanmaydi.
- Reponing ildizida `.env`, `node_modules` yoki `.netlify` commit qilma (`.gitignore` kiritilgan).
- `npm run build` **faqat statik fayllarni `dist/` ga nusxalaydi**; bot source va maxfiy config fayllari public saytga chiqmaydi.

## 6) Ishga tushirish sinovlari

```powershell
npm install
npm run build
npx netlify dev
```

`npm run build` muvaffaqiyatli bajarilgani Netlify API ham production'da sozlanganini anglatmaydi. Production tokenlarini faqat Netlify Environment variables qismida saqlashni unutmang. Bir vaqtning o‘zida Telegram bot va Ghost Admin bir xil faylni tahrirlasa GitHub conflict chiqishi mumkin; yana yuklab, qayta saqlang.

## 7) Fayllar xaritasi

```text
index.html                     asosiy sayt / yashirin terminal kirishi
css/styles.css                 asl premium dizayn
css/premium-v3.css             yangi teal/premium aksentlar
js/app.js                      asl sayt rendering va filtrlar
js/analytics.js                anonim ko‘rishlar
js/site-seo.js                 SEO brauzerda yangilanishi
netlify/functions/ghost-api.mjs     xavfsiz admin + GitHub + stats API
netlify/functions/telegram-digest.mjs   ixtiyoriy kunlik Telegram xabari
ghost/ghost.js, ghost/ghost.css     yashirin terminal va boshqaruv UI
bot/main.py, beta.py, storage.py  OLDINGI BOT — saqlangan
bot/site_statistics.py        bot uchun yangi stats API klient
data/projects.json            asl loyihalar
data/blogs.json               asl maqolalar
data/profile.json             asl profil
data/site-config.json         animatsiya va yangi ranglar
data/seo.json                 yangi SEO sozlamalari
scripts/build.mjs             Netlify uchun dist/ qurish
```

**Holat:** lokal sintaksis, Python va mock API tekshiruvlari bajarilgan; real GitHub tokenlari va Netlify production bilan sinash kerak. Hech bir GitHub commit avtomatik yuborilmagan va hozirgi live sayt o‘zgartirilmagan.
