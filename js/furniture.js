// Mebellar kutubxonasi va yashirinish joylari modellari.
// Har bir mebel lokal ramkada quriladi: markaz polda, old tomoni +z ga qaragan.
import * as THREE from 'three';
import { M, B, mergeChildren } from './builder.js';
import * as TX from './textures.js';

const DARKWOOD = '#3a2414';
const legs4 = (F, w, d, h, r, mat, inset = .5) => {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) F.cyl(r, r * .75, h, mat, sx * (w / 2 - inset), 0, sz * (d / 2 - inset), 10);
};
const legCols = (F, w, d, h, inset = .5) => { for (const sx of [-1, 1]) for (const sz of [-1, 1]) F.col(.45, h, .45, sx * (w / 2 - inset), 0, sz * (d / 2 - inset)); };

// ---------------- O'TIRISH ----------------
export function sofa(F, o = {}) {
  const L = o.len || 12, D = 5, c = M.velvet(o.c || '#8e2b2b'), leg = M.wood(DARKWOOD, .4);
  legs4(F, L, D, .5, .22, leg, .7);
  F.rbox(L, 1.4, D, .3, c, 0, .5, 0);
  const n = Math.max(2, Math.round(L / 4)), cw = (L - 2.4) / n;
  for (let i = 0; i < n; i++) {
    const x = -L / 2 + 1.2 + cw * (i + .5);
    F.rbox(cw - .08, .9, D - 1.5, .38, c, x, 1.85, .6);
    F.rbox(cw - .2, 2.1, .9, .42, c, x, 2.4, -D / 2 + 1.75, { rx: -.1 });
    F.top(x, 2.75, .9);
  }
  F.rbox(L, 3.1, 1.4, .5, c, 0, 1.6, -D / 2 + .7);
  for (const s of [-1, 1]) F.rbox(1.3, 2.4, D, .5, c, s * (L / 2 - .65), 1.5, 0);
  const pc = M.velvet(o.p || '#d8b26a');
  F.rbox(1.8, 1.8, .6, .5, pc, -L / 2 + 2.3, 2.6, -D / 2 + 2.4, { rz: .25, rx: -.25 });
  F.rbox(1.8, 1.8, .6, .5, pc, L / 2 - 2.3, 2.6, -D / 2 + 2.4, { rz: -.25, rx: -.25 });
  F.col(L, 2.75, D, 0, 0, 0); F.col(L, 4.7, 1.4, 0, 0, -D / 2 + .7);
  F.col(1.3, 3.9, D, -(L / 2 - .65), 0, 0); F.col(1.3, 3.9, D, L / 2 - .65, 0, 0);
  F.top(0, 4.7, -D / 2 + .7); F.top(-(L / 2 - .65), 3.9, 0); F.top(L / 2 - .65, 3.9, 0);
}
export function armchair(F, o = {}) { sofa(F, Object.assign({ len: 5.6 }, o)); }

export function chair(F, o = {}) {
  const w = M.wood(o.c || '#7a4a26', .45), cu = M.fab(o.cu || '#b03a2e');
  legs4(F, 2.6, 2.6, 2.2, .14, w, .3);
  F.rbox(2.7, .3, 2.7, .08, w, 0, 2.2, 0);
  F.rbox(2.4, .25, 2.4, .12, cu, 0, 2.5, .05);
  for (const s of [-1, 1]) F.box(.25, 3.0, .25, w, s * 1.15, 2.5, -1.2);
  F.rbox(2.6, .9, .2, .08, w, 0, 4.6, -1.2); F.rbox(2.2, .3, .15, .05, w, 0, 3.6, -1.2);
  F.col(2.7, .55, 2.7, 0, 2.2, 0); legCols(F, 2.6, 2.6, 2.2, .3); F.col(2.7, 3.0, .35, 0, 2.5, -1.2);
  F.top(0, 2.75, .2);
}
export function officeChair(F) {
  const b = M.plastic('#222'), s = M.lea('#2b2b2b');
  for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; F.box(.25, .2, 1.6, b, Math.sin(a) * .8, .35, Math.cos(a) * .8, { ry: a }); F.sph(.22, b, Math.sin(a) * 1.5, .2, Math.cos(a) * 1.5); }
  F.cyl(.18, .18, 1.8, M.metal(), 0, .4, 0); F.rbox(2.8, .6, 2.8, .25, s, 0, 2.2, 0);
  F.rbox(2.6, 3.2, .5, .25, s, 0, 2.9, -1.2, { rx: -.1 });
  F.col(2.8, 3.0, 2.8, 0, 0, 0); F.col(2.6, 6, .5, 0, 0, -1.2); F.top(0, 2.8, .2);
}
export function bench(F, o = {}) {
  const w = M.wood(o.c || '#6b3e1f', .5), cu = M.velvet(o.cu || '#3f6b5a');
  legs4(F, 5, 2.2, 2.0, .16, w, .3);
  F.rbox(5.2, .35, 2.4, .1, w, 0, 2.0, 0); F.rbox(4.9, .4, 2.1, .18, cu, 0, 2.35, 0);
  F.col(5.2, .75, 2.4, 0, 2.0, 0); legCols(F, 5, 2.2, 2.0, .3); F.top(0, 2.75, 0);
}

// ---------------- STOLLAR ----------------
export function coffeeTable(F, o = {}) {
  const w = M.wood(o.c || '#5a3a20', .3);
  legs4(F, 7, 4, 1.95, .2, w, .5);
  F.rbox(7.2, .35, 4.2, .1, w, 0, 1.95, 0);
  F.col(7.2, .35, 4.2, 0, 1.95, 0); legCols(F, 7, 4, 1.95, .5); F.top(-1.5, 2.3, 0); F.top(1.8, 2.3, .6);
  F.box(1.6, .35, 1.2, M.paint('#1f3d7b'), 1.6, 2.3, -.6, { ry: .3 }); F.box(1.4, .3, 1.1, M.paint('#8a6a1c'), 1.6, 2.65, -.6, { ry: .1 });
  F.lathe([[0, 0], [.35, .05], [.45, .5], [.25, 1.1], [.3, 1.3], [0, 1.3]], M.cer('#3b6fb6'), -2.4, 2.3, -.8);
  F.sph(.35, M.leaf('#e84a6f'), -2.4, 3.75, -.8); F.sph(.3, M.leaf('#f7c548'), -2.15, 3.6, -.6);
}
export function diningTable(F, o = {}) {
  const L = o.len || 14, D = o.d || 8, w = M.wood(o.c || '#6b3e1f', .25);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) F.lathe([[0, 0], [.4, 0], [.3, .6], [.22, 2.4], [.32, 3.4], [.25, 4], [0, 4]], w, sx * (L / 2 - .8), 0, sz * (D / 2 - .8), 12);
  F.rbox(L, .4, D, .12, w, 0, 4.0, 0);
  F.box(L - 1.6, .6, D - 1.6, w, 0, 3.4, 0);
  F.col(L, 1.0, D, 0, 3.4, 0); legCols(F, L, D, 3.4, .8);
  // dasturxon yo'li va idishlar
  F.box(L * .7, .02, 2.4, M.fab('#f3e6c8'), 0, 4.4, 0, { cast: false });
  for (let i = -1; i <= 1; i++) { F.top(i * L * .3, 4.4, 0); }
  F.cyl(.9, .7, .25, M.cer('#ffffff'), -L * .25, 4.42, -D * .28); F.cyl(.9, .7, .25, M.cer('#ffffff'), L * .25, 4.42, D * .28);
  F.lathe([[0, 0], [.6, 0], [.75, .3], [.3, .9], [.35, 1.6], [0, 1.6]], M.cer('#e9e1d0'), 0, 4.42, 0);
  for (let k = 0; k < 5; k++) F.sph(.4, M.leaf(['#ff7043', '#ffca28', '#e91e63', '#ab47bc', '#ffffff'][k]), Math.sin(k * 1.3) * .5, 6.2 + (k % 2) * .3, Math.cos(k * 1.3) * .5);
  const chairs = o.chairs ?? true;
  if (chairs) {
    const cc = { c: o.c || '#6b3e1f', cu: o.cu };
    const n = Math.max(1, Math.round(L / 5.5));
    for (let i = 0; i < n; i++) {
      const x = -L / 2 + L / n * (i + .5);
      chair(F.sub(x, D / 2 + 1.0, 2), cc); chair(F.sub(x, -D / 2 - 1.0, 0), cc);
    }
    if (o.ends !== false) { chair(F.sub(L / 2 + 1.0, 0, 3), cc); chair(F.sub(-L / 2 - 1.0, 0, 1), cc); }
  }
}
export function sideTable(F, o = {}) {
  const w = M.wood(o.c || '#5a3a20', .35);
  F.cyl(1.3, 1.3, .25, w, 0, 3.0, 0, 24); F.cyl(.18, .25, 3.0, w, 0, 0, 0, 10); F.cyl(.9, 1, .2, w, 0, 0, 0, 20);
  F.col(2.6, .25, 2.6, 0, 3.0, 0); F.col(.6, 3, .6, 0, 0, 0); F.top(0, 3.25, 0);
  if (o.lamp) tableLamp(F.sub(.2, -.2, 0, 3.25), o.lamp);
}
export function desk(F, o = {}) {
  const w = M.wood(o.c || '#5d3a1f', .35);
  F.rbox(8, .35, 4, .08, w, 0, 4.0, 0);
  F.box(2.6, 4.0, 3.6, w, 2.6, 0, 0); F.box(.3, 4.0, 3.6, w, -3.7, 0, 0);
  for (let i = 0; i < 3; i++) { F.box(2.4, 1.1, .05, M.wood('#6e4626', .4), 2.6, .3 + i * 1.25, 1.82); F.box(.6, .12, .12, M.metal('#d4af37', .3), 2.6, .9 + i * 1.25, 1.9); }
  F.col(8, .35, 4, 0, 4.0, 0); F.col(2.6, 4, 3.6, 2.6, 0, 0); F.col(.3, 4, 3.6, -3.7, 0, 0);
  F.top(-1.5, 4.35, .8);
  if (o.pc !== false) {
    F.box(3.6, 2.2, .18, M.plastic('#1a1a1a'), -.6, 5.0, -1.1); F.box(3.3, 1.9, .05, M.em('#4fa8ff', 1.1), -.6, 5.15, -1.0, { cast: false });
    F.box(.3, .7, .3, M.plastic('#1a1a1a'), -.6, 4.35, -1.1); F.box(1.4, .08, .8, M.plastic('#1a1a1a'), -.6, 4.35, -1.1);
    F.box(2.6, .1, .9, M.plastic('#2a2a2a'), -.6, 4.35, .4);
  }
  tableLamp(F.sub(2.6, -1, 0, 4.35), '#ffe0b0');
}
export function tableLamp(F, color = '#ffd8a0') {
  F.cyl(.45, .55, .15, M.metal('#b08d57', .35), 0, 0, 0); F.cyl(.08, .08, 1.5, M.metal('#b08d57', .35), 0, .15, 0);
  F.lathe([[.5, 0], [.85, 0], [.5, 1.1], [.3, 1.1]], M.em('#fff1d0', .9), 0, 1.4, 0, 24, { open: true });
  F.lamp(0, 1.9, 0, color, 16, 14);
}

// ---------------- YOTOQXONA ----------------
export function bed(F, o = {}) {
  const W = o.w || 9, L = o.l || 12, w = M.wood(o.wood || '#5c3a21', .45);
  legs4(F, W, L, 1.7, .25, w, .5);
  F.rbox(W, .7, L, .12, w, 0, 1.7, 0);
  F.rbox(W - .3, 1.1, L - .5, .45, M.fab('#f8f6f0'), 0, 2.4, .1);
  F.rbox(W - .1, .45, L * .62, .3, M.fab(o.c || '#5b7bd5'), 0, 3.3, L * .19);
  F.rbox(W + .2, .25, L * .5, .12, M.fab(o.c2 || '#e6c86e'), 0, 3.38, L * .38);
  for (const s of [-1, 1]) F.rbox(W / 2 - .7, .9, 2.2, .45, M.fab('#ffffff'), s * W / 4, 3.4, -L / 2 + 1.8, { rx: .25 });
  F.rbox(W, 6.5, .6, .2, w, 0, 0, -L / 2 + .3);
  F.rbox(W - 1.2, 3.2, .3, .3, M.velvet(o.c || '#5b7bd5'), 0, 3.0, -L / 2 + .65);
  F.rbox(W, 3.4, .5, .15, w, 0, 0, L / 2 - .25);
  legCols(F, W, L, 1.7, .5);
  F.col(W, 1.8, L, 0, 1.7, 0); F.col(W, 6.5, .6, 0, 0, -L / 2 + .3); F.col(W, 3.4, .5, 0, 0, L / 2 - .25);
  F.top(-W / 4, 3.6, 0); F.top(W / 4, 3.6, L / 4); F.top(0, 6.5, -L / 2 + .3);
}
export function nightstand(F, o = {}) {
  const w = M.wood(o.c || '#6b4426', .4);
  F.rbox(3, 3.2, 3, .1, w, 0, 0, 0);
  for (let i = 0; i < 2; i++) { F.box(2.6, 1.2, .06, M.wood('#7d5230', .4), 0, .4 + i * 1.4, 1.5); F.sph(.12, M.metal('#d4af37', .3), 0, 1.0 + i * 1.4, 1.58); }
  F.col(3, 3.2, 3, 0, 0, 0); F.top(.8, 3.2, .6);
  tableLamp(F.sub(-.5, -.3, 0, 3.2), o.lamp || '#ffd6a8');
}
export function wardrobe(F, o = {}) {
  const W = o.w || 8, w = M.wood(o.c || '#6b4426', .45);
  F.rbox(W, 11, 3.5, .1, w, 0, 0, 0);
  F.box(W + .4, .5, 3.9, w, 0, 11, 0);
  for (const s of [-1, 1]) {
    F.box(W / 2 - .3, 9.6, .08, M.wood('#7d5230', .4), s * W / 4, .7, 1.76);
    F.box(W / 2 - 1.1, 8.6, .06, M.wood('#86593a', .4), s * W / 4, 1.2, 1.82);
    F.box(.12, 1.4, .18, M.metal('#d4af37', .3), s * .45, 5, 1.9);
  }
  F.col(W, 11.5, 3.5, 0, 0, 0);
}
export function dresser(F, o = {}) {
  const W = o.w || 6, w = M.wood(o.c || '#7a4a2a', .4);
  F.rbox(W, 4.6, 3, .1, w, 0, 0, 0);
  for (let i = 0; i < 3; i++) { F.box(W - .5, 1.2, .06, M.wood('#8a5a33', .4), 0, .35 + i * 1.4, 1.5); for (const s of [-1, 1]) F.sph(.14, M.metal('#d4af37', .3), s * W / 4, .95 + i * 1.4, 1.58); }
  F.col(W, 4.6, 3, 0, 0, 0); F.top(-W / 4, 4.6, .3); F.top(W / 4, 4.6, .3);
  F.box(2.2, 3, .12, M.metal('#ffffff', .03), 0, 4.6, -1.3);
  F.box(2.5, 3.3, .1, M.wood('#5a3520', .4), 0, 4.45, -1.38);
}
export function bookshelf(F, o = {}) {
  const W = o.w || 5.5, H = o.h || 12, D = 2.5, w = M.wood(o.c || '#4a2e17', .5);
  F.box(.3, H, D, w, -W / 2 + .15, 0, 0); F.box(.3, H, D, w, W / 2 - .15, 0, 0);
  F.box(W, H, .2, w, 0, 0, -D / 2 + .1); F.box(W + .3, .4, D + .2, w, 0, H, 0);
  const n = Math.floor(H / 2.4);
  const books = M.tex('books' + (o.seed || 1), TX.bookSpines(o.seed || 1), { roughness: .8 });
  for (let i = 0; i < n; i++) {
    const y = .3 + i * (H - .3) / n;
    F.box(W - .4, .22, D - .2, w, 0, y, .05);
    const g = new THREE.PlaneGeometry(W - .7, 1.85);
    const uv = g.attributes.uv; const u0 = ((i * 37) % 10) / 10;
    for (let k = 0; k < uv.count; k++) uv.setX(k, u0 + uv.getX(k) * (W - .7) / 6);
    F.add(g, books, { at: [0, y + .22 + .93, D / 2 - .45], cast: false });
  }
  F.col(W, H + .4, D, 0, 0, 0);
}
export function chinaCabinet(F, o = {}) {
  const W = o.w || 5.5, w = M.wood(o.c || '#5c3520', .4);
  F.rbox(W, 4.5, 2.6, .1, w, 0, 0, 0);
  F.box(W - .4, 6.5, 2.2, w, 0, 4.5, -.15); F.box(W, .5, 2.6, w, 0, 11, 0);
  F.box(W - .8, 6.1, .05, M.glass(), 0, 4.7, .98, { cast: false });
  for (let s = 0; s < 3; s++) for (let k = 0; k < 3; k++) F.cyl(.5, .5, .1, M.cer(['#ffffff', '#cfe3ff', '#ffe9d1'][k]), -1.4 + k * 1.4, 5.0 + s * 2.0, 0, 18, { rx: Math.PI / 2 - .2 });
  F.col(W, 11.5, 2.6, 0, 0, 0); F.top(0, 4.5, .9);
}
export function sideboard(F, o = {}) {
  const W = o.w || 5.5, w = M.wood(o.c || '#5c3520', .35);
  legs4(F, W, 2.6, 1, .14, w, .4);
  F.rbox(W, 3.6, 2.6, .1, w, 0, 1, 0);
  F.col(W, 4.6, 2.6, 0, 0, 0); F.top(-1, 4.6, 0);
  F.lathe([[0, 0], [.5, 0], [.6, .8], [.25, 1.6], [.4, 2.2], [0, 2.2]], M.cer('#2e7d6b'), 1.4, 4.6, -.2);
}

// ---------------- MEHMONXONA ----------------
export function tvStand(F) {
  const w = M.wood('#2e2e2e', .35);
  F.rbox(9, 2.8, 3, .1, w, 0, 0, 0);
  for (const s of [-1, 1]) F.box(3.8, 2.0, .05, M.wood('#3a3a3a', .3), s * 2.2, .4, 1.5);
  F.box(8.4, 4.8, .3, M.plastic('#111'), 0, 3.2, -.6);
  F.box(8, 4.4, .05, M.tex('tvscr', TX.tvScreen(), { emissive: '#ffffff', emissiveMap: TX.tvScreen().map, emissiveIntensity: 1.1, roughness: .2 }), 0, 3.4, -.43, { cast: false });
  F.box(2.4, .4, 1.2, M.plastic('#111'), 0, 2.8, -.6);
  F.col(9, 2.8, 3, 0, 0, 0); F.col(8.4, 5.2, .4, 0, 2.8, -.6); F.top(-3.6, 2.8, .8); F.top(3.6, 2.8, .8);
  F.lamp(0, 5, 1.5, '#9fd0ff', 10, 12);
}
export function floorLamp(F, o = {}) {
  const m = M.metal('#3b3b3b', .4);
  F.cyl(.9, 1, .25, m, 0, 0, 0, 24); F.cyl(.1, .1, 8, m, 0, .25, 0, 10);
  F.lathe([[1.0, 0], [1.6, 0], [1.0, 2.0], [.7, 2.0]], M.em(o.shade || '#fff3d6', .8), 0, 7.6, 0, 28, { open: true });
  F.col(.7, 9.6, .7, 0, 0, 0);
  F.lamp(0, 8.4, 0, o.light || '#ffd29a', 40, 22);
}
export function plant(F, o = {}) {
  const pot = M.cer(o.pot || '#c4622d'), s = o.s || 1;
  F.lathe([[0, 0], [1.1 * s, 0], [1.4 * s, 2.2 * s], [1.55 * s, 2.4 * s], [0, 2.4 * s]], pot, 0, 0, 0);
  F.cyl(1.35 * s, 1.35 * s, .1, M.paint('#3a2414', .95), 0, 2.25 * s, 0);
  const lc = [o.leaf || '#2f7d32', '#3f9b3a', '#24692a'];
  const n = o.palm ? 9 : 14;
  for (let i = 0; i < n; i++) {
    const a = i * 2.39, up = o.palm ? 3.5 * s : (1.2 + (i % 4) * .7) * s;
    const g = new THREE.SphereGeometry(o.palm ? .9 : .7, 10, 8);
    g.scale(o.palm ? .4 : .55, .12, o.palm ? 3.2 : 1.6);
    g.translate(0, 0, o.palm ? 2.6 : 1.1);
    g.rotateX(o.palm ? .35 : -.25 - (i % 3) * .2);
    g.rotateY(a);
    F.add(g, M.leaf(lc[i % 3]), { at: [0, 2.4 * s + up, 0] });
  }
  if (o.palm) F.cyl(.22 * s, .32 * s, 3.6 * s, M.wood('#6b4a2a', .9), 0, 2.4 * s, 0, 8);
  else F.cyl(.1 * s, .14 * s, 1.6 * s, M.wood('#4a3a1a', .9), 0, 2.4 * s, 0, 6);
  F.col(2.8 * s, 2.4 * s + (o.palm ? 3.6 : 2.6) * s, 2.8 * s, 0, 0, 0);
}
export function rug(F, w, d, t) {
  const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2);
  F.add(g, M.tex('rug' + t.map.uuid, t, { roughness: .95 }), { at: [0, .03, 0], cast: false });
}
export function fireplace(F) {
  const st = M.tex('brick', TX.stone('#9b5a44', '#7a3e2c'), { roughness: .85 });
  F.box(8, 7.5, 2.6, st, 0, 0, 0);
  F.box(9, .5, 3.2, M.marble('#efe9e1'), 0, 7.5, .2);
  F.box(4.6, 3.6, 2.0, M.paint('#120a06', .95), 0, .6, .35, { cast: false });
  F.box(6, .6, 3.4, M.marble('#efe9e1'), 0, 0, .5);
  F.box(4.4, 5.2, 1.2, st, 0, 8, -.6);
  F.box(5.2, 6.5, 2.0, st, 0, 8, -.3);
  for (let i = 0; i < 3; i++) F.cyl(.3, .3, 3, M.wood('#4a2e17', .9), (i - 1) * .3, .9 + i * .25, .6 - i * .2, 8, { rz: Math.PI / 2, ry: .4 * (i - 1) });
  F.col(8, 8, 2.6, 0, 0, 0); F.col(6, .6, 3.4, 0, 0, .5); F.col(5.2, 6.5, 2.0, 0, 8, -.3);
  F.top(-3, 8, .2); F.top(3, 8, .2);
  // olov (harakatlanuvchi)
  const fire = new THREE.Group();
  const cols = ['#ff3d00', '#ff9100', '#ffd54f'];
  const flames = [];
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(.35 + (i % 3) * .1, 1.6 + (i % 4) * .4, 8), new THREE.MeshBasicMaterial({ color: cols[i % 3], transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.set((i % 5 - 2) * .45, 1.6, (i % 2) * .3); m.userData.noShadow = true; m.userData.ph = i * 1.7;
    fire.add(m); flames.push(m);
  }
  F.dyn(fire, 0, 0, .7);
  F.lamp(0, 2.6, 2.5, '#ff8a3d', 70, 26, true);
  B.anim.push(t => { for (const m of flames) { const p = m.userData.ph; m.scale.set(1, .7 + Math.sin(t * 9 + p) * .3 + Math.sin(t * 23 + p) * .1, 1); m.position.y = 1.1 + m.scale.y * .8; } });
}
export function piano(F) {
  const b = M.cer('#111111');
  F.rbox(6.5, 1.6, 7, .4, b, 0, 3.3, 0);
  F.cyl(3.25, 3.25, 1.6, b, .3, 3.3, 2.2, 32);
  F.box(6.2, .3, 1.5, M.cer('#fafafa'), 0, 4.0, -4.1);
  for (let i = 0; i < 20; i++) F.box(.14, .1, .9, b, -2.9 + i * .3, 4.3, -4.0);
  F.box(5.5, 2.6, .1, b, 0, 4.9, 2.6, { rx: -.5 });
  for (const [x, z] of [[-2.8, -3], [2.8, -3], [0.3, 4.4]]) F.lathe([[0, 0], [.35, 0], [.25, .6], [.22, 3.3], [0, 3.3]], b, x, 0, z, 12);
  F.col(6.5, 1.6, 7, 0, 3.2, 0); F.col(6.5, 1.6, 4, .3, 3.2, 3.2);
  for (const [x, z] of [[-2.8, -3], [2.8, -3], [0.3, 4.4]]) F.col(.6, 3.3, .6, x, 0, z);
  F.top(0, 4.9, 0); F.top(.5, 4.9, 3);
  bench(F.sub(0, -6.5, 0), { c: '#111111', cu: '#111111' });
}

// ---------------- OSHXONA ----------------
export function counter(F, o = {}) {
  const L = o.len || 8, w = M.wood(o.c || '#e8e2d6', .5), top = M.marble(o.top || '#e9e4dc');
  F.box(L, .6, 3.2, M.paint('#2a2a2a', .9), 0, 0, -.1);
  F.box(L, 4.6, 3.4, w, 0, .5, 0);
  const n = Math.max(1, Math.round(L / 2.8));
  for (let i = 0; i < n; i++) {
    const x = -L / 2 + L / n * (i + .5);
    F.rbox(L / n - .2, 4.2, .1, .04, w, x, .7, 1.72);
    F.box(.12, 1.0, .15, M.metal('#bfc3c7', .25), x + L / n / 2 - .6, 3.4, 1.82);
  }
  F.box(L + .2, .35, 3.8, top, 0, 5.1, .1);
  if (o.sink) {
    F.box(3.2, .1, 2.2, M.metal('#cfd3d6', .15), o.sink, 5.4, .1, { cast: false });
    F.cyl(.12, .12, 1.8, M.metal('#e0e4e8', .1), o.sink, 5.45, -1.3, 10); F.cyl(.1, .1, 1.4, M.metal('#e0e4e8', .1), o.sink, 7.2, -.7, 10, { rx: Math.PI / 2 });
  }
  if (o.stove) {
    F.box(3, .1, 3, M.cer('#151515'), o.stove, 5.45, .1);
    for (const [x, z] of [[-.7, -.7], [.7, -.7], [-.7, .7], [.7, .7]]) F.torus(.45, .06, M.em('#ff5722', .4), o.stove + x, 5.6, .1 + z, { rx: Math.PI / 2 });
    F.box(3, 2.4, .1, M.cer('#222'), o.stove, 1.4, 1.75); F.box(2.2, 1.3, .05, M.em('#ff9a3d', .25), o.stove, 1.9, 1.8);
    F.lathe([[0, 0], [1, 0], [1.05, 1.4], [0, 1.4]], M.metal('#b8bcc2', .2), o.stove - .7, 5.55, -.6);
  }
  F.col(L + .2, 5.45, 3.8, 0, 0, .1);
  for (let i = 0; i < Math.floor(L / 3); i++) F.top(-L / 2 + 1.5 + i * 3, 5.45, .6);
}
export function upperCabinet(F, o = {}) {
  const L = o.len || 8, w = M.wood(o.c || '#e8e2d6', .5);
  F.box(L, 3.6, 2.2, w, 0, 8.6, -.7);
  const n = Math.max(1, Math.round(L / 2.8));
  for (let i = 0; i < n; i++) { const x = -L / 2 + L / n * (i + .5); F.rbox(L / n - .2, 3.2, .08, .04, w, x, 8.8, .42); F.box(.12, .8, .12, M.metal('#bfc3c7', .25), x + L / n / 2 - .5, 9.2, .5); }
}
export function fridge(F) {
  const c = M.cer('#f2f4f5');
  F.rbox(5, 10.5, 4.2, .35, c, 0, 0, 0);
  F.box(4.8, .08, .1, M.paint('#9aa0a6'), 0, 6.6, 2.1);
  for (const y of [7.5, 3.5]) F.box(.25, 2.2, .3, M.metal('#cfd3d6', .2), 1.8, y, 2.2);
  F.box(1, 1.3, .05, M.paint('#ff7043'), -1.2, 8, 2.12); F.box(.9, .9, .05, M.paint('#42a5f5'), -.6, 4.6, 2.12);
  F.col(5, 10.5, 4.2, 0, 0, 0);
}
export function trashCan(F) { F.cyl(.9, .8, 2.6, M.metal('#b0b6bc', .25), 0, 0, 0, 20); F.cyl(.95, .95, .3, M.metal('#9aa0a6', .25), 0, 2.6, 0, 20); F.col(1.8, 2.9, 1.8, 0, 0, 0); F.top(0, 2.9, 0); }

// ---------------- HAMMOM / KIR ----------------
export function bathtub(F) {
  const c = M.cer('#ffffff');
  F.rbox(11, 3.2, 6, .9, c, 0, 0, 0);
  F.rbox(10, .1, 5, .5, M.tex('water', { map: null }, { color: '#8fd3ff', roughness: .05, metalness: .1, emissive: '#1d4a66', emissiveIntensity: .3, transparent: true, opacity: .85 }), 0, 2.9, 0, { cast: false });
  for (let i = 0; i < 8; i++) F.sph(.55, M.cer('#ffffff'), -3 + i * .9, 3.1, (i % 3 - 1) * 1.1);
  F.sph(.5, M.plastic('#ffd600'), 2.5, 3.3, .8); F.sph(.3, M.plastic('#ffd600'), 2.9, 3.85, .8); F.box(.3, .12, .2, M.plastic('#ff6d00'), 3.2, 3.8, .8);
  F.cyl(.15, .15, 2, M.metal('#e0e4e8', .08), -5, 3.0, 0, 10); F.cyl(.12, .12, 1.4, M.metal('#e0e4e8', .08), -4.5, 5.0, 0, 10, { rz: Math.PI / 2 });
  F.col(11, 3.2, 6, 0, 0, 0); F.top(4, 3.2, 2.4);
}
export function toilet(F) {
  const c = M.cer('#ffffff');
  F.lathe([[0, 0], [.9, 0], [.8, 1.2], [1.2, 2.2], [0, 2.2]], c, 0, 0, .4);
  F.rbox(2.6, .3, 3, .2, c, 0, 2.2, .5); F.rbox(2.8, 3, 1.2, .3, c, 0, 2.1, -1.2); F.box(1.2, .2, .4, M.metal('#cfd3d6', .2), 0, 4.9, -1.2);
  F.col(2.8, 2.5, 3.4, 0, 0, .3); F.col(2.8, 5.1, 1.2, 0, 0, -1.2); F.top(0, 2.5, .6);
}
export function sinkPedestal(F) {
  const c = M.cer('#ffffff');
  F.lathe([[0, 0], [.7, 0], [.45, .4], [.4, 4], [0, 4]], c, 0, 0, 0);
  F.rbox(4, .9, 2.8, .4, c, 0, 4, .2);
  F.cyl(.1, .1, .8, M.metal('#e0e4e8', .08), 0, 4.9, -.7, 10);
  F.box(3.6, 4.4, .1, M.metal('#ffffff', .02), 0, 6.5, -1.25);
  F.box(4, 4.8, .12, M.wood('#d9d4ca', .5), 0, 6.3, -1.32);
  F.col(4, 4.9, 2.8, 0, 0, .2); F.top(1.2, 4.9, .6);
}
export function washer(F, o = {}) {
  const c = M.cer('#f4f6f7');
  F.rbox(4.5, 5, 4.5, .3, c, 0, 0, 0);
  F.torus(1.4, .22, M.metal('#c9ced2', .2), 0, 2.4, 2.26);
  F.cyl(1.25, 1.25, .1, M.tex('wglass', { map: null }, { color: '#20323d', roughness: .05, metalness: .2 }), 0, 2.4, 2.25, 28, { rx: Math.PI / 2 });
  F.box(4.2, .9, .1, M.plastic('#dfe3e6'), 0, 4, 2.25);
  F.cyl(.3, .3, .15, M.plastic(o.k || '#42a5f5'), 1.4, 4.45, 2.32, 16, { rx: Math.PI / 2 });
  F.col(4.5, 5, 4.5, 0, 0, 0); F.top(0, 5, 0);
}
export function shelfUnit(F, o = {}) {
  const W = o.w || 6, H = o.h || 9, m = M.metal('#8d949b', .45);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) F.box(.18, H, .18, m, sx * (W / 2 - .1), 0, sz * 1.1);
  const items = ['#e53935', '#1e88e5', '#fdd835', '#43a047', '#8e24aa', '#ff7043', '#8d6e63'];
  for (let i = 0; i < 4; i++) {
    const y = .4 + i * (H - .5) / 3.4;
    F.box(W, .12, 2.4, m, 0, y, 0);
    if (y > 1.5) F.top(-W / 3, y + .12, .5);
    for (let k = 0; k < 4; k++) {
      const x = -W / 2 + .9 + k * (W - 1.6) / 3, c = items[(i * 3 + k) % items.length];
      if ((i + k) % 3 === 0) F.cyl(.45, .45, 1.2, M.plastic(c), x, y + .12, 0, 14);
      else if ((i + k) % 3 === 1) F.box(1, 1.3, 1, M.paint(c, .8), x, y + .12, 0, { ry: k * .3 });
      else F.lathe([[0, 0], [.4, 0], [.45, .8], [.2, 1.2], [.2, 1.4], [0, 1.4]], M.plastic(c), x, y + .12, 0, 14);
    }
  }
  F.col(W, H, 2.4, 0, 0, 0);
}
export function ironingBoard(F) {
  const m = M.metal('#9aa0a6', .3);
  F.rbox(3, .2, 9, .1, M.fab('#7fb3d5'), 0, 3.4, 0);
  for (const s of [-1, 1]) { F.box(.12, 4.2, .12, m, -.6 * s, .0, 0, { rx: .55 * s, at: undefined }); F.box(.12, 4.2, .12, m, .6 * s, 0, 0, { rx: -.55 * s }); }
  F.col(3, .2, 9, 0, 3.3, 0); F.col(1.6, 3.3, .5, 0, 0, 0); F.top(0, 3.6, 2);
  F.lathe([[0, 0], [.6, 0], [.5, .5], [0, .55]], M.plastic('#e0e0e0'), 0, 3.6, -3);
}

// ---------------- BOLALAR ----------------
export function toyBlocks(F, o = {}) {
  const cols = ['#e53935', '#1e88e5', '#fdd835', '#43a047', '#8e24aa', '#ff7043'];
  const st = o.steps || [[0, 0, 0], [1.6, 0, .3], [1.6, 1.5, .3], [3.2, 0, .1], [3.2, 1.5, .1], [3.2, 3.0, .1]];
  st.forEach(([x, y, z], i) => { F.rbox(1.5, 1.5, 1.5, .12, M.plastic(cols[i % 6]), x, y, z, { ry: (i % 3) * .1 }); F.col(1.5, 1.5, 1.5, x, y, z); F.top(x, y + 1.5, z); });
}
export function teddy(F) {
  const f = M.velvet('#a1673b'), l = M.velvet('#e9c79b');
  F.sph(1.6, f, 0, 1.6, 0, 1, 1.05, .95); F.sph(1.1, l, 0, 1.5, .9, 1, 1, .5);
  F.sph(1.2, f, 0, 3.8, 0); F.sph(.55, l, 0, 3.6, 1.0, 1, .8, .7); F.sph(.15, M.cer('#1a1a1a'), 0, 3.8, 1.5);
  for (const s of [-1, 1]) {
    F.sph(.45, f, s * .95, 4.7, 0, 1, 1, .6); F.sph(.15, M.cer('#111'), s * .4, 4.1, 1.05);
    F.sph(.6, f, s * 1.7, 2.2, .4, 1, 1.4, 1); F.sph(.65, f, s * .9, .5, 1.3, 1, .8, 1.3);
  }
  F.torus(.6, .14, M.velvet('#d32f2f'), 0, 2.9, .1, { rx: Math.PI / 2 });
  F.col(3.4, 4.8, 3, 0, 0, 0); F.top(0, 5, 0);
}
export function ball(F, c = '#ff7043') {
  const g = new THREE.SphereGeometry(1.5, 28, 20); F.add(g, M.plastic(c), { at: [0, 1.5, 0] });
  F.torus(1.5, .06, M.plastic('#ffffff'), 0, 1.5, 0); F.torus(1.5, .06, M.plastic('#ffffff'), 0, 1.5, 0, { ry: Math.PI / 2 });
  F.col(2.4, 3, 2.4, 0, 0, 0);
}
export function trainTrack(F) {
  const g = new THREE.TorusGeometry(5, .25, 6, 48); g.rotateX(Math.PI / 2); g.scale(1, .3, .7);
  F.add(g, M.wood('#8d6e63', .6), { at: [0, .08, 0], cast: false });
  const cols = ['#e53935', '#1e88e5', '#43a047'];
  for (let i = 0; i < 3; i++) { const a = i * .5; const x = Math.cos(a) * 5, z = Math.sin(a) * 3.5; F.rbox(1.1, .9, .8, .1, M.plastic(cols[i]), x, .1, z, { ry: -a }); }
}

// ---------------- KUTUBXONA / ISHXONA ----------------
export function globe(F) {
  const w = M.wood('#5a3a20', .4);
  F.cyl(.9, 1.1, .3, w, 0, 0, 0); F.cyl(.15, .2, 3, w, 0, .3, 0);
  const g = new THREE.SphereGeometry(1.4, 28, 20);
  F.add(g, M.tex('globe', { map: TX.painting(3).map }, { roughness: .4, color: '#9ad0ff' }), { at: [0, 4.6, 0], rz: .4 });
  F.torus(1.55, .06, M.metal('#d4af37', .3), 0, 4.6, 0, { ry: Math.PI / 2, rz: .4 });
  F.col(2.2, 6, 2.2, 0, 0, 0);
}
export function filingCabinet(F) {
  F.rbox(3, 6, 3, .08, M.metal('#7b8790', .5), 0, 0, 0);
  for (let i = 0; i < 4; i++) { F.box(2.6, 1.2, .06, M.metal('#8d99a2', .4), 0, .3 + i * 1.45, 1.5); F.box(.9, .15, .15, M.metal('#cfd3d6', .2), 0, .9 + i * 1.45, 1.58); }
  F.col(3, 6, 3, 0, 0, 0); F.top(0, 6, 0);
}
export function grandfatherClock(F) {
  const w = M.wood('#4a2a14', .35);
  F.rbox(3, 2, 2.2, .1, w, 0, 0, 0); F.box(2.4, 6, 1.8, w, 0, 2, 0); F.rbox(3.2, 3.4, 2.4, .15, w, 0, 8, 0);
  F.cyl(1.1, 1.1, .1, M.cer('#fff8e1'), 0, 9.7, 1.21, 32, { rx: Math.PI / 2 });
  F.box(2, 5, .05, M.glass(), 0, 2.5, .92, { cast: false });
  F.col(3.2, 11.4, 2.4, 0, 0, 0);
  const pend = new THREE.Group();
  const rod = new THREE.Mesh(new THREE.BoxGeometry(.08, 3.4, .08), M.metal('#d4af37', .25)); rod.position.y = -1.7; pend.add(rod);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, .1, 20), M.metal('#d4af37', .2)); disc.rotation.x = Math.PI / 2; disc.position.y = -3.4; pend.add(disc);
  const hands = new THREE.Group();
  const h1 = new THREE.Mesh(new THREE.BoxGeometry(.08, .8, .04), M.paint('#111')); h1.position.y = .4; hands.add(h1);
  const h2 = new THREE.Mesh(new THREE.BoxGeometry(.06, 1, .04), M.paint('#111')); h2.position.y = .5; const h2p = new THREE.Group(); h2p.add(h2); hands.add(h2p);
  const g = new THREE.Group(); pend.position.set(0, 7.3, .5); g.add(pend); hands.position.set(0, 9.7, 1.3); g.add(hands);
  F.dyn(g, 0, 0, 0);
  B.anim.push(t => { pend.rotation.z = Math.sin(t * 2.4) * .25; h2p.rotation.z = -t * .5; h1.rotation.z = -t * .04; });
}
export function coatRack(F) {
  const w = M.wood('#4a2e17', .5);
  F.cyl(1, 1.1, .3, w, 0, 0, 0); F.cyl(.15, .15, 9, w, 0, .3, 0, 10);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; F.cyl(.08, .08, 1.2, w, Math.sin(a) * .5, 8.5, Math.cos(a) * .5, 6, { rz: Math.sin(a) * .8, rx: -Math.cos(a) * .8 }); }
  F.rbox(1.8, 4, 1.4, .5, M.fab('#8a2b2b'), .3, 4.4, .6);
  F.sph(.9, M.fab('#2b4f8a'), -.3, 9.4, -.3, 1, .6, 1); F.cyl(1.4, 1.4, .1, M.fab('#2b4f8a'), -.3, 9.1, -.3);
  F.col(2.2, 9.5, 2.2, 0, 0, 0);
}
export function shoeRack(F) {
  const w = M.wood('#6b4a2d', .5);
  F.box(5, .2, 2.2, w, 0, 0, 0); F.box(5, .2, 2.2, w, 0, 1.4, 0); F.box(5, .2, 2.2, w, 0, 2.8, 0);
  for (const s of [-1, 1]) F.box(.2, 3, 2.2, w, s * 2.4, 0, 0);
  const cs = ['#c62828', '#283593', '#4e342e', '#f9a825'];
  for (let i = 0; i < 4; i++) F.rbox(1, .7, 1.8, .3, M.lea(cs[i]), -1.8 + i * 1.2, i < 2 ? .2 : 1.6, .1);
  F.col(5, 3, 2.2, 0, 0, 0); F.top(0, 3, 0);
}
export function consoleTable(F) {
  const w = M.wood('#5c3520', .3);
  legs4(F, 5, 2, 4.2, .14, w, .3);
  F.rbox(5.2, .3, 2.2, .08, w, 0, 4.2, 0);
  F.col(5.2, .3, 2.2, 0, 4.2, 0); legCols(F, 5, 2, 4.2, .3); F.top(-1.5, 4.5, 0);
  F.lathe([[0, 0], [.5, 0], [.7, .8], [.3, 1.8], [.45, 2.4], [0, 2.4]], M.cer('#1565c0'), 1.2, 4.5, 0);
  F.box(3.4, 4.5, .15, M.metal('#ffffff', .02), 0, 6.5, -1.0); F.box(3.8, 4.9, .1, M.wood('#d4af37', .3), 0, 6.3, -1.08);
}

// ---------------- OMBOR / BOG' ----------------
export function crate(F, o = {}) {
  const s = o.s || 3, w = M.wood(o.c || '#b08455', .8), y = o.y || 0;
  F.box(s, s, s, w, 0, y, 0);
  for (const z of [-1, 1]) { F.box(s + .05, .35, .1, M.wood('#8d6338', .8), 0, y + .4, z * s / 2); F.box(s + .05, .35, .1, M.wood('#8d6338', .8), 0, y + s - .75, z * s / 2); F.box(s * 1.3, .3, .1, M.wood('#8d6338', .8), 0, y + s / 2, z * s / 2, { rz: .78 }); }
  F.col(s, s, s, 0, y, 0); F.top(0, y + s, 0);
}
export function sack(F, c = '#c9b38a') {
  F.sph(1.3, M.fab(c), 0, 1.2, 0, 1, 1, .9); F.sph(.6, M.fab(c), 0, 2.5, 0, .7, 1, .7); F.torus(.4, .08, M.fab('#7a5a3a'), 0, 2.4, 0, { rx: Math.PI / 2 });
  F.col(2.4, 2.8, 2.2, 0, 0, 0); F.top(0, 2.8, 0);
}
export function barrel(F) {
  F.lathe([[0, 0], [1.2, 0], [1.45, 1.6], [1.2, 3.2], [0, 3.2]], M.wood('#8a5a33', .7), 0, 0, 0, 20);
  for (const y of [.5, 1.6, 2.7]) F.torus(y === 1.6 ? 1.46 : 1.35, .06, M.metal('#555', .5), 0, y, 0, { rx: Math.PI / 2 });
  F.col(2.8, 3.2, 2.8, 0, 0, 0); F.top(0, 3.2, 0);
}
export function wickerChair(F) {
  const w = M.wood('#c9a26a', .8);
  F.lathe([[0, 0], [1.6, 0], [1.9, 2.0], [0, 2.0]], w, 0, 0, 0, 20);
  F.add(new THREE.CylinderGeometry(1.9, 1.7, 3.6, 24, 1, true, Math.PI / 2, Math.PI), M.leaf('#c9a26a'), { at: [0, 3.8, 0] });
  F.rbox(3, .5, 3, .25, M.fab('#e8d9b5'), 0, 2, .2);
  F.col(3.8, 2.5, 3.8, 0, 0, 0); F.col(3.8, 6, 1, 0, 0, -1.8); F.top(0, 2.5, .3);
}
export function fountain(F) {
  const s = M.tex('fstone', TX.stone('#d6cfc0', '#b8ae9a'), { roughness: .8 });
  F.cyl(3.2, 3.4, 1.6, s, 0, 0, 0, 32); F.cyl(2.9, 2.9, .1, M.tex('fwater', { map: null }, { color: '#7fc8ef', roughness: .03, metalness: .1, emissive: '#16405a', emissiveIntensity: .4 }), 0, 1.45, 0, 32, { cast: false });
  F.cyl(.4, .6, 3.5, s, 0, 1.4, 0, 14); F.cyl(1.4, .3, .5, s, 0, 4.5, 0, 20);
  F.col(6, 1.6, 6, 0, 0, 0); F.col(1.2, 5, 1.2, 0, 0, 0); F.top(2.2, 1.6, 0);
}
export function birdCage(F) {
  const m = M.metal('#d4af37', .3);
  F.cyl(.2, .3, 6, m, 0, 0, 0, 8); F.cyl(1.2, 1.2, .15, m, 0, 6, 0, 20);
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; F.cyl(.03, .03, 2.6, m, Math.sin(a) * 1.15, 6.1, Math.cos(a) * 1.15, 4); }
  F.sph(1.2, m, 0, 8.7, 0, 1, .5, 1);
  F.sph(.35, M.plastic('#fdd835'), 0, 7.2, 0); F.sph(.22, M.plastic('#fdd835'), .2, 7.6, .1);
  F.col(1, 9.4, 1, 0, 0, 0);
}
export function bookStack(F, n = 3) {
  const cs = ['#7b1f1f', '#1f3d7b', '#1f5b33', '#8a6a1c'];
  for (let i = 0; i < n; i++) F.rbox(2.4 - i * .15, .42, 1.8, .05, M.paint(cs[i % 4], .7), 0, i * .43, 0, { ry: (i % 2 - .5) * .3 });
  F.col(2.3, n * .43, 1.8, 0, 0, 0); F.top(0, n * .43, 0);
}
export function paintingOnWall(F, w, h, seed) {
  F.box(w + .5, h + .5, .2, M.wood('#b8892e', .3), 0, -h / 2 - .25, 0);
  F.plane(w, h, M.tex('pt' + seed, TX.painting(seed), { roughness: .6 }), 0, 0, .12);
}

// ================= YASHIRINISH JOYLARI =================
// Har biri: dinamik guruh (silkinadi), to'qnashuv qutisi, yaqinlashish nuqtasi.
const HIDE_INFO = {
  box: { name: 'Karton quti', r: 1.6 }, boot: { name: 'Etik', r: 1.5 }, pot: { name: 'Gul tuvak', r: 1.7 },
  basket: { name: 'Kir savat', r: 1.7 }, mouse: { name: 'Sichqon ini', r: .4 }, umbrella: { name: 'Soyabon idishi', r: 1.2 },
  chest: { name: "O'yinchoq sandiq", r: 2.0 }, cheese: { name: 'Katta pishloq', r: 2.0 }, jar: { name: 'Pechenye idishi', r: 1.4 },
  bin: { name: 'Chiqindi savat', r: 1.3 }, slipper: { name: 'Shippak', r: 1.4 }, teapot: { name: 'Choynak', r: 1.7 },
  vase: { name: 'Katta vaza', r: 1.6 }, pillows: { name: 'Yostiqlar', r: 1.9 },
};
const HB = {
  box(g) {
    const c = M.paint('#c49a6c', .9), d = M.paint('#a87d50', .9);
    add(g, new THREE.BoxGeometry(3, .1, 3), c, 0, .05, 0); add(g, new THREE.BoxGeometry(3, 2.8, .1), c, 0, 1.4, -1.45);
    add(g, new THREE.BoxGeometry(.1, 2.8, 3), c, -1.45, 1.4, 0); add(g, new THREE.BoxGeometry(.1, 2.8, 3), c, 1.45, 1.4, 0);
    add(g, new THREE.BoxGeometry(3, .1, 3), c, 0, 2.8, 0);
    const f1 = add(g, new THREE.BoxGeometry(1.5, .08, 1.4), d, -.8, 2.9, 1.9); f1.rotation.x = .9;
    const f2 = add(g, new THREE.BoxGeometry(3, 1.2, .08), d, 0, .3, 1.8); f2.rotation.x = 1.2;
    add(g, new THREE.BoxGeometry(2.8, 2.6, 2.6), M.paint('#24170c', 1), 0, 1.4, -.1);
    add(g, new THREE.BoxGeometry(1, .5, .02), M.paint('#c62828'), .6, 2.2, 1.51);
  },
  boot(g) {
    const l = M.lea('#5d4037');
    add(g, new THREE.CylinderGeometry(1.0, 1.05, 3.2, 20), l, 0, 1.6, -.6);
    const foot = add(g, new THREE.SphereGeometry(1.1, 20, 14), l, 0, .6, .7); foot.scale.set(1, .55, 1.6);
    add(g, new THREE.CylinderGeometry(.85, .85, .05, 20), M.paint('#120a05'), 0, 3.2, -.6);
    add(g, new THREE.TorusGeometry(1.02, .08, 8, 24), M.lea('#3e2723'), 0, 3.15, -.6).rotation.x = Math.PI / 2;
    add(g, new THREE.BoxGeometry(.9, .7, .05), M.paint('#120a05'), 0, .7, 2.38);
  },
  pot(g) {
    const p = M.cer('#d2691e');
    add(g, new THREE.LatheGeometry([[0, 0], [1.3, 0], [1.6, 2.4], [1.75, 2.6], [0, 2.6]].map(a => new THREE.Vector2(a[0], a[1])), 28), p, 0, 0, 0);
    for (let i = 0; i < 9; i++) { const m = add(g, new THREE.SphereGeometry(.8, 10, 8), M.leaf(i % 2 ? '#43a047' : '#2e7d32'), Math.sin(i * 2.4) * .8, 3.1 + (i % 3) * .5, Math.cos(i * 2.4) * .8); m.scale.set(1, .7, 1); }
    const d = add(g, new THREE.CircleGeometry(.55, 20, 0, Math.PI), M.paint('#120a05'), 0, .05, 1.52); d.rotation.x = -.05;
    add(g, new THREE.TorusGeometry(.55, .07, 6, 16, Math.PI), M.wood('#8d6e63', .6), 0, .05, 1.53);
  },
  basket(g) {
    const w = M.wood('#c9a26a', .85);
    add(g, new THREE.CylinderGeometry(1.7, 1.4, 2.8, 24, 1, true), w, 0, 1.4, 0).material.side = THREE.DoubleSide;
    add(g, new THREE.CylinderGeometry(1.4, 1.4, .1, 24), w, 0, .05, 0);
    for (let i = 0; i < 6; i++) add(g, new THREE.TorusGeometry(1.45 + i * .05, .05, 6, 28), M.wood('#a8824a', .9), 0, .3 + i * .45, 0).rotation.x = Math.PI / 2;
    add(g, new THREE.SphereGeometry(1.3, 16, 10), M.fab('#90caf9'), 0, 2.6, 0).scale.set(1.1, .5, 1.1);
    const s = add(g, new THREE.BoxGeometry(.9, .1, 2.4), M.fab('#f48fb1'), 1.2, 2.2, .6); s.rotation.z = -1.1;
  },
  mouse(g) {
    add(g, new THREE.CircleGeometry(.95, 24, 0, Math.PI), M.paint('#0a0603', 1), 0, 0, .02);
    const a = add(g, new THREE.TorusGeometry(1.05, .14, 8, 24, Math.PI), M.wood('#7a4a26', .6), 0, 0, .06);
    a.userData.noShadow = true;
    add(g, new THREE.BoxGeometry(1.5, .04, .9), M.fab('#c62828'), 0, .02, .55);
    add(g, new THREE.BoxGeometry(.5, .25, .05), M.paint('#fff8e1'), .9, 1.5, .06);
  },
  umbrella(g) {
    add(g, new THREE.CylinderGeometry(1.1, 1.0, 3.2, 20, 1, true), M.cer('#455a64'), 0, 1.6, 0).material.side = THREE.DoubleSide;
    add(g, new THREE.CylinderGeometry(1.0, 1.0, .1, 20), M.cer('#37474f'), 0, .05, 0);
    const cs = ['#c62828', '#1565c0', '#2e7d32'];
    for (let i = 0; i < 3; i++) {
      const u = add(g, new THREE.ConeGeometry(.45, 4.2, 8), M.fab(cs[i]), (i - 1) * .45, 3.4, (i % 2) * .3 - .2); u.rotation.z = (i - 1) * .15;
      add(g, new THREE.TorusGeometry(.35, .08, 6, 12, Math.PI), M.wood('#5d4037', .4), (i - 1) * .55, 5.7, (i % 2) * .3 - .2);
    }
  },
  chest(g) {
    const w = M.wood('#e53935', .5);
    add(g, new THREE.BoxGeometry(4, 2.4, 2.6), w, 0, 1.2, 0);
    const lid = add(g, new THREE.BoxGeometry(4.1, .4, 2.7), M.wood('#1e88e5', .5), 0, 2.6, -.3); lid.rotation.x = -.35;
    add(g, new THREE.BoxGeometry(3.6, .3, 2.2), M.paint('#24170c', 1), 0, 2.3, 0);
    for (const s of [-1, 1]) add(g, new THREE.BoxGeometry(.3, 2.5, 2.7), M.wood('#fdd835', .5), s * 1.6, 1.2, 0);
    add(g, new THREE.SphereGeometry(.5, 12, 10), M.plastic('#43a047'), -.8, 2.8, .2);
  },
  cheese(g) {
    const ch = M.tex('cheeseM', { map: null }, { color: '#ffcf3a', roughness: .55, emissive: '#3a2800', emissiveIntensity: .2 });
    add(g, new THREE.CylinderGeometry(2, 2, 1.8, 32, 1, false, .6, Math.PI * 2 - 1.2), ch, 0, .9, 0);
    add(g, new THREE.PlaneGeometry(2, 1.8), ch, Math.sin(.6) * 1, .9, Math.cos(.6) * 1).rotation.y = .6 - Math.PI / 2;
    add(g, new THREE.PlaneGeometry(2, 1.8), ch, Math.sin(-.6) * 1, .9, Math.cos(-.6) * 1).rotation.y = -.6 + Math.PI / 2;
    for (let i = 0; i < 9; i++) { const a = i * 1.7 + 1; add(g, new THREE.SphereGeometry(.22 + (i % 3) * .1, 10, 8), M.paint('#d9a400', .7), Math.sin(a) * 2, .4 + (i % 3) * .5, Math.cos(a) * 2); }
    add(g, new THREE.CircleGeometry(.6, 16, 0, Math.PI), M.paint('#2a1a00', 1), 0, .1, 1.3).rotation.y = 0;
  },
  jar(g) {
    add(g, new THREE.LatheGeometry([[0, 0], [1.2, 0], [1.4, 1.6], [1.0, 2.4], [1.0, 2.6], [0, 2.6]].map(a => new THREE.Vector2(a[0], a[1])), 28), M.cer('#f3e5c8'), 0, 0, 0);
    const lid = add(g, new THREE.SphereGeometry(1.05, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.cer('#d84315'), .9, .5, 1.2); lid.rotation.x = 1.3;
    for (let i = 0; i < 4; i++) add(g, new THREE.CylinderGeometry(.45, .45, .15, 16), M.paint('#a1673b', .8), Math.sin(i) * .9, .1 + i * .05, 1.6 + Math.cos(i) * .3);
    add(g, new THREE.BoxGeometry(1.2, .8, .05), M.paint('#1a0f05'), 0, .5, 1.25);
  },
  bin(g) {
    add(g, new THREE.CylinderGeometry(1.25, 1.0, 2.4, 20, 1, true), M.metal('#9aa3ab', .4), 0, 1.2, 0).material.side = THREE.DoubleSide;
    add(g, new THREE.CylinderGeometry(1.0, 1.0, .08, 20), M.metal('#7d868e', .4), 0, .04, 0);
    for (let i = 0; i < 6; i++) add(g, new THREE.IcosahedronGeometry(.45, 0), M.paint('#f5f5f5', .9), Math.sin(i * 2) * .6, 2.1 + (i % 2) * .3, Math.cos(i * 2) * .6);
  },
  slipper(g) {
    const s = add(g, new THREE.SphereGeometry(1, 20, 14), M.velvet('#f06292'), 0, .55, 0); s.scale.set(1.2, .55, 2.3);
    const t = add(g, new THREE.SphereGeometry(1, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), M.velvet('#ffffff'), 0, .7, 1.1); t.scale.set(1.25, .9, 1.1);
    add(g, new THREE.SphereGeometry(.45, 12, 10), M.velvet('#ffffff'), 0, 1.5, 1.4);
    add(g, new THREE.CircleGeometry(.7, 16), M.paint('#120a05'), 0, .7, -2.25).rotation.y = Math.PI;
  },
  teapot(g) {
    const c = M.cer('#4fc3f7');
    add(g, new THREE.LatheGeometry([[0, 0], [1.2, 0], [1.75, 1.2], [1.4, 2.4], [.6, 2.7], [0, 2.7]].map(a => new THREE.Vector2(a[0], a[1])), 28), c, 0, 0, 0);
    const sp = add(g, new THREE.CylinderGeometry(.18, .35, 2, 10), c, 0, 1.8, 2.0); sp.rotation.x = .9;
    add(g, new THREE.TorusGeometry(.7, .16, 8, 16, Math.PI * 1.2), c, 0, 1.6, -1.7).rotation.y = Math.PI / 2;
    add(g, new THREE.SphereGeometry(.25, 12, 8), M.cer('#fff'), 0, 2.95, 0);
    add(g, new THREE.CircleGeometry(.6, 16), M.paint('#0a0603'), 0, .9, 1.62);
  },
  vase(g) {
    add(g, new THREE.LatheGeometry([[0, 0], [.9, 0], [1.5, 1.4], [1.2, 2.8], [.6, 3.6], [.9, 4.2], [0, 4.2]].map(a => new THREE.Vector2(a[0], a[1])), 32), M.cer('#1e5ba8'), 0, 0, 0);
    add(g, new THREE.TorusGeometry(1.42, .05, 6, 32), M.cer('#f5f5f5'), 0, 1.6, 0).rotation.x = Math.PI / 2;
    add(g, new THREE.CircleGeometry(.5, 16), M.paint('#0a0603'), 0, .6, 1.12);
  },
  pillows(g) {
    const cs = ['#ef9a9a', '#90caf9', '#fff59d', '#a5d6a7'];
    for (let i = 0; i < 5; i++) { const p = add(g, new THREE.SphereGeometry(1.1, 16, 10), M.velvet(cs[i % 4]), (i % 3 - 1) * 1.1, .5 + Math.floor(i / 3) * .8, (i % 2) * .6 - .6); p.scale.set(1.3, .5, 1.1); p.rotation.y = i; }
  },
};
function add(g, geo, mat, x, y, z) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; }

// F — ramka; x,z — lokal joy; face — teshik qaragan lokal tomon (0: +z)
export function hide(F, type, x = 0, z = 0, face = 0) {
  const info = HIDE_INFO[type];
  const g = new THREE.Group();
  HB[type](g);
  const inner = new THREE.Group(); inner.add(...g.children.slice()); g.add(inner);
  inner.traverse(o => { if (o.isMesh) { o.castShadow = !o.userData.noShadow; } });
  mergeChildren(inner);
  const ang = (F.rot + face) * Math.PI / 2;
  const [cx, cz] = F.tr(x, z);
  g.position.set(cx, 0, cz); g.rotation.y = ang;
  g.traverse(o => { if (o.isMesh) { o.castShadow = !o.userData.noShadow; o.receiveShadow = true; } });
  B.scene.add(g);
  const dx = Math.sin(ang), dz = Math.cos(ang);
  const reach = info.r + 1.0;
  if (type !== 'mouse') {
    const r = info.r * .85;
    B.colliders.push({ minX: cx - r, maxX: cx + r, minY: 0, maxY: type === 'umbrella' ? 6 : 3, minZ: cz - r, maxZ: cz + r, tag: 'hide' });
  }
  const h = { id: B.hides.length, type, name: info.name, x: cx, z: cz, ax: cx + dx * reach, az: cz + dz * reach, dir: ang, room: B.room, group: g, inner, wob: 0 };
  B.hides.push(h);
  return h;
}
export const HIDE_NAMES = HIDE_INFO;
