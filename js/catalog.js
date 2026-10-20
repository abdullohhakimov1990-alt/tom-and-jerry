// Do'kon katalogi: valyuta kurslari, skinlar (to'plamlar), buyumlar, musiqa, ikonkalar, nik ranglari.

export const RATE = { SIR_PER_GOLD: 20, GOLD_PER_DIAMOND: 40 };
export const CHAR_PRICE = { tom: 3, jerry: 2 };          // personaj almashtirish narxi (oltin)
export const START_WALLET = { sir: 200, gold: 5, diamond: 0 };
export const CUR_NAME = { sir: 'Sir', gold: 'Oltin', diamond: 'Olmos' };
export const NICK_MIN = 3, NICK_MAX = 15;
// Super Admin (Google pochtasi): hamma narsa ochiq, olmos/oltin kamaymaydi, boshqalarni admin qila oladi.
// Adminlar ro'yxati Firestore'da (admins) saqlanadi — ularni faqat Super Admin qo'shadi/o'chiradi.
export const SUPER_ADMINS = ['abdullohhakimov1990@gmail.com'];
export const ADMIN_WALLET = { gold: 1000, diamond: 100 };
export const GIFT_MAX = 100000;

// ---------------- DONAT (haqiqiy pulga) ----------------
// Kurs: 30 olmos = 1$, 200 oltin = 0.30$ (uzs — so'mdagi qiymati).
// Narxni o'zgartirsangiz, functions/packs.js da ham xuddi shunday o'zgartiring!
export const DONATE = [
  { id: 'd30', cur: 'diamond', n: 30, usd: 1, uzs: 12900 },
  { id: 'd90', cur: 'diamond', n: 90, usd: 3, uzs: 38000 },
  { id: 'd150', cur: 'diamond', n: 150, usd: 5, uzs: 63000 },
  { id: 'd300', cur: 'diamond', n: 300, usd: 10, uzs: 125000, tag: 'Mashhur' },
  { id: 'g200', cur: 'gold', n: 200, usd: 0.30, uzs: 3900 },
  { id: 'g1000', cur: 'gold', n: 1000, usd: 1.50, uzs: 19000 },
  { id: 'g4000', cur: 'gold', n: 4000, usd: 6, uzs: 76000, tag: 'Foydali' },
];

// ---------------- SKIN TO'PLAMLARI ----------------
// Har bir to'plamda Tom va Jerry uchun bir xil mavzudagi skin bor.
// mode: fur | metal | gold | crystal | ice | neon | lava | galaxy
// acc: aksessuarlar ro'yxati (models.js da quriladi)
export const SETS = [
  { id: 'classic', name: 'Klassik', rar: 'common', free: true,
    jerry: {}, tom: {} },

  // ---- oltin (5 ta) ----
  { id: 'ninja', name: 'Ninja', rar: 'rare', cur: 'gold', price: { jerry: 50, tom: 56 },
    jerry: { fur: '#3a3a46', fur2: '#25252e', belly: '#c8803f', acc: [{ t: 'band', c: '#d32f2f' }, { t: 'scarf', c: '#d32f2f' }] },
    tom: { fur: '#2d333f', fur2: '#1d2129', belly: '#8090ad', acc: [{ t: 'band', c: '#1e88e5' }, { t: 'scarf', c: '#1e88e5' }, { t: 'sword', c: '#cfd8dc' }] } },
  { id: 'pirat', name: 'Pirat', rar: 'rare', cur: 'gold', price: { jerry: 62, tom: 68 },
    jerry: { acc: [{ t: 'pirateHat' }, { t: 'eyepatch' }, { t: 'scarf', c: '#c62828' }] },
    tom: { fur: '#6f7f9c', acc: [{ t: 'pirateHat' }, { t: 'eyepatch' }, { t: 'sword', c: '#ffd54f' }] } },
  { id: 'oshpaz', name: 'Oshpaz', rar: 'rare', cur: 'gold', price: { jerry: 54, tom: 58 },
    jerry: { acc: [{ t: 'chefHat' }, { t: 'scarf', c: '#e53935' }] },
    tom: { acc: [{ t: 'chefHat' }, { t: 'scarf', c: '#e53935' }, { t: 'mustache' }] } },
  { id: 'futbol', name: 'Futbolchi', rar: 'rare', cur: 'gold', price: { jerry: 66, tom: 72 },
    jerry: { acc: [{ t: 'shirt', c: '#e53935', c2: '#ffffff', n: '10' }, { t: 'band', c: '#ffffff' }] },
    tom: { acc: [{ t: 'shirt', c: '#1565c0', c2: '#ffffff', n: '7' }, { t: 'band', c: '#1565c0' }] } },
  { id: 'qish', name: 'Qishki', rar: 'rare', cur: 'gold', price: { jerry: 76, tom: 80 },
    jerry: { acc: [{ t: 'beanie', c: '#26a69a', c2: '#ffffff' }, { t: 'scarf', c: '#ef5350' }, { t: 'aura', k: 'snow' }] },
    tom: { acc: [{ t: 'beanie', c: '#ef5350', c2: '#ffffff' }, { t: 'scarf', c: '#26a69a' }, { t: 'aura', k: 'snow' }] } },

  // ---- olmos (20 ta) ----
  { id: 'super', name: 'Superqahramon', rar: 'epic', cur: 'diamond', price: { jerry: 22, tom: 24 },
    jerry: { acc: [{ t: 'cape', c: '#d32f2f' }, { t: 'mask', c: '#d32f2f' }] },
    tom: { fur: '#5c6fa8', acc: [{ t: 'cape', c: '#1e3a8a' }, { t: 'mask', c: '#1e3a8a' }] } },
  { id: 'robot', name: 'Robot', rar: 'epic', cur: 'diamond', price: { jerry: 25, tom: 26 },
    jerry: { mode: 'metal', fur: '#b0bec5', fur2: '#78909c', belly: '#eceff1', glowEyes: '#00e5ff', acc: [{ t: 'antenna', c: '#00e5ff' }] },
    tom: { mode: 'metal', fur: '#8d9fb3', fur2: '#607080', belly: '#cfd8dc', glowEyes: '#ff1744', acc: [{ t: 'antenna', c: '#ff1744' }] } },
  { id: 'kosmos', name: 'Kosmonavt', rar: 'epic', cur: 'diamond', price: { jerry: 28, tom: 27 },
    jerry: { fur: '#eeeeee', fur2: '#cfcfcf', belly: '#ff7043', acc: [{ t: 'astro' }, { t: 'backpack', c: '#eeeeee' }] },
    tom: { fur: '#eceff1', fur2: '#cfd8dc', belly: '#42a5f5', acc: [{ t: 'astro' }, { t: 'backpack', c: '#eceff1' }] } },
  { id: 'vampir', name: 'Vampir', rar: 'epic', cur: 'diamond', price: { jerry: 18, tom: 20 },
    jerry: { fur: '#9e8fa8', fur2: '#7a6b85', belly: '#e8dff0', iris: '#d50000', acc: [{ t: 'cape', c: '#111111', c2: '#b71c1c', collar: true }, { t: 'fangs' }] },
    tom: { fur: '#6b6480', fur2: '#4a4560', belly: '#d9d3e6', iris: '#ff1744', acc: [{ t: 'cape', c: '#111111', c2: '#b71c1c', collar: true }, { t: 'fangs' }] } },
  { id: 'muz', name: 'Muz', rar: 'epic', cur: 'diamond', price: { jerry: 20, tom: 21 },
    jerry: { mode: 'ice', fur: '#9fd8f5', fur2: '#6fbfe8', belly: '#e6f7ff', acc: [{ t: 'icicles' }, { t: 'aura', k: 'snow' }] },
    tom: { mode: 'ice', fur: '#8ccdf0', fur2: '#5aaedc', belly: '#e6f7ff', acc: [{ t: 'icicles' }, { t: 'aura', k: 'snow' }] } },
  { id: 'olov', name: 'Olov', rar: 'epic', cur: 'diamond', price: { jerry: 24, tom: 25 },
    jerry: { fur: '#ff7043', fur2: '#e64a19', belly: '#ffca28', iris: '#ffeb3b', acc: [{ t: 'aura', k: 'fire' }] },
    tom: { fur: '#f4511e', fur2: '#bf360c', belly: '#ffd54f', iris: '#ffeb3b', acc: [{ t: 'aura', k: 'fire' }] } },
  { id: 'zombi', name: 'Zombi', rar: 'epic', cur: 'diamond', price: { jerry: 15, tom: 16 },
    jerry: { fur: '#8bc34a', fur2: '#5b8f2a', belly: '#d4e8b0', iris: '#c62828', acc: [{ t: 'bandage' }] },
    tom: { fur: '#7cb342', fur2: '#4f7f24', belly: '#cfe3a8', iris: '#c62828', acc: [{ t: 'bandage' }] } },
  { id: 'ritsar', name: 'Ritsar', rar: 'epic', cur: 'diamond', price: { jerry: 26, tom: 27 },
    jerry: { acc: [{ t: 'knight' }, { t: 'sword', c: '#e0e0e0' }] },
    tom: { acc: [{ t: 'knight' }, { t: 'sword', c: '#e0e0e0' }, { t: 'cape', c: '#8e0000' }] } },
  { id: 'kovboy', name: 'Kovboy', rar: 'epic', cur: 'diamond', price: { jerry: 16, tom: 17 },
    jerry: { acc: [{ t: 'cowboy', c: '#8d5524' }, { t: 'scarf', c: '#c62828' }] },
    tom: { acc: [{ t: 'cowboy', c: '#5d4037' }, { t: 'scarf', c: '#1565c0' }] } },
  { id: 'sehrgar', name: 'Sehrgar', rar: 'epic', cur: 'diamond', price: { jerry: 23, tom: 23 },
    jerry: { acc: [{ t: 'wizard', c: '#5e35b1' }, { t: 'wand' }, { t: 'aura', k: 'sparkle' }] },
    tom: { acc: [{ t: 'wizard', c: '#311b92' }, { t: 'wand' }, { t: 'cape', c: '#4527a0' }, { t: 'aura', k: 'sparkle' }] } },
  { id: 'shoh', name: 'Shohona', rar: 'legend', cur: 'diamond', price: { jerry: 30, tom: 30 },
    jerry: { acc: [{ t: 'crown' }, { t: 'cape', c: '#b71c1c', trim: true }, { t: 'aura', k: 'gold' }] },
    tom: { acc: [{ t: 'crown' }, { t: 'cape', c: '#6a1b9a', trim: true }, { t: 'aura', k: 'gold' }] } },
  { id: 'detektiv', name: 'Detektiv', rar: 'epic', cur: 'diamond', price: { jerry: 17, tom: 18 },
    jerry: { acc: [{ t: 'deerstalker', c: '#8d6e63' }, { t: 'scarf', c: '#6d4c41' }] },
    tom: { acc: [{ t: 'deerstalker', c: '#795548' }, { t: 'scarf', c: '#4e342e' }] } },
  { id: 'neon', name: 'Neon', rar: 'legend', cur: 'diamond', price: { jerry: 21, tom: 22 },
    jerry: { mode: 'neon', glow: '#00e5ff' }, tom: { mode: 'neon', glow: '#ff2bd6' } },
  { id: 'oltin', name: 'Oltin haykal', rar: 'legend', cur: 'diamond', price: { jerry: 30, tom: 29 },
    jerry: { mode: 'gold', acc: [{ t: 'aura', k: 'gold' }] }, tom: { mode: 'gold', acc: [{ t: 'aura', k: 'gold' }] } },
  { id: 'kristall', name: 'Kristall', rar: 'legend', cur: 'diamond', price: { jerry: 29, tom: 28 },
    jerry: { mode: 'crystal', fur: '#e1bee7', fur2: '#ce93d8', belly: '#f3e5f5', acc: [{ t: 'aura', k: 'sparkle' }] },
    tom: { mode: 'crystal', fur: '#b2ebf2', fur2: '#80deea', belly: '#e0f7fa', acc: [{ t: 'aura', k: 'sparkle' }] } },
  { id: 'dengiz', name: 'Dengiz', rar: 'epic', cur: 'diamond', price: { jerry: 15, tom: 19 },
    jerry: { fur: '#4fa3d8', fur2: '#2f7fb5', belly: '#d6f0ff', acc: [{ t: 'goggles' }, { t: 'aura', k: 'bubble' }] },
    tom: { fur: '#3d7fb5', fur2: '#285d8a', belly: '#d6f0ff', acc: [{ t: 'goggles' }, { t: 'aura', k: 'bubble' }] } },
  { id: 'sakura', name: 'Sakura', rar: 'epic', cur: 'diamond', price: { jerry: 19, tom: 19 },
    jerry: { fur: '#f6a5c0', fur2: '#e57fa3', belly: '#fff0f5', acc: [{ t: 'flowers' }, { t: 'aura', k: 'petals' }] },
    tom: { fur: '#e8a0c8', fur2: '#c97aa8', belly: '#fff0f7', acc: [{ t: 'flowers' }, { t: 'aura', k: 'petals' }] } },
  { id: 'lava', name: 'Lava', rar: 'legend', cur: 'diamond', price: { jerry: 27, tom: 26 },
    jerry: { mode: 'lava', iris: '#ffab00', acc: [{ t: 'aura', k: 'fire' }] }, tom: { mode: 'lava', iris: '#ffab00', acc: [{ t: 'aura', k: 'fire' }] } },
  { id: 'galaktika', name: 'Galaktika', rar: 'legend', cur: 'diamond', price: { jerry: 30, tom: 30 },
    jerry: { mode: 'galaxy', iris: '#e1f5fe', acc: [{ t: 'aura', k: 'sparkle' }] }, tom: { mode: 'galaxy', iris: '#e1f5fe', acc: [{ t: 'aura', k: 'sparkle' }] } },
  { id: 'ajdar', name: 'Ajdar', rar: 'legend', cur: 'diamond', price: { jerry: 28, tom: 29 },
    jerry: { fur: '#43a047', fur2: '#2e7d32', belly: '#ffeb3b', iris: '#ff6f00', acc: [{ t: 'wings', c: '#1b5e20' }, { t: 'horns', c: '#fff3e0' }] },
    tom: { fur: '#2e7d32', fur2: '#1b5e20', belly: '#ffd54f', iris: '#ff3d00', acc: [{ t: 'wings', c: '#0d3d12' }, { t: 'horns', c: '#fff3e0' }] } },
];
export const setById = id => SETS.find(s => s.id === id) || SETS[0];

// ---------------- BUYUMLAR (o'yinda yashab qolish uchun) ----------------
export const ITEMS = [
  // Jerry
  { id: 'heart', for: 'jerry', name: "Qo'shimcha jon", desc: '+1 jon (maks. 5)', cur: 'gold', price: 6, pack: { n: 5, cur: 'diamond', price: 1 }, col: '#ff4d6d' },
  { id: 'shield', for: 'jerry', name: 'Qalqon', desc: 'Tom bir marta ushlasa ham qutulasan (25 s)', cur: 'gold', price: 4, pack: { n: 5, cur: 'diamond', price: 1 }, col: '#42a5f5' },
  { id: 'boots', for: 'jerry', name: 'Tez poyabzal', desc: '8 soniya 35% tezroq', cur: 'gold', price: 3, pack: { n: 10, cur: 'diamond', price: 1 }, col: '#ab47bc' },
  { id: 'spike', for: 'jerry', name: 'Spike hushtagi', desc: 'Spike kelib Tomni 8 s quvlaydi', cur: 'gold', price: 8, pack: { n: 5, cur: 'diamond', price: 2 }, col: '#8d6e63' },
  { id: 'banana', for: 'jerry', name: "Banan po'chog'i", desc: "Orqangga tashla — Tom sirpanib 3 s yiqiladi", cur: 'gold', price: 2, pack: { n: 10, cur: 'diamond', price: 1 }, col: '#fdd835' },
  { id: 'invis', for: 'jerry', name: "Ko'rinmaslik iksiri", desc: "6 soniya Tom seni ko'rmaydi", cur: 'gold', price: 5, pack: { n: 5, cur: 'diamond', price: 1 }, col: '#26c6da' },
  { id: 'magnet', for: 'jerry', name: 'Sir magniti', desc: '15 soniya sirlarni o\'ziga tortadi', cur: 'gold', price: 3, pack: { n: 10, cur: 'diamond', price: 1 }, col: '#ef5350' },
  // Tom
  { id: 'radar', for: 'tom', name: 'Radar', desc: "6 soniya Jerry xaritada ko'rinadi", cur: 'gold', price: 4, pack: { n: 5, cur: 'diamond', price: 1 }, col: '#66bb6a' },
  { id: 'trap', for: 'tom', name: "Sichqon tuzog'i", desc: "Qo'y — Jerry bossa 2.5 s qotib qoladi", cur: 'gold', price: 3, pack: { n: 10, cur: 'diamond', price: 1 }, col: '#bcaaa4' },
  { id: 'claws', for: 'tom', name: 'Tez panjalar', desc: '8 soniya 30% tezroq', cur: 'gold', price: 3, pack: { n: 10, cur: 'diamond', price: 1 }, col: '#ffa726' },
  { id: 'sniff', for: 'tom', name: 'Hidlov burni', desc: "Jerry yashiringan joyni ko'rsatadi", cur: 'gold', price: 5, pack: { n: 5, cur: 'diamond', price: 1 }, col: '#ec407a' },
];

// ---------------- MUSIQA ----------------
export const MUSIC = [
  { id: 'classic', name: 'Klassik quvish', free: true },
  { id: 'bit8', name: '8-bit sarguzasht', cur: 'gold', price: 5 },
  { id: 'jazz', name: 'Jazz mushuk', cur: 'gold', price: 6 },
  { id: 'horror', name: "Qo'rqinchli tun", cur: 'gold', price: 7 },
  { id: 'rock', name: 'Rok quvlov', cur: 'gold', price: 8 },
  { id: 'sharq', name: 'Sharq ohanglari', cur: 'gold', price: 10 },
  { id: 'lofi', name: 'Lo-fi tinchlik', cur: 'diamond', price: 2 },
  { id: 'electro', name: 'Elektron raqs', cur: 'diamond', price: 3 },
  { id: 'space', name: 'Kosmik sayohat', cur: 'diamond', price: 4 },
  { id: 'tango', name: 'Mushuk tangosi', cur: 'diamond', price: 5 },
  { id: 'epic', name: 'Epik orkestr', cur: 'diamond', price: 8 },
];

// ---------------- PROFIL IKONKALARI (3D da chiziladi) ----------------
export const ICONS = [
  { id: 'j_classic', name: 'Klassik Jerry', char: 'jerry', set: 'classic', bg: ['#ffb74d', '#e65100'], rar: 'common', free: true },
  { id: 't_classic', name: 'Klassik Tom', char: 'tom', set: 'classic', bg: ['#64b5f6', '#0d47a1'], rar: 'common', free: true },
  { id: 'j_ninja', name: 'Ninja Jerry', char: 'jerry', set: 'ninja', bg: ['#ef5350', '#311b1b'], rar: 'rare', cur: 'gold', price: 12 },
  { id: 't_pirat', name: 'Pirat Tom', char: 'tom', set: 'pirat', bg: ['#4dd0e1', '#004d60'], rar: 'rare', cur: 'gold', price: 15 },
  { id: 't_oshpaz', name: 'Oshpaz Tom', char: 'tom', set: 'oshpaz', bg: ['#fff59d', '#f57f17'], rar: 'rare', cur: 'gold', price: 18 },
  { id: 'j_qish', name: 'Qishki Jerry', char: 'jerry', set: 'qish', bg: ['#e1f5fe', '#4fc3f7'], rar: 'rare', cur: 'gold', price: 25 },
  { id: 'j_futbol', name: 'Futbolchi Jerry', char: 'jerry', set: 'futbol', bg: ['#a5d6a7', '#1b5e20'], rar: 'rare', cur: 'gold', price: 35 },
  { id: 'j_super', name: 'Super Jerry', char: 'jerry', set: 'super', bg: ['#ff8a80', '#b71c1c'], rar: 'epic', cur: 'diamond', price: 3 },
  { id: 't_vampir', name: 'Vampir Tom', char: 'tom', set: 'vampir', bg: ['#b39ddb', '#1a0033'], rar: 'epic', cur: 'diamond', price: 4 },
  { id: 'j_kosmos', name: 'Kosmonavt Jerry', char: 'jerry', set: 'kosmos', bg: ['#7986cb', '#0b0f3a'], rar: 'epic', cur: 'diamond', price: 5 },
  { id: 't_olov', name: 'Olov Tom', char: 'tom', set: 'olov', bg: ['#ffcc80', '#bf360c'], rar: 'epic', cur: 'diamond', price: 6 },
  { id: 'j_neon', name: 'Neon Jerry', char: 'jerry', set: 'neon', bg: ['#1de9b6', '#000814'], rar: 'legend', cur: 'diamond', price: 7 },
  { id: 'j_kristall', name: 'Kristall Jerry', char: 'jerry', set: 'kristall', bg: ['#f8bbd0', '#6a1b9a'], rar: 'legend', cur: 'diamond', price: 8 },
  { id: 't_ajdar', name: 'Ajdar Tom', char: 'tom', set: 'ajdar', bg: ['#c5e1a5', '#1b3d10'], rar: 'legend', cur: 'diamond', price: 9 },
  { id: 'j_galaktika', name: 'Galaktika Jerry', char: 'jerry', set: 'galaktika', bg: ['#b388ff', '#0a0020'], rar: 'legend', cur: 'diamond', price: 10 },
  { id: 't_oltin', name: 'Oltin Tom', char: 'tom', set: 'oltin', bg: ['#fff8e1', '#ff8f00'], rar: 'legend', cur: 'diamond', price: 11 },
  { id: 't_shoh', name: 'Shoh Tom', char: 'tom', set: 'shoh', bg: ['#ffd54f', '#4a148c'], rar: 'legend', cur: 'diamond', price: 12 },
];

// ---------------- NIK RANGLARI ----------------
export const COLORS = [
  { id: 'white', name: 'Oq', free: true },
  { id: 'red', name: 'Qizil', cur: 'gold', price: 5 },
  { id: 'green', name: 'Yashil', cur: 'gold', price: 5 },
  { id: 'blue', name: "Ko'k", cur: 'gold', price: 5 },
  { id: 'yellow', name: 'Sariq', cur: 'gold', price: 6 },
  { id: 'pink', name: 'Pushti', cur: 'gold', price: 8 },
  { id: 'sunset', name: 'Shafaq', cur: 'gold', price: 15 },
  { id: 'goldshine', name: 'Yaltiroq oltin', cur: 'gold', price: 30 },
  { id: 'toxic', name: 'Zahar', cur: 'diamond', price: 4 },
  { id: 'bloodnight', name: 'Qora-qizil', cur: 'diamond', price: 4 },
  { id: 'pearl', name: 'Marvarid (oq dur)', cur: 'diamond', price: 5 },
  { id: 'fire', name: 'Olov', cur: 'diamond', price: 6 },
  { id: 'ice', name: 'Muz', cur: 'diamond', price: 6 },
  { id: 'neon', name: 'Neon', cur: 'diamond', price: 7 },
  { id: 'rainbow', name: 'Kamalak', cur: 'diamond', price: 8 },
  { id: 'galaxy', name: "Galaktika (ko'k-binafsha-qora)", cur: 'diamond', price: 10 },
  { id: 'royal', name: 'Shohona', cur: 'diamond', price: 12 },
];

export const RAR_NAME = { common: 'Oddiy', rare: 'Nodir', epic: 'Epik', legend: 'Afsonaviy' };
