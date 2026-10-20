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
//  DONAT TO'LOVLARI — faqat VISA karta (Octo ekvayringi orqali)
//  Karta raqami o'yinga kelmaydi: u Octo'ning himoyalangan sahifasida kiritiladi,
//  biz faqat kartaning kalitini (token) saqlaymiz va keyingi to'lovlarni shu bilan yechamiz.
//  ready: false bo'lsa, tugmalar "tez orada ulanadi" deydi.
// ============================================================
export const PAYMENT = { provider: 'octo', ready: false, shopId: '' };
