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
- Valyuta (sir, oltin, olmos) hozircha o'yinchining o'z qurilmasi/akkauntida saqlanadi. Haqiqiy pulga olmos sotmoqchi bo'lsangiz, to'lov tizimi (masalan Payme, Click, Stripe) va server tomonida tekshiruv (Firebase Cloud Functions) qo'shish kerak — aks holda tajribali odam valyutani o'zgartirib olishi mumkin.
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
- `functions/` — to'lov serveri (Payme va Click), `firebase.json` — Firebase sozlamasi

## Donat: karta orqali to'lov (Payme / Click)

To'lov shunday ishlaydi:

1. O'yinchi Donat bo'limida to'plamni bosadi. O'yin buyurtma (`orders`) yaratib, Payme yoki Click sahifasini ochadi.
2. O'yinchi u yerda kartasini (Uzcard, Humo, Visa) kiritib to'laydi.
3. Payme yoki Click bizning serverga (`functions/`) xabar beradi. Server summani tekshiradi va o'yinchiga olmos yoki oltinni "sovg'a" qilib yuboradi.
4. O'yin uni darhol oladi: "💳 To'lov qabul qilindi". Bitta to'lov ikki marta tushmaydi.

Narxlar so'mda `js/catalog.js` (DONATE) va `functions/packs.js` da yozilgan. Ikkalasi bir xil bo'lishi shart.

### 1-qadam: Firebase'da Blaze tarifini yoqish

Server (Cloud Functions) faqat Blaze tarifida ishlaydi. Har oy katta bepul limit bor, kichik o'yin uchun odatda bir necha sent chiqadi.
Firebase Console → chap pastda **Upgrade** → **Blaze** → karta qo'shish. Xavfsizlik uchun byudjet ogohlantirishini (masalan, $5) qo'ying.

### 2-qadam: serverni joylash (bir marta)

Kompyuterda (Node.js o'rnatilgan) loyiha papkasida:

```
npm install -g firebase-tools
firebase login
cd functions && npm install && cd ..
firebase functions:secrets:set PAYME_KEY
firebase functions:secrets:set CLICK_SECRET
firebase deploy --only functions
```

- `PAYME_KEY` — Payme kabinetidagi kalit (sinov uchun avval test kaliti).
- `CLICK_SECRET` — Click kabinetidagi SECRET_KEY.
- Faqat bitta tizimni ulasangiz, faqat o'shaning kalitini kiriting va faqat o'shani joylang: `firebase deploy --only functions:payme` yoki `functions:click`.

Joylangach, quyidagi manzillar chiqadi:

- Payme: `https://europe-west1-tom-and-jerry-katta-uy.cloudfunctions.net/payme`
- Click: `https://europe-west1-tom-and-jerry-katta-uy.cloudfunctions.net/click`

### 3-qadam: Payme Business kabineti (business.payme.uz)

- Kassa yarating. Turi: "Internet-do'kon / Merchant API".
- **Endpoint URL**: yuqoridagi `.../payme` manzili.
- **Hisob (account) maydoni**: `order_id`.
- Kassa **ID** sini `js/config.js` → `PAYMENT.payme.merchantId` ga yozing.
- Sinov paytida `test: true` qiling va test.paycom.uz da sinov tranzaksiyalarini o'tkazing. Hammasi yashil bo'lgach, asosiy kalitni `PAYME_KEY` ga qo'yib, `test: false` qiling.

### 4-qadam: Click Merchant kabineti (merchant.click.uz)

- Servis sozlamalari:
  - **Prepare URL** va **Complete URL**: ikkalasiga ham `.../click` manzili.
  - `service_id` va `merchant_id` ni `js/config.js` → `PAYMENT.click` ga yozing.
- Ixtiyoriy: `functions/.env` fayliga `CLICK_SERVICE_ID=...` yozsangiz, server boshqa servis so'rovlarini rad etadi.

### Sinov

```
cd functions && node test.js
```

Bu buyruq to'lov mantig'ini xotirada sinaydi: summa xatosi, takror so'rov, bekor qilish va 12 soatlik muddat.
