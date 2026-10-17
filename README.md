# ERGASHEV.DEV ✳

**Dark Premium / 3D portfolio + Telegram admin bot + GitHub Pages**

Web-sayt to‘liq statik: **HTML + CSS + JavaScript + JSON**. Admin bot: **Python + aiogram 3**. Yopiq Telegram kanali arxiv vazifasini bajaradi. Alohida SQL ma'lumotlar bazasi, Supabase yoki doimiy ishlaydigan Python serveri kerak emas.

> **Muhim:** bot faqat tahrirlash vaqtida kompyuteringizda ishlaydi. O‘chirganingizda ham GitHub Pages sayti ishlayveradi. Yopiq Telegram kanalni browser to‘g‘ridan-to‘g‘ri o‘qimaydi; bot nashr paytida kontentni GitHub’dagi `data/*.json` va `assets/uploads/` ga ko‘chiradi.

## 1. Fayllar

```text
ergashev-dev/
├── index.html           # public premium portfolio
├── admin-preview.html   # FAQAT VIZUAL DEMO (real admin emas)
├── css/styles.css       # Dark Premium, mobil adaptiv, 3D kompozitsiya
├── js/app.js             # JSON o‘qish, loyiha filtri, modal, particles
├── data/
│   ├── projects.json    # loyihalar (demo yozuvlar bilan)
│   ├── blogs.json       # blog maqolalar (demo yozuvlar bilan)
│   └── profile.json     # bio, aloqa, GitHub manzil
├── assets/uploads/      # bot rasmlarni shu yerga joylaydi
├── bot/
│   ├── main.py          # Telegram admin panel (aiogram 3)
│   ├── storage.py       # GitHub API JSON/media saqlash
│   └── requirements.txt
├── .env.example         # tokenlarni qayerga yozish kerakligi namunasi
├── .gitignore           # .env maxfiyligini himoya qiladi
└── README.md
```

## 2. Saytni ko‘rish

- `index.html` ni brauzerda oching. Fayl sifatida ochilganda `fetch` ayrim brauzerlarda bloklanishi mumkin; shu sabab **o‘rnatilgan demo ma'lumotlari** avtomatik ko‘rsatiladi.
- `admin-preview.html` — admin dizaynini ko‘rish uchun demo. Undagi «loyiha qo‘shish» faqat sahifada ko‘rinadi, real saytni o‘zgartirmaydi.
- To‘liq lokal test uchun papkaning ichida `python -m http.server 8000` bajarib, `http://localhost:8000` ni oching.

## 3. GitHub Pages’ga joylash

1. GitHub’da **public** `ergashev-dev` nomli repository yarating.
2. Ushbu papkaning *ichidagi barcha fayllarni* repository ildiziga yuklang. `index.html` root’da bo‘lishi shart.
3. Repository → **Settings → Pages → Build and deployment → Deploy from a branch**.
4. Branch: **main**, folder: **/(root)** → **Save**.
5. Sayt: `https://ergashev-sh.github.io/ergashev-dev/` (`GH_OWNER` yoki repo nomi o‘zgarsa URL ham o‘zgaradi).
6. `data/projects.json`, `data/blogs.json` va `data/profile.json` bo‘yicha demo yozuvlar birinchi nashrda ko‘rinadi. Ularni bot orqali tahrirlang/o‘chiring.

**Sayt bepul tarif doirasida mustaqil ishlaydi.** Botning doimiy ishlab turishi talab qilinmaydi.

## 4. Telegram kanal

1. Telegram’da yopiq kanal yarating, masalan `Ergashev Dev | Archive`.
2. [@BotFather](https://t.me/BotFather) orqali yangi bot yarating.
3. Botni kanalga **administrator** qilib qo‘shing, xabar yozish ruxsatini bering.
4. Kanal ID’sini `.env` dagi `CHANNEL_ID` ga joylang (`-100...` ko‘rinishida). Kanal arxivi ixtiyoriy: hozircha `CHANNEL_ID` ni bo‘sh qoldirsangiz ham GitHub nashr qilish ishlaydi.

Telegram kanal: matn va fotosuratlarning arxivi. **Haqiqiy sayt kontenti GitHub’dagi JSON va ochiq rasmlardan olinadi.**

## 5. GitHub token yaratish

1. GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens**.
2. Token uchun faqat **`ergashev-dev`** repositorysini tanlang.
3. Repository permissions → **Contents: Read and write**.
4. Yaratilgan tokenni `.env` fayliga `GH_TOKEN` qilib yozing.
5. Tokenni hech qachon `.html`, `.js`, `data/*.json` fayllariga joylamang yoki git’ga yuklamang.

Bot shu token bilan GitHub repositorydagi JSON va rasmlarni yangilaydi.

## 6. Botni Windows’da ishga tushirish

Python 3.12 yoki 3.13 ishlatishingiz mumkin. Terminalni loyiha papkasida oching.

```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r bot/requirements.txt
```

`.env.example` faylidan `.env` nusxa oling, qiymatlarini o‘zgartiring:

```dotenv
BOT_TOKEN=BOTFATHER_TOKEN
ADMIN_IDS=SIZNING_RAQAMLI_TELEGRAM_ID
CHANNEL_ID=-1001234567890
GH_TOKEN=GITHUB_FINE_GRAINED_TOKEN
GH_OWNER=ergashev-sh
GH_REPO=ergashev-dev
GH_BRANCH=main
```

`ADMIN_IDS` — foydalanuvchi nomi emas, **raqamli Telegram ID**. Bir nechta admin bo‘lsa vergul bilan ajrating. ID’ni Telegram’dagi ID beruvchi botdan bilishingiz mumkin.

Botni ishga tushiring:

```powershell
python bot/main.py
```

Telegram’da botga `/start` yuboring. Admin bo‘lmasangiz bot kirishni rad etadi.

Ish tugagach terminalda **Ctrl + C** ni bosing. Sayt o‘chmaydi.

## 7. Admin bot funksiyalari

- **➕ Loyiha qo‘shish**: nom → kategoriya → qisqa tavsif → batafsil tavsif → texnologiyalar → demo URL → GitHub URL → foto.
- **📂 Loyihalar**: ro‘yxat → loyiha → maydonini tahrirlash yoki o‘chirish.
- **✍️ Maqola yozish**: sarlavha → izoh → maqola matni.
- **📚 Blog**: maqolani tahrirlash/o‘chirish.
- **👤 Profil**: hero matni, bio, aloqa va GitHub linkini yangilash.
- **/cancel**: tahrirlash jarayonini bekor qilish.

Qo‘shilgan kontent avval GitHub’ga yoziladi, keyin Telegram kanaliga arxiv xabari yuboriladi. GitHub Pages deployment tugagach yangilangan saytda ko‘rinadi. Agar tarmoq xatosi bo‘lsa bot xatoni ko‘rsatadi — avtomatik nashr muvaffaqiyatli bo‘ldi deb noto‘g‘ri xabar bermaydi.

## 8. Muhim xavfsizlik va cheklovlar

- **Public repo**: `data/*.json` va `assets/uploads/` **barchaga ochiq**. Bu yerga parollar, shaxsiy maxfiy ma'lumot yoki maxfiy fotosurat qo‘ymang. Yopiq kanalga saqlangan postlar bilan saytga chiqarilgan public fayllarni farqlang.
- `.env` faylini repo’ga yubormang. GitHub tokeni faqat lokal botda bo‘lsin.
- Telegram bot **kompyuteringiz o‘chiq vaqtda** xabarlarni qabul qilmaydi. Saytdagi eski kontent ishlaydi, ammo yangi postlar o‘z-o‘zidan chiqmaydi. Qo‘shish va tahrirlash uchun botni qayta ishga tushiring.
- Kanalga qo‘lda yuborilgan postlar avtomatik ravishda saytga chiqmaydi. Kontentni **bot orqali nashr eting**.
- GitHub Pages’ning build/deploy jarayoni darhol tugamasligi mumkin, yangilik bir oz kechikib ko‘rinadi.
- `admin-preview.html` xavfsiz tizim o‘rnini bosmaydi. Haqiqiy admin **Telegram bot** bo‘lib qoladi. Agar keyinchalik veb-admin yaratilsa, maxfiy GitHub tokenini front-end JavaScript’ga qo‘yish mumkin emas — xavfsiz backend kerak bo‘ladi.
- GitHub va Telegram xizmatlarining bepul foydalanish qoidalari/limitlari o‘zgarishi mumkin.

## 9. Kelajakda qanday kengaytiramiz?

Keyinchalik Postgres/Supabase’ga o‘tsangiz, mavjud `projects.json`, `blogs.json`, `profile.json` ma’lumotlarini migratsiya qilish oson. Hozircha bu murakkablik kerak emas.

---

**Status:** dizayn va brauzerdagi interaktiv funksiyalar sinab ko‘rildi; Telegram va GitHub’ga haqiqiy ulanish foydalanuvchi tokenlari bilan alohida sozlanadi.
