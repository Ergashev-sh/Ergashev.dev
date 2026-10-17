# ERGASHEV.DEV — ADMIN SYSTEM 2.0 BETA

Bu paket avvalgi ishlaydigan sayt va botni saqlab, Mini App, avatar, buyruqlar, dizayn va backup funksiyalarini qo‘shadi. **Bu beta; haqiqiy Telegram/GitHub hisoblaringiz bilan sinovdan o‘tkazish zarur.**

## 0. Avval zaxira oling

1. Kompyuterdagi eski `ergashev-dev` papkasini `ergashev-dev-1.0-backup` nomi bilan nusxalang.
2. GitHub repository'dagi joriy holatni saqlab qo‘ying (commit tarixi mavjud).
3. Eski `.env` faylni **faqat kompyuterda** saqlang. Bu ZIP ichida `.env` yo‘q.
4. Avval suhbatda ko‘rsatilgan Telegram tokeni oshkor bo‘lgan. BotFather’da uni **revoke** qilib, yangi token ishlating.

## 1. Fayllarni joylash

- ZIP’ni oching. `ergashev-dev/` ichidagi `index.html`, `admin/`, `bot/`, `css/`, `js/`, `data/` va boshqalarni GitHub’dagi **mavjud** `ergashev-sh/Ergashev.dev` repository’ga yuklang.
- **Muhim:** Hozir GitHub’dagi `data/projects.json`, `data/blogs.json`, `data/profile.json` fayllaringiz haqiqiy ma’lumotlarni saqlaydi. **ZIP ichidagi shu uchta namunaviy JSON fayl bilan ustidan yozmang!** Faqat `data/site-config.json` va `data/commands.json` yangilarini yuklang.
- ZIP ichidagi `bot/main.py`, `bot/beta.py`, `bot/storage.py` ni lokal kompyuterdagi `bot/` papkasiga qo‘ying.
- `.env` faylni lokal loyiha ildizida saqlang. GitHub’ga yuklamang.
- `admin/index.html` saytda `https://ergashev-sh.github.io/Ergashev.dev/admin/` manzilida ochilishi kerak.

## 2. .env (faqat lokal)

```
BOT_TOKEN=YANGI_BOT_TOKEN
ADMIN_IDS=TELEGRAM_ID
CHANNEL_ID=-100...
GH_TOKEN=GITHUB_FINE_GRAINED_TOKEN
GH_OWNER=ergashev-sh
GH_REPO=Ergashev.dev
GH_BRANCH=main
WEB_ADMIN_URL=https://ergashev-sh.github.io/Ergashev.dev/admin/
```

GitHub Fine-grained token: faqat shu repository, Contents: Read and write. Tokenni HTML/JS yoki `data/*.json` ichiga qo‘ymang.

## 3. Ishga tushirish (Windows PowerShell)

Terminal loyiha ildizida (`index.html` va `bot/` bor joyda):

```
python -m pip install -r bot/requirements.txt
python bot/main.py
```

Telegram botda `/start` → `🚀 Pro Max 2.0` → `🌐 Web Admin ochish`. Bot yuborgan **pastki klaviaturadagi** `🌐 Web Admin 2.0` tugmasini bosing. Aynan shu tugma Telegram `sendData` mexanizmini ishlatadi. Oddiy havola yoki Telegram menyusidagi `Open` tugmasi faqat ko‘rish rejimida qolishi mumkin.

## 4. Sinovlar

1. `/start` → `🚀 Pro Max 2.0` menyusi ochilsin.
2. `🔄 Tizim holati` orqali GitHub’ga ulanishni tekshiring.
3. `💾 Backup` ni bosing va yuborilgan ZIP faylni o‘zingizga saqlang.
4. Mini App’da sinov loyihasini qo‘shing. Telegram chatida `✅` xabarini kuting; keyin GitHub `data/projects.json` va saytni tekshiring.
5. Mini App’dan loyihani yashiring va qayta nashr qiling.
6. `👤 Avatar` orqali foto yuboring va sayt yangilanganini tekshiring.
7. `🎨 Dizayn` → Mini App’da mavzuni o‘zgartiring.
8. `/newcommand` bilan `salom | Assalomu alaykum!` yuboring; keyin `/salom` ni sinang.
9. `/delcommand salom` orqali o‘chiring.
10. Botni `Ctrl+C` bilan to‘xtating: sayt eski nashr qilingan ma’lumotlar bilan ishlashda davom etadi.

## 5. Backup / Restore

`💾 Backup` GitHub JSON fayllarini ZIP shaklida Telegram’ga yuboradi. Bu **media fayllarning zaxira nusxasi emas**. `/restore` buyrug‘i ZIP’ni so‘raydi va tiklashdan oldin tasdiqlaydi. Tiklash bir necha GitHub commit bilan bajariladi; tarmoq uzilsa qisman yakunlanishi mumkin.

## 6. Cheklovlar

- Bot kompyuteringizda ishlayotganda tahrirlarni qabul qiladi. Bot o‘chirilsa sayt ochiq, lekin Mini App’dan saqlash ishlamaydi.
- Telegram Web App `sendData` bir yuborishda 4096 baytgacha; beta xavfsiz chegarasi 3900 bayt. Katta bloglarni eski Telegram bot oqimi orqali yuboring.
- Mini App o‘qish uchun ommaviy `data/*.json` ni yuklaydi; bu ma’lumotlar maxfiy emas. Admin huquqi botning Telegram user ID tekshiruvida nazorat qilinadi.
- Avatar rasmlari ommaviy `assets/uploads` ga joylanadi. Shaxsiy yoki maxfiy rasmlarni yuklamang.
- `data/commands.json` public repositoryda; maxfiy matnlar yoki tokenlarni buyruq javoblariga yozmang.
- Telegram kanali media va postlar arxivi uchun qoladi; GitHub JSON va rasmlar saytning ishlashiga asos bo‘ladi.
- O‘zgarishlar GitHub Pages’da ko‘rinishi bir oz vaqt olishi mumkin.
- Katta kontent, professional audit log, multi-admin permission, serverli real-time panel bu beta tarkibiga kirmaydi.

## 7. Xavfsizlik

- `.env` fayli va haqiqiy tokenlarni **hech qachon** GitHub’ga yoki chatga yubormang.
- Bot faqat `ADMIN_IDS` ro‘yxatidagi Telegram ID uchun yozish huquqini beradi.
- Muhim o‘chirishlardan oldin `💾 Backup` oling.
