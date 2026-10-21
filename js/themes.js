// Yangi xaritalar uchun xonalar: CHOYXONA (tapchan, samovar, qozon, tandir, so'ri) va BANK VA OMBOR
// (kassa, seyfxona, ofis, ombor javonlari). Yashirinish joylari: qozon, sandiq, temir shkaf, seyf, bochka, qop.
import * as THREE from 'three';
import * as FN from './furniture.js';
import * as TX from './textures.js';
import { M } from './builder.js';

// ---------------- yangi yashirinish joylari ----------------
const add = (g, geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
const dark = () => M.paint('#0c0703', 1);
FN.addHideType('qozon', { name: 'Katta qozon', r: 1.9 }, g => {
  const iron = M.metal('#2b2b2e', .55);
  add(g, new THREE.CylinderGeometry(1.7, 1.9, 1.0, 20), M.paint('#8d4b2a', .9), 0, .5, 0);           // g'isht o'choq
  add(g, new THREE.LatheGeometry([[0, .9], [1.0, .95], [1.75, 1.6], [1.95, 2.6], [1.85, 2.75], [0, 2.75]].map(p => new THREE.Vector2(p[0], p[1])), 28), iron, 0, 0, 0);
  add(g, new THREE.TorusGeometry(1.9, .09, 8, 28), iron, 0, 2.72, 0).rotation.x = Math.PI / 2;
  const lid = add(g, new THREE.CylinderGeometry(1.7, 1.75, .14, 24), M.wood('#6d4425', .6), .7, 2.95, -.4); lid.rotation.z = .35;
  add(g, new THREE.CircleGeometry(.75, 18, 0, Math.PI), dark(), 0, 1.1, 1.72);                       // o'choq og'zi
  for (let i = 0; i < 4; i++) add(g, new THREE.SphereGeometry(.18 + Math.random() * .1, 8, 6), M.em('#ff7a1a', 1.5), (i - 1.5) * .3, .95, 1.6);
});
FN.addHideType('sandiq', { name: 'Sandiq', r: 2.0 }, g => {
  const w = M.wood('#2e7d4f', .55), gold = M.metal('#d4af37', .3);
  add(g, new THREE.BoxGeometry(4, 2.3, 2.6), w, 0, 1.15, 0);
  const lid = add(g, new THREE.BoxGeometry(4.1, .45, 2.7), M.wood('#1f5c39', .55), 0, 2.55, -.45); lid.rotation.x = -.4;
  add(g, new THREE.BoxGeometry(3.6, .3, 2.2), dark(), 0, 2.2, 0);
  for (const s of [-1.5, 0, 1.5]) add(g, new THREE.BoxGeometry(.22, 2.32, 2.64), gold, s, 1.15, 0);
  for (let i = 0; i < 6; i++) add(g, new THREE.SphereGeometry(.13, 8, 6), M.em('#e53935', .6), -1.8 + i * .72, 1.7, 1.33);
});
FN.addHideType('shkaf', { name: 'Temir shkaf', r: 1.6, tall: true }, g => {
  const st = M.metal('#5f7d95', .35);
  add(g, new THREE.BoxGeometry(2.8, 6, .12), st, 0, 3, -1.25);
  for (const s of [-1, 1]) add(g, new THREE.BoxGeometry(.12, 6, 2.6), st, s * 1.34, 3, 0);
  add(g, new THREE.BoxGeometry(2.8, .12, 2.6), st, 0, 6, 0); add(g, new THREE.BoxGeometry(2.8, .12, 2.6), st, 0, .06, 0);
  add(g, new THREE.BoxGeometry(2.56, 5.8, 2.4), dark(), 0, 3, -.05);
  const door = add(g, new THREE.BoxGeometry(1.35, 5.8, .1), M.metal('#6f8fa8', .35), 1.9, 3, 1.55); door.rotation.y = -1.0;
  for (let i = 0; i < 4; i++) add(g, new THREE.BoxGeometry(.9, .08, .05), M.paint('#2c3e50'), -.6, 5 - i * .25, 1.32);
  add(g, new THREE.BoxGeometry(.1, .6, .1), M.metal('#cfd8dc', .2), .55, 3, 1.32);
});
FN.addHideType('seyf', { name: 'Seyf', r: 1.8 }, g => {
  const st = M.metal('#3d4650', .3), dk = M.metal('#262c33', .35);
  add(g, new THREE.BoxGeometry(3.2, 3.4, .25), st, 0, 1.7, -1.3);
  for (const s of [-1, 1]) add(g, new THREE.BoxGeometry(.25, 3.4, 2.8), st, s * 1.48, 1.7, 0);
  add(g, new THREE.BoxGeometry(3.2, .25, 2.8), st, 0, 3.3, 0); add(g, new THREE.BoxGeometry(3.2, .25, 2.8), st, 0, .12, 0);
  add(g, new THREE.BoxGeometry(2.8, 2.9, 2.5), dark(), 0, 1.7, -.05);
  const door = add(g, new THREE.BoxGeometry(2.9, 3.0, .35), dk, 2.2, 1.7, 1.9); door.rotation.y = -1.25;
  const dial = add(g, new THREE.CylinderGeometry(.45, .45, .15, 20), M.metal('#d4af37', .25), 2.55, 2.2, 2.35); dial.rotation.x = Math.PI / 2; dial.rotation.z = -1.25;
  for (let i = 0; i < 5; i++) add(g, new THREE.BoxGeometry(.9, .22, .45), M.em('#ffc400', .35), -.5 + (i % 2) * .4, .4 + Math.floor(i / 2) * .25, -.6 + (i % 3) * .3);
});
FN.addHideType('bochka', { name: 'Bochka', r: 1.5 }, g => {
  const w = M.wood('#8a5a33', .7), ir = M.metal('#4a4a4a', .5);
  add(g, new THREE.LatheGeometry([[0, 0], [1.3, 0], [1.55, 1.7], [1.3, 3.4], [0, 3.4]].map(p => new THREE.Vector2(p[0], p[1])), 22), w, 0, 0, 0);
  for (const y of [.5, 1.7, 2.9]) add(g, new THREE.TorusGeometry(y === 1.7 ? 1.56 : 1.42, .07, 6, 24), ir, 0, y, 0).rotation.x = Math.PI / 2;
  const lid = add(g, new THREE.CylinderGeometry(1.32, 1.32, .12, 20), M.wood('#7a4b28', .7), .8, 3.55, -.3); lid.rotation.z = .5;
  add(g, new THREE.CircleGeometry(.6, 16, 0, Math.PI), dark(), 0, .02, 1.48);
});
FN.addHideType('qop', { name: 'Qoplar uyumi', r: 1.9 }, g => {
  const cs = ['#d8c49a', '#c9b38a', '#bfa575'];
  for (let i = 0; i < 5; i++) { const s = add(g, new THREE.SphereGeometry(1.2, 14, 10), M.fab(cs[i % 3]), (i % 3 - 1) * 1.3, .9 + Math.floor(i / 3) * 1.3, (i % 2) * .5 - .7); s.scale.set(1.15, .85, .95); }
  add(g, new THREE.CircleGeometry(.7, 16, 0, Math.PI), dark(), 0, .05, 1.0);
});

// ---------------- mebellar ----------------
function tapchan(F, o = {}) {
  const w = o.w || 7, d = o.d || 5, h = 1.3, wood = M.wood('#7b4a24', .55), kur = M.velvet(o.c || '#b71c1c');
  F.box(w, h, d, wood, 0, 0, 0);
  for (const sx of [-1, 1]) F.box(.25, 1.4, d, wood, sx * (w / 2 - .12), h, 0);
  F.box(w, 1.4, .25, wood, 0, h, -d / 2 + .12);
  for (let i = -2; i <= 2; i++) F.box(.12, 1.2, .12, M.wood('#a86f3c', .5), i * (w / 5), h, -d / 2 + .12);
  F.rbox(w - .6, .35, d - .6, .15, M.velvet('#1a237e'), 0, h, 0);                                  // ko'rpacha
  for (const sx of [-1, 1]) F.rbox(1.1, .5, d - 1.2, .2, kur, sx * (w / 2 - .9), h + .35, 0);
  F.rbox(w - 2, .5, 1.1, .2, kur, 0, h + .35, -d / 2 + .9);
  // xontaxta: past stol, choynak, piyolalar, non
  F.box(2.6, .7, 1.8, M.wood('#5d3a1a', .5), 0, h + .35, .3);
  F.lathe([[0, 0], [.35, 0], [.45, .35], [.25, .6], [0, .6]], M.cer('#1565c0'), -.6, h + 1.05, .3, 14);
  for (let i = 0; i < 3; i++) F.lathe([[0, 0], [.14, 0], [.2, .2], [0, .2]], M.cer('#1e88e5'), .2 + i * .35, h + 1.05, .7, 10);
  F.cyl(.5, .5, .12, M.paint('#d39b4a', .8), .6, h + 1.05, -.1, 16);
  F.col(w, h + .35, d, 0, 0, 0); F.col(2.6, h + 1.05, 1.8, 0, 0, .3); F.top(-2, h + .35, .6); F.top(2, h + .35, .6);
}
function samovar(F) {
  const br = M.metal('#c9902e', .25);
  F.box(2.2, 2.2, 1.6, M.wood('#5d3a1a', .5), 0, 0, 0); F.col(2.2, 2.2, 1.6, 0, 0, 0);
  F.lathe([[0, 0], [.55, 0], [.45, .3], [.85, .6], [.95, 1.6], [.7, 2.1], [.25, 2.3], [.25, 2.9], [0, 2.9]], br, 0, 2.2, 0, 20);
  F.cyl(.06, .06, .5, br, .95, 2.9, 0, 8, { rz: Math.PI / 2 });
  F.lathe([[0, 0], [.3, 0], [.38, .3], [.2, .55], [0, .55]], M.cer('#e53935'), 0, 5.1, 0, 14);
  F.top(.7, 2.2, .4);
}
function tandir(F) {
  F.lathe([[0, 0], [1.8, 0], [1.9, 1.2], [1.5, 2.6], [.8, 3.1], [0, 3.1]], M.paint('#c8875a', .95), 0, 0, 0, 22);
  F.cyl(.75, .75, .2, M.paint('#1a0f08', 1), 0, 3.0, 0, 16);
  F.sph(.75, M.paint('#1a0f08', 1), 0, 1.8, 1.35, 1, 1, .2);
  F.col(3.6, 3.1, 3.6, 0, 0, 0);
}
function ochoq(F) {
  F.box(6, 1.8, 2.6, M.paint('#9c4f2f', .9), 0, 0, 0);
  for (const x of [-1.5, 1.5]) { F.lathe([[0, 0], [.6, .05], [1.1, .5], [1.2, 1.0], [0, 1.0]], M.metal('#2b2b2e', .55), x, 1.8, 0, 18); F.sph(.35, M.em('#ff6d00', 1.6), x, 1.5, 1.32, 1, .6, .3); }
  F.col(6, 2.8, 2.6, 0, 0, 0);
}
function sori(F) {
  const w = M.wood('#8d5a2b', .6);
  F.box(8, 1.6, 6, w, 0, 0, 0); F.col(8, 1.6, 6, 0, 0, 0); F.top(-2, 1.6, 0); F.top(2, 1.6, 1);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) F.cyl(.18, .18, 7, w, sx * 3.8, 0, sz * 2.8, 8);
  F.rbox(7.4, .35, 5.4, .15, M.velvet('#6a1b9a'), 0, 1.6, 0);
  for (let i = 0; i < 14; i++) F.sph(1.2, M.leaf(i % 2 ? '#558b2f' : '#689f38'), -3.6 + (i % 7) * 1.2, 7.2 + Math.sin(i) * .3, i < 7 ? -1.8 : 1.6, 1, .5, 1.3, { cast: false });
  for (let i = 0; i < 6; i++) F.sph(.28, M.leaf('#4a148c'), -3 + i * 1.2, 6.5, (i % 2) - .4, 1, 1.3, 1, { cast: false });
}
function anor(F) {
  F.cyl(.35, .5, 4, M.wood('#5d4037', .9), 0, 0, 0, 8); F.col(1, 4, 1, 0, 0, 0);
  for (let i = 0; i < 6; i++) F.sph(1.6, M.leaf(['#2e7d32', '#388e3c', '#43a047'][i % 3]), Math.sin(i * 1.1) * 1.3, 4.8 + (i % 2) * .8, Math.cos(i * 1.1) * 1.3, 1, .8, 1, { cast: false });
  for (let i = 0; i < 7; i++) F.sph(.25, M.paint('#c62828', .4), Math.sin(i * 2.1) * 1.8, 4.3 + (i % 3) * .5, Math.cos(i * 2.1) * 1.8, 1, 1, 1, { cast: false });
}
function ariq(F, len) { F.box(len, .05, 1.4, M.paint('#6d4c41', .9), 0, 0, 0, { cast: false }); F.box(len, .02, 1.0, M.tex('water', { map: null }, { color: '#4fc3f7', roughness: .05, metalness: .2 }), 0, .05, 0, { cast: false }); }
function kassa(F, n = 3) {
  const w = n * 4.4;
  F.box(w, 3.2, 2, M.wood('#4e342e', .45), 0, 0, 0); F.box(w + .2, .2, 2.3, M.marble('#d7ccc8'), 0, 3.2, 0);
  F.box(w, 3.6, .08, M.glass(), 0, 3.4, -.2, { cast: false });
  for (let i = 0; i < n; i++) { const x = -w / 2 + 2.2 + i * 4.4; F.box(1.4, .9, .1, M.em('#26c6da', .6), x, 3.6, -.6); }
  F.col(w, 3.4, 2, 0, 0, 0); F.top(-w / 2 + 1, 3.4, .5);
}
function atm(F) {
  F.box(2, 4.6, 1.6, M.metal('#37474f', .35), 0, 0, 0); F.box(1.3, .9, .05, M.em('#29b6f6', 1.2), 0, 3, .82); F.box(1.4, .35, .3, M.metal('#90a4ae', .3), 0, 2.2, .9);
  F.box(2, .5, 1.6, M.em('#43a047', .8), 0, 4.1, 0); F.col(2, 4.6, 1.6, 0, 0, 0);
}
function vaultDoor(F) {
  F.cyl(4.2, 4.2, .6, M.metal('#78909c', .25), 0, 5, 0, 32, { rx: Math.PI / 2 });
  F.cyl(3.4, 3.4, .7, M.metal('#90a4ae', .2), 0, 5, .1, 32, { rx: Math.PI / 2 });
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; F.box(.35, 2.6, .35, M.metal('#cfd8dc', .2), Math.cos(a) * 1.3, 5 - 1.3 + Math.sin(a) * 1.3, .5, { rz: a }); }
  F.cyl(.6, .6, .9, M.metal('#d4af37', .2), 0, 5, .3, 16, { rx: Math.PI / 2 });
}
function goldStack(F, o = {}) {
  const g = M.em('#ffc107', .25);
  F.box(3, 1, 2, M.wood('#5d4037', .8), 0, 0, 0);
  for (let l = 0; l < (o.n || 3); l++) for (let i = 0; i < 4 - l; i++) F.box(.6, .35, 1.4, g, -1 + i * .7 + l * .35, 1 + l * .35, 0);
  F.col(3, 2.1, 2, 0, 0, 0); F.top(0, 2.1, 0);
}
function stanchions(F, n = 4) {
  for (let i = 0; i < n; i++) { F.cyl(.12, .3, 3, M.metal('#d4af37', .2), i * 3, 0, 0, 10); F.col(.5, 3, .5, i * 3, 0, 0); if (i) F.box(3, .14, .14, M.velvet('#b71c1c'), i * 3 - 1.5, 2.5, 0); }
}
function rack(F, o = {}) {
  const st = M.metal('#ff8f00', .4), sh = M.metal('#90a4ae', .4), w = o.w || 8, d = 2.4, h = 7;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) F.box(.2, h, .2, st, sx * (w / 2 - .1), 0, sz * (d / 2 - .1));
  for (const y of [.3, 2.6, 4.9]) F.box(w, .15, d, sh, 0, y, 0);
  const r = (s => () => (s = (s * 9301 + 49297) % 233280) / 233280)(o.seed || 7);
  for (const y of [.45, 2.75, 5.05]) for (let i = 0; i < 3; i++) if (r() > .25) { const s = 1.3 + r() * .5; F.box(s * 1.2, s, s, M.paint(['#c49a6c', '#a87d50', '#8d6e63', '#bcaaa4'][Math.floor(r() * 4)], .9), -w / 2 + 1.4 + i * (w / 3), y, 0); }
  F.col(w, h, d, 0, 0, 0); F.top(0, 7.1, 0);
}
function pallet(F, o = {}) {
  F.box(4, .5, 3.4, M.wood('#b08455', .9), 0, 0, 0); F.col(4, .5, 3.4, 0, 0, 0);
  for (let i = 0; i < (o.n || 2); i++) FN.crate(F, { s: 1.6, y: .5 + i * 1.6 });
}
function bankSign(R, side, text) { R.painting(side, 13, 10.5, 8, 2.2, 21 + text.length); }

// ---------------- xona uslublari ----------------
export const THEME_STYLE = {
  tea_hall: { name: 'Choyxona zali', fl: () => TX.carpet('#8e1b1b', '#e0a33c', '#2a0e06'), su: 10, wall: ['#f3e2c0', '#e7cf9f', 'damask'], wains: '#6d4425', trim: '#4e2c14', lamp: '#ffcf8a', map: '#c9643a', curtain: '#7b1fa2' },
  tea_kitchen: { name: 'Oshxona (qozonlar)', fl: () => TX.stone('#cdb79a', '#a8916f'), su: 10, wall: ['#f1e7d6', '#e6d8bf', 'checks'], wains: null, trim: '#8d6e63', lamp: '#ffd9a0', map: '#d4a373' },
  tea_garden: { name: "Ichki hovli (so'ri)", fl: () => TX.stone('#d7c7a3', '#b5a27a'), su: 12, wall: ['#e8f3e0', '#d6ead0', 'floral'], wains: '#ffffff', trim: '#8d5a2b', lamp: '#fff2cc', map: '#8fbf5f' },
  tea_store: { name: 'Ombor (qoplar)', fl: () => TX.planks('#8a6a46', '#6e5236'), su: 6, wall: ['#e0d2b8', '#d2c2a4', 'stripes'], wains: null, trim: '#6d4c41', lamp: '#ffe2b0', map: '#b39469' },
  tea_vip: { name: 'Xos xona', fl: () => TX.carpet('#1a237e', '#d4af37', '#0d1240'), su: 10, wall: ['#e9dcf2', '#dccbea', 'damask'], wains: '#4a148c', trim: '#311b92', lamp: '#ffd6a8', map: '#9575cd', curtain: '#d4af37' },
  bank_hall: { name: 'Bank zali', fl: () => TX.tiles('#eeeeee', '#455a64', 4, true, '#cfd8dc'), su: 10, wall: ['#e3ecf2', '#d3e0ea', 'stripes'], wains: '#37474f', trim: '#263238', lamp: '#eef6ff', map: '#78a6c8' },
  bank_vault: { name: 'Seyfxona', fl: () => TX.concrete(), su: 8, wall: ['#b0bec5', '#a2b2ba', 'checks'], wains: null, trim: '#455a64', lamp: '#fff1c4', map: '#90a4ae' },
  bank_office: { name: 'Bank ofisi', fl: () => TX.parquet('#7a5634', '#5e3f24'), su: 8, wall: ['#dfe6d8', '#d0dac6', 'diamonds'], wains: '#3e2723', trim: '#2b1d10', lamp: '#ffe0b0', map: '#a5b88f' },
  bank_lounge: { name: 'Mijozlar zali', fl: () => TX.carpet('#00695c', '#80cbc4', '#004d40'), su: 12, wall: ['#e0f2f1', '#cdeae8', 'floral'], wains: '#ffffff', trim: '#00695c', lamp: '#fff4dc', map: '#4db6ac' },
  warehouse: { name: 'Katta ombor', fl: () => TX.concrete(), su: 8, wall: ['#cfc6b6', '#c2b8a6', 'checks'], wains: null, trim: '#ff8f00', lamp: '#fff6e0', map: '#a1887f' },
};

// ---------------- xonalarni jihozlash (x,z: 0..26) ----------------
// Eshiklar har devor o'rtasida (13 ± 3.3) — 4 m ichkarigacha bo'sh qoldiriladi. Buyumlar burchak va markazda.
// Menyu sahnasi bo'ladigan xonalarda (tea_hall, bank_lounge) janubiy-markaz (x 8..18, z 12..24) bo'sh.
const hide = (R, type, x, z, face) => FN.hide(R.f(x, z, 0), type, 0, 0, face);
export const THEME_DESIGNS = {
  tea_hall(R) {
    FN.rug(R.f(13, 15), 12, 9, TX.carpet('#8e1b1b', '#e0a33c', '#1a0a04'));
    tapchan(R.f(4.6, 4.6, 1), { c: '#b71c1c' }); tapchan(R.f(21.4, 4.6, 3), { c: '#1b5e20' });
    samovar(R.f(3.2, 22.6, 1));
    R.painting('N', 13, 9, 7, 4, 31); R.painting('W', 21, 9, 4.5, 3.2, 32);
    hide(R, 'qozon', 13, 7.4, 2); hide(R, 'teapot', 22.6, 21.6, 3); hide(R, 'sandiq', 5.8, 19.2, 0); hide(R, 'pillows', 22.4, 6, 3);
  },
  tea_kitchen(R) {
    ochoq(R.f(5.5, 2.2, 0)); tandir(R.f(21.6, 21.6));
    FN.counter(R.f(23.6, 4.8, 3), { len: 6 });
    FN.diningTable(R.f(13, 13.5), { len: 7, d: 4 });
    FN.sack(R.f(3, 23)); FN.sack(R.f(5.8, 23.4));
    hide(R, 'qozon', 20.5, 3.4, 2); hide(R, 'qozon', 3.4, 18.4, 1); hide(R, 'bochka', 22.8, 17.4, 3); hide(R, 'jar', 9, 20.5, 2);
  },
  tea_garden(R) {
    sori(R.f(13, 13)); anor(R.f(4, 4)); anor(R.f(22, 22)); anor(R.f(4, 22));
    ariq(R.f(13, 20.4), 8);
    FN.fountain(R.f(21.5, 4.5));
    hide(R, 'pot', 7.6, 22.8, 0); hide(R, 'sandiq', 19, 22.6, 2); hide(R, 'basket', 3, 7.6, 1); hide(R, 'qozon', 22.8, 19, 3);
  },
  tea_store(R) {
    FN.barrel(R.f(2.6, 2.6)); FN.barrel(R.f(2.6, 5.7));
    FN.shelfUnit(R.f(20.5, 1.4, 0));
    FN.sack(R.f(20.5, 21)); FN.sack(R.f(23.2, 21.4)); FN.sack(R.f(21.8, 23.8));
    FN.crate(R.f(4, 22.5)); FN.crate(R.f(4, 22.5), { s: 2.2, y: 3 });
    hide(R, 'qop', 13, 13, 0); hide(R, 'bochka', 6.4, 4, 1); hide(R, 'sandiq', 16.5, 22.4, 2); hide(R, 'box', 22.4, 6.4, 3);
  },
  tea_vip(R) {
    FN.rug(R.f(13, 13), 14, 10, TX.carpet('#1a237e', '#d4af37', '#0d1240'));
    tapchan(R.f(13, 13, 0), { w: 8, d: 5, c: '#4a148c' });
    FN.chinaCabinet(R.f(4.4, 1.3, 0), { w: 5 });
    FN.armchair(R.f(21.4, 4.6, 3), { c: '#4a148c', p: '#d4af37' });
    R.painting('W', 21, 9, 5, 3.5, 33); R.painting('E', 5, 9, 5, 3.5, 34);
    hide(R, 'vase', 3, 22.6, 1); hide(R, 'sandiq', 22.4, 21.8, 3); hide(R, 'pillows', 22.4, 9.4 - 3, 3); hide(R, 'teapot', 5.6, 19.4, 0);
  },
  bank_hall(R) {
    kassa(R.f(5.2, 2.4, 0), 2); kassa(R.f(20.8, 2.4, 0), 2);
    stanchions(R.f(7, 8), 5);
    atm(R.f(24.4, 4.8, 3)); atm(R.f(24.4, 20.8, 3));
    FN.plant(R.f(2.4, 23.6), { palm: true });
    R.painting('S', 21, 10.5, 6, 2.4, 41);
    hide(R, 'qop', 3.2, 19.4, 1); hide(R, 'bin', 19.8, 13, 3); hide(R, 'shkaf', 23.4, 23.4, 2); hide(R, 'pot', 7.2, 22.8, 0);
  },
  bank_vault(R) {
    vaultDoor(R.f(13, .6, 0));
    goldStack(R.f(6, 13), { n: 3 }); goldStack(R.f(20, 13), { n: 3 }); goldStack(R.f(13, 18), { n: 2 });
    hide(R, 'seyf', 3.2, 3.6, 1); hide(R, 'seyf', 22.8, 3.6, 3); hide(R, 'seyf', 3.4, 22.6, 1); hide(R, 'qop', 22.6, 22.4, 3); hide(R, 'shkaf', 19.6, 23.6, 2);
  },
  bank_office(R) {
    FN.desk(R.f(5.6, 5, 0)); FN.officeChair(R.f(5.6, 7.6, 2)); FN.desk(R.f(20.4, 5, 0)); FN.officeChair(R.f(20.4, 7.6, 2));
    FN.filingCabinet(R.f(2.2, 20, 1)); FN.filingCabinet(R.f(2.2, 23, 1));
    FN.plant(R.f(23.6, 2.4), { pot: '#2e7d32' });
    R.painting('N', 13, 9, 6, 3.5, 35);
    hide(R, 'shkaf', 23.4, 21, 3); hide(R, 'box', 7, 22.6, 0); hide(R, 'bin', 13, 13, 0); hide(R, 'seyf', 19, 23, 2);
  },
  bank_lounge(R) {
    FN.rug(R.f(13, 15), 12, 9, TX.carpet('#00695c', '#80cbc4', '#004d40'));
    FN.sofa(R.f(13, 6.2, 0), { c: '#004d40', p: '#80cbc4' });
    FN.armchair(R.f(4.4, 4.6, 1), { c: '#004d40', p: '#80cbc4' }); FN.armchair(R.f(21.6, 4.6, 3), { c: '#004d40', p: '#80cbc4' });
    samovar(R.f(3.2, 22.6, 1)); FN.grandfatherClock(R.f(23.4, 23.6, 2));
    hide(R, 'pillows', 5.8, 19.2, 0); hide(R, 'vase', 22.8, 19, 3); hide(R, 'teapot', 13, 9.8, 0); hide(R, 'pot', 19.6, 2.8, 0);
  },
  warehouse(R) {
    rack(R.f(5.6, 1.6, 0), { seed: 3 }); rack(R.f(20.4, 1.6, 0), { seed: 5 });
    rack(R.f(5.6, 24.4, 2), { seed: 8 }); rack(R.f(20.4, 24.4, 2), { seed: 11 });
    pallet(R.f(13, 13), { n: 2 });
    FN.barrel(R.f(23.4, 5.4)); FN.barrel(R.f(2.6, 5.4));
    hide(R, 'bochka', 3, 19.6, 1); hide(R, 'box', 8.6, 9, 2); hide(R, 'qop', 18, 18.4, 2); hide(R, 'shkaf', 23.2, 19.4, 3); hide(R, 'sandiq', 18, 8.4, 0);
  },
};
