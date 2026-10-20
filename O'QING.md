# Tom and Jerry: Katta Uy

## O'yinni ishga tushirish
1. Kompyuterda **Python** o'rnatilgan bo'lishi kerak (https://www.python.org/downloads/).
2. Papkadagi **`start.bat`** faylini ikki marta bosing — brauzerda o'yin ochiladi (`http://localhost:8765`).
3. Internet kerak: 3D kutubxona (three.js) va shrift internetdan yuklanadi.

> `index.html` ni to'g'ridan-to'g'ri ikki marta bosib ochib bo'lmaydi — brauzer xavfsizlik sababli modullarni bloklaydi. Har doim `start.bat` orqali oching.

## Boshqaruv
| Tugma | Vazifa |
|---|---|
| Sichqoncha | Qarash (ekranni bir marta bosing) |
| W A S D | Yurish |
| Shift | Yugurish (chidamlilik tugaydi) |
| Space | Sakrash |
| **C** | Eng yaqin yashirinish joyini ko'rsatish → yetib borganda avtomatik yashirinish. Yana C — chiqish |
| 1–7 | Buyumlar |
| V | 1-shaxs / 3-shaxs ko'rinish |
| M | Katta xarita |
| Chap tugma yoki Q | Tom: sakrab tashlanish |
| Esc | Pauza |

## Google orqali ro'yxatdan o'tish va do'stlar (Firebase)
Hozir o'yin **offline sinov rejimida** ishlaydi: akkauntlar va do'stlar faqat shu brauzerda saqlanadi.
Haqiqiy onlayn akkauntlar (Google bilan kirish, ID orqali do'stlik) uchun bepul Firebase loyihasi kerak:

1. https://console.firebase.google.com ga kiring → **Add project** (masalan `tom-and-jerry`).
2. **Build → Authentication → Get started → Sign-in method → Google** ni yoqing.
3. **Build → Firestore Database → Create database** (Production mode).
4. Firestore → **Rules** bo'limiga `firestore.rules` faylidagi matnni qo'ying va **Publish** bosing.
5. Loyiha sozlamalari (⚙ → Project settings) → **Your apps → Web (</>)** → ilova qo'shing.
   Chiqqan `firebaseConfig` qiymatlarini `js/config.js` fayliga yozing:
   ```js
   export const FIREBASE_CONFIG = {
     apiKey: "...",
     authDomain: "....firebaseapp.com",
     projectId: "...",
     appId: "...",
   };
   ```
6. `start.bat` ni qayta ishga tushiring — "Google bilan kirish" tugmasi ishlaydi.

Boshqa odamlar ham o'ynashi uchun o'yinni internetga joylash kerak (masalan **Firebase Hosting**: `npm install -g firebase-tools`, `firebase init hosting`, `firebase deploy`). Joylangan domenni Authentication → Settings → **Authorized domains** ga qo'shing.

## Muhim eslatmalar
- Valyuta (sir, oltin, olmos) hozircha o'yinchining o'z qurilmasi/akkauntida saqlanadi. Haqiqiy pulga olmos sotmoqchi bo'lsangiz, Visa to'lov tizimi (Octo) va server tomonida tekshiruv (Firebase Cloud Functions) qo'shish kerak — aks holda tajribali odam valyutani o'zgartirib olishi mumkin.
- "Tom and Jerry" nomi va personajlari Warner Bros. kompaniyasiga tegishli. Shaxsiy o'yin sifatida muammo yo'q, lekin o'yinni sotish yoki pul ishlash uchun litsenziya kerak yoki nom/personajlarni o'zgartirish kerak.
- Grafika juda og'ir bo'lsa: Sozlamalar → Grafika sifati → "Past". "Avtomatik ruxsat" yoqilgan bo'lsa, o'yin FPS ga qarab o'zi moslashadi.

## Fayllar
- `index.html`, `css/style.css` — interfeys
- `js/catalog.js` — narxlar, skinlar, buyumlar, musiqa, ikonkalar, nik ranglari (narxlarni shu yerda o'zgartirasiz)
- `js/house.js`, `js/rooms.js`, `js/furniture.js` — uy, xonalar, mebel, yashirinish joylari
- `js/models.js` — Tom va Jerry modellari va skinlari
- `js/ai.js` — Tom va Jerryning sun'iy intellekti
- `js/match.js` — o'yin qoidalari va boshqaruv
- `js/backend.js`, `js/config.js` — akkaunt va do'stlar
- `functions/` — to'lov serveri (Visa / Octo), `firebase.json` — Firebase sozlamasi

## Donat: faqat VISA karta (Octo)

O'yinchi uchun qanday ishlaydi:

1. Do'kon → **Donat**. Karta qo'shilmagan bo'lsa, o'yinchi **"+ Visa karta qo'shish"** ni bosadi.
2. Karta raqami bankning himoyalangan sahifasida kiritiladi, o'yinga kelmaydi. Karta tasdiqlansa, o'yinda **Visa •••• 1234** ko'rinadi.
3. Keyin har bir donat bir bosishda bo'ladi. Pul yechilib, hisobga tushgach, server olmos yoki oltinni yuboradi va o'yin uni darhol oladi.

Narxlar `js/catalog.js` (DONATE) va `functions/packs.js` da yozilgan. Ikkalasi bir xil bo'lishi shart.

### Ulash uchun kerak

1. **Octo bilan shartnoma**: octobank.uz → E-commerce, YaTT nomidan. Shartnomadan keyin ular quyidagilarni beradi:
   - `shop_id`;
   - maxfiy kalit;
   - API hujjatlari (karta tokenizatsiyasi, yechish, webhook).
2. **Firebase Blaze tarifi**: server (Cloud Functions) shusiz ishlamaydi. Byudjet ogohlantirishini qo'ying, masalan $5.
3. Shu ikkalasi tayyor bo'lgach, `functions/index.js` ga Octo ulanadi va `js/config.js` da `PAYMENT.ready = true` qilinadi.

Maxfiy kalit hech qachon o'yin fayllariga yozilmaydi. U faqat serverga quyidagi buyruq bilan kiritiladi:

```
firebase functions:secrets:set OCTO_SECRET
```
