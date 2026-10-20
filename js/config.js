// ============================================================
//  FIREBASE SOZLAMALARI (Google orqali ro'yxatdan o'tish va do'stlar uchun)
//  Loyiha: tom-and-jerry-katta-uy (Firebase Console)
//  Bu kalit maxfiy emas — ma'lumotlarni firestore.rules qoidalari himoya qiladi.
//  null qilib qo'ysangiz, o'yin "offline sinov rejimi"da ishlaydi.
// ============================================================
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyB1gMICaR4ECWV1v3IeGFiubCXh1DBNKy4",
  authDomain: "tom-and-jerry-katta-uy.firebaseapp.com",
  projectId: "tom-and-jerry-katta-uy",
  storageBucket: "tom-and-jerry-katta-uy.firebasestorage.app",
  messagingSenderId: "832246208606",
  appId: "1:832246208606:web:4a6a81a211fd007588fccf",
  // Onlayn o'yin (do'st bilan) uchun Realtime Database
  databaseURL: "https://tom-and-jerry-katta-uy-default-rtdb.europe-west1.firebasedatabase.app",
};

// ============================================================
//  DONAT TO'LOVLARI (Uzcard / Humo / Visa karta — Payme va Click orqali)
//  Kabinetdan olingan ID'larni shu yerga yozing (bular maxfiy emas).
//  Maxfiy kalitlar (PAYME_KEY, CLICK_SECRET) faqat serverda — O'QING.md ga qarang.
//  Bo'sh qolsa, donat tugmasi "to'lov ulanmagan" deydi.
// ============================================================
export const PAYMENT = {
  payme: { merchantId: '', test: false },   // Payme Business -> Kassa -> ID (test: true = sinov kassasi)
  click: { serviceId: '', merchantId: '' }, // Click Merchant -> Servis -> service_id va merchant_id
};
