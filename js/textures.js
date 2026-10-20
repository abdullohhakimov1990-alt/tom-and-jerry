// Protsedural teksturalar (rang + normal xarita) — canvas orqali chiziladi.
import * as THREE from 'three';

export function rng(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

let ANISO = 8;
const REPEAT = { fabric: 3, woodgrain: 2, leather: 4 };
export const setAniso = a => { ANISO = a; };
const cache = new Map();

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h || w; return c; }
function tex(c, color = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = ANISO;
  return t;
}
export function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
export function mixHex(a, b, t, jitter = 0, r = Math.random) {
  const A = hexRgb(a), B = hexRgb(b), j = (r() - .5) * jitter;
  const c = A.map((v, i) => Math.max(0, Math.min(255, Math.round(v + (B[i] - v) * t + j * 255))));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
function gray(v) { v = Math.max(0, Math.min(255, v | 0)); return `rgb(${v},${v},${v})`; }

export function normalFromHeight(hc, strength) {
  const w = hc.width, h = hc.height;
  const src = hc.getContext('2d').getImageData(0, 0, w, h).data;
  const out = canvas(w, h), og = out.getContext('2d');
  const img = og.createImageData(w, h), d = img.data;
  for (let y = 0; y < h; y++) {
    const ym = ((y - 1 + h) % h) * w, yp = ((y + 1) % h) * w, yc = y * w;
    for (let x = 0; x < w; x++) {
      const xm = (x - 1 + w) % w, xp = (x + 1) % w;
      const dx = (src[(yc + xm) * 4] - src[(yc + xp) * 4]) / 255 * strength;
      const dy = (src[(yp + x) * 4] - src[(ym + x) * 4]) / 255 * strength;
      const inv = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const i = (yc + x) * 4;
      d[i] = (dx * inv * .5 + .5) * 255; d[i + 1] = (dy * inv * .5 + .5) * 255; d[i + 2] = (inv * .5 + .5) * 255; d[i + 3] = 255;
    }
  }
  og.putImageData(img, 0, 0);
  return out;
}

// draw(g, hg, S, r) — g: rang, hg: balandlik (kulrang)
function make(key, size, draw, nStr) {
  if (cache.has(key)) return cache.get(key);
  const c = canvas(size), h = canvas(size);
  const g = c.getContext('2d'), hg = h.getContext('2d');
  hg.fillStyle = gray(128); hg.fillRect(0, 0, size, size);
  draw(g, hg, size, rng(hash(key)));
  const res = { map: tex(c), normalMap: nStr ? tex(normalFromHeight(h, nStr), false) : null };
  const rep = REPEAT[key.replace(/[#0-9a-f]+$/i, '')];
  if (rep) { res.map.repeat.set(rep, rep); if (res.normalMap) res.normalMap.repeat.set(rep, rep); }
  cache.set(key, res);
  return res;
}
// chegaradan o'tganda qaytadan chizish (choksiz)
function wrapRect(g, x, y, w, h, S) {
  for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
    if (x + ox + w < 0 || x + ox > S || y + oy + h < 0 || y + oy > S) continue;
    g.fillRect(x + ox, y + oy, w, h);
  }
}
let _nt = null;
function noiseTiles() {
  if (_nt) return _nt;
  const r = rng(99), c = canvas(128), h = canvas(128), g = c.getContext('2d'), hg = h.getContext('2d');
  const id = g.createImageData(128, 128), ih = hg.createImageData(128, 128);
  for (let i = 0; i < 128 * 128; i++) {
    const v = r(), w = r() < .5;
    id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = w ? 255 : 0; id.data[i * 4 + 3] = v * 40;
    const hv = 70 + r() * 140; ih.data[i * 4] = ih.data[i * 4 + 1] = ih.data[i * 4 + 2] = hv; ih.data[i * 4 + 3] = 255;
  }
  g.putImageData(id, 0, 0); hg.putImageData(ih, 0, 0);
  return (_nt = { c, h });
}
// tez shovqin: kichik plitkani naqsh sifatida takrorlash
function fastNoise(g, S, alpha, hg) {
  const nt = noiseTiles();
  g.save(); g.globalAlpha = alpha * 2.5; g.fillStyle = g.createPattern(nt.c, 'repeat'); g.fillRect(0, 0, S, S); g.restore();
  if (hg) { hg.save(); hg.globalAlpha = .55; hg.fillStyle = hg.createPattern(nt.h, 'repeat'); hg.fillRect(0, 0, S, S); hg.restore(); }
}
function noise(g, S, n, r, alpha, light) {
  if (n > 3000 && light !== false) { fastNoise(g, S, alpha); return; }
  for (let i = 0; i < n; i++) {
    g.fillStyle = (r() < .5 ? 'rgba(0,0,0,' : 'rgba(255,255,255,') + (alpha * r()) + ')';
    if (light === false) g.fillStyle = 'rgba(0,0,0,' + (alpha * r()) + ')';
    g.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2);
  }
}

// ---------------- POLLAR ----------------
export function planks(c1, c2, n = 6) {
  return make('planks' + c1 + c2 + n, 1024, (g, hg, S, r) => {
    const pw = S / n;
    for (let i = 0; i < n; i++) {
      let y = -r() * S;
      const end = y + S;
      while (y < end) {
        const len = S * (0.3 + r() * 0.45);
        g.fillStyle = mixHex(c1, c2, r(), .06, r);
        wrapRect(g, i * pw, y, pw, len, S);
        // tolalar
        for (let k = 0; k < 26; k++) {
          const x0 = i * pw + r() * pw, a = .04 + r() * .08;
          g.strokeStyle = r() < .6 ? `rgba(40,20,5,${a})` : `rgba(255,230,190,${a * .7})`;
          g.lineWidth = .6 + r() * 1.8;
          g.beginPath();
          for (let s = 0; s <= 1; s += .1) {
            const yy = y + s * len, xx = x0 + Math.sin(s * 6 + k) * (2 + r() * 2);
            s === 0 ? g.moveTo(xx, yy) : g.lineTo(xx, yy);
          }
          g.stroke();
          g.save(); g.translate(0, S); g.stroke(); g.restore();
          g.save(); g.translate(0, -S); g.stroke(); g.restore();
        }
        if (r() < .35) { // tugun
          const kx = i * pw + pw * (.25 + r() * .5), ky = y + len * r();
          const gr = g.createRadialGradient(kx, ky, 1, kx, ky, 10 + r() * 8);
          gr.addColorStop(0, 'rgba(50,25,8,.55)'); gr.addColorStop(1, 'rgba(50,25,8,0)');
          g.fillStyle = gr; g.beginPath(); g.ellipse(kx, ky, 8, 16, 0, 0, 7); g.fill();
        }
        hg.fillStyle = gray(190 + r() * 40); wrapRect(hg, i * pw + 2, y + 2, pw - 4, len - 4, S);
        g.fillStyle = 'rgba(20,10,0,.55)'; wrapRect(g, i * pw, y, pw, 2, S);
        hg.fillStyle = gray(40); wrapRect(hg, i * pw, y, pw, 3, S);
        y += len;
      }
      g.fillStyle = 'rgba(20,10,0,.6)'; g.fillRect(i * pw, 0, 2, S);
      hg.fillStyle = gray(30); hg.fillRect(i * pw, 0, 3, S);
    }
    // lak yaltirashi
    const gr = g.createLinearGradient(0, 0, S, S);
    gr.addColorStop(0, 'rgba(255,255,255,.04)'); gr.addColorStop(.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,.04)');
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
  }, 3);
}

export function parquet(c1, c2) {
  return make('parq' + c1 + c2, 1024, (g, hg, S, r) => {
    const n = 4, s = S / n, k = 4, w = s / k;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const hor = (i + j) % 2 === 0;
      for (let p = 0; p < k; p++) {
        const x = hor ? i * s : i * s + p * w, y = hor ? j * s + p * w : j * s, ww = hor ? s : w, hh = hor ? w : s;
        g.fillStyle = mixHex(c1, c2, r(), .05, r); g.fillRect(x, y, ww, hh);
        for (let t = 0; t < 7; t++) {
          g.fillStyle = `rgba(50,25,8,${.04 + r() * .07})`;
          if (hor) g.fillRect(x, y + r() * hh, ww, 1 + r()); else g.fillRect(x + r() * ww, y, 1 + r(), hh);
        }
        g.strokeStyle = 'rgba(20,10,0,.55)'; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, ww - 2, hh - 2);
        hg.fillStyle = gray(60); hg.fillRect(x, y, ww, hh);
        hg.fillStyle = gray(195 + r() * 40); hg.fillRect(x + 2, y + 2, ww - 4, hh - 4);
      }
    }
  }, 2.5);
}

export function tiles(c1, c2, n = 6, checker = true, grout = '#cfc8bc') {
  return make('tiles' + c1 + c2 + n + checker + grout, 1024, (g, hg, S, r) => {
    const s = S / n, gw = Math.max(3, s * .045);
    g.fillStyle = grout; g.fillRect(0, 0, S, S);
    hg.fillStyle = gray(50); hg.fillRect(0, 0, S, S);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const base = checker ? ((i + j) % 2 ? c2 : c1) : (r() < .5 ? c1 : c2);
      g.fillStyle = mixHex(base, base, 0, .04, r);
      g.fillRect(i * s + gw / 2, j * s + gw / 2, s - gw, s - gw);
      const gr = g.createLinearGradient(i * s, j * s, i * s + s, j * s + s);
      gr.addColorStop(0, 'rgba(255,255,255,.12)'); gr.addColorStop(.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,.08)');
      g.fillStyle = gr; g.fillRect(i * s + gw / 2, j * s + gw / 2, s - gw, s - gw);
      hg.fillStyle = gray(150); hg.fillRect(i * s + gw / 2, j * s + gw / 2, s - gw, s - gw);
      hg.fillStyle = gray(225); hg.fillRect(i * s + gw * 1.3, j * s + gw * 1.3, s - gw * 2.6, s - gw * 2.6);
    }
    noise(g, S, 6000, r, .05);
  }, 2.2);
}

export function carpet(c1, c2, c3) {
  return make('carpet' + c1 + c2 + c3, 1024, (g, hg, S, r) => {
    g.fillStyle = c1; g.fillRect(0, 0, S, S);
    g.strokeStyle = c2; g.lineWidth = 26; g.strokeRect(40, 40, S - 80, S - 80);
    g.strokeStyle = c3; g.lineWidth = 8; g.strokeRect(80, 80, S - 160, S - 160);
    g.fillStyle = c2;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const x = 192 + i * 213, y = 192 + j * 213;
      if (i > 0 && i < 3 && j > 0 && j < 3) continue;
      g.save(); g.translate(x - 85, y - 85); g.rotate(Math.PI / 4); g.fillRect(-26, -26, 52, 52); g.restore();
    }
    g.save(); g.translate(S / 2, S / 2);
    for (let k = 0; k < 12; k++) { g.rotate(Math.PI / 6); g.fillStyle = k % 2 ? c2 : c3; g.beginPath(); g.ellipse(0, 90, 30, 80, 0, 0, 7); g.fill(); }
    g.fillStyle = c3; g.beginPath(); g.arc(0, 0, 60, 0, 7); g.fill();
    g.fillStyle = c1; g.beginPath(); g.arc(0, 0, 34, 0, 7); g.fill();
    g.restore();
    fastNoise(g, S, .12, hg); g.save(); g.scale(2, 2); fastNoise(g, S, .06); g.restore();
  }, 1.4);
}

export function stone(c1, c2) {
  return make('stone' + c1 + c2, 1024, (g, hg, S, r) => {
    g.fillStyle = '#6d665c'; g.fillRect(0, 0, S, S);
    hg.fillStyle = gray(40); hg.fillRect(0, 0, S, S);
    const rows = 5, rh = S / rows;
    for (let j = 0; j < rows; j++) {
      let x = -r() * 150;
      while (x < S) {
        const w = 130 + r() * 170;
        g.fillStyle = mixHex(c1, c2, r(), .08, r);
        const rr = 14;
        for (const o of [0, S]) {
          g.beginPath(); g.roundRect(x + 5 - o, j * rh + 5, w - 10, rh - 10, rr); g.fill();
          hg.fillStyle = gray(170 + r() * 60); hg.beginPath(); hg.roundRect(x + 6 - o, j * rh + 6, w - 12, rh - 12, rr); hg.fill();
        }
        x += w;
      }
    }
    noise(g, S, 30000, r, .12);
  }, 2.5);
}

export function concrete() {
  return make('concrete', 512, (g, hg, S, r) => {
    g.fillStyle = '#9a958c'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 40; i++) {
      const x = r() * S, y = r() * S, rad = 20 + r() * 80;
      const gr = g.createRadialGradient(x, y, 1, x, y, rad);
      gr.addColorStop(0, `rgba(${r() < .5 ? '60,55,50' : '200,195,185'},${.12 * r()})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    noise(g, S, 20000, r, .1);
    fastNoise(hg, S, .2);
  }, 1);
}

// ---------------- DEVORLAR ----------------
export function wallpaper(c1, c2, type) {
  return make('wp' + c1 + c2 + type, 512, (g, hg, S, r) => {
    g.fillStyle = c1; g.fillRect(0, 0, S, S);
    g.fillStyle = c2; hg.fillStyle = gray(165);
    const both = f => { f(g); f(hg); };
    if (type === 'stripes') {
      for (let x = 0; x < S; x += 64) { g.fillRect(x, 0, 26, S); g.fillRect(x + 36, 0, 4, S); hg.fillRect(x, 0, 26, S); }
    } else if (type === 'damask') {
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
        const x = i * 128 + (j % 2) * 64, y = j * 128;
        both(c => {
          c.save(); c.translate(x, y + 64);
          for (const sx of [-1, 1]) {
            c.beginPath(); c.moveTo(0, -48); c.bezierCurveTo(sx * 40, -36, sx * 36, 0, sx * 10, 6);
            c.bezierCurveTo(sx * 34, 14, sx * 30, 44, 0, 50); c.closePath(); c.fill();
          }
          c.beginPath(); c.arc(0, -58, 7, 0, 7); c.fill();
          c.restore();
        });
      }
    } else if (type === 'dots') {
      for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) both(c => { c.beginPath(); c.arc(i * 64 + (j % 2) * 32 + 16, j * 64 + 16, 9, 0, 7); c.fill(); });
    } else if (type === 'diamonds') {
      for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) both(c => {
        const x = i * 64 + 32, y = j * 64 + 32;
        c.beginPath(); c.moveTo(x, y - 26); c.lineTo(x + 18, y); c.lineTo(x, y + 26); c.lineTo(x - 18, y); c.closePath(); c.fill();
      });
    } else if (type === 'floral') {
      for (let k = 0; k < 18; k++) {
        const x = r() * S, y = r() * S;
        for (const o of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) both(c => {
          c.save(); c.translate(x + o[0], y + o[1]);
          for (let p = 0; p < 5; p++) { c.rotate(Math.PI * 2 / 5); c.beginPath(); c.ellipse(0, 14, 8, 15, 0, 0, 7); c.fill(); }
          c.restore();
        });
      }
    } else if (type === 'checks') {
      g.globalAlpha = .5; for (let x = 0; x < S; x += 64) { g.fillRect(x, 0, 22, S); g.fillRect(0, x, S, 22); } g.globalAlpha = 1;
    }
    noise(g, S, 9000, r, .05);
  }, .9);
}

export function panel(c) {
  return make('panel' + c, 512, (g, hg, S, r) => {
    g.fillStyle = c; g.fillRect(0, 0, S, S);
    hg.fillStyle = gray(120); hg.fillRect(0, 0, S, S);
    const m = 46;
    const gr = hg.createLinearGradient(0, 0, 0, S);
    for (let k = 0; k < 6; k++) {
      hg.fillStyle = gray(150 + k * 14);
      hg.fillRect(m + k * 4, m + k * 4, S - (m + k * 4) * 2, S - (m + k * 4) * 2);
    }
    void gr;
    g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(m, m, S - m * 2, 6); g.fillRect(m, m, 6, S - m * 2);
    g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(m, S - m - 6, S - m * 2, 6); g.fillRect(S - m - 6, m, 6, S - m * 2);
    noise(g, S, 5000, r, .04);
  }, 3);
}

export function plaster() {
  return make('plaster', 512, (g, hg, S, r) => {
    g.fillStyle = '#f4efe6'; g.fillRect(0, 0, S, S);
    noise(g, S, 12000, r, .05);
    fastNoise(hg, S, .15);
  }, .7);
}

// ---------------- MEBELLAR ----------------
export function woodGrain() {
  return make('woodgrain', 512, (g, hg, S, r) => {
    g.fillStyle = '#e9e4dc'; g.fillRect(0, 0, S, S);
    for (let k = 0; k < 120; k++) {
      const y0 = r() * S, a = .05 + r() * .12;
      g.strokeStyle = `rgba(90,60,30,${a})`; g.lineWidth = .7 + r() * 2.5;
      g.beginPath();
      for (let x = 0; x <= S; x += 16) { const y = y0 + Math.sin(x * .012 + k) * 6 + Math.sin(x * .05 + k * 3) * 1.5; x === 0 ? g.moveTo(x, y) : g.lineTo(x, y); }
      g.stroke();
      hg.strokeStyle = gray(110); hg.lineWidth = g.lineWidth * .6; hg.beginPath();
      for (let x = 0; x <= S; x += 16) { const y = y0 + Math.sin(x * .012 + k) * 6; x === 0 ? hg.moveTo(x, y) : hg.lineTo(x, y); }
      hg.stroke();
    }
  }, .8);
}
export function fabric() {
  return make('fabric', 256, (g, hg, S, r) => {
    g.fillStyle = '#eeeeee'; g.fillRect(0, 0, S, S);
    for (let y = 0; y < S; y += 4) for (let x = 0; x < S; x += 4) {
      const v = ((x + y) / 4) % 2 ? 238 : 246;
      g.fillStyle = gray(v - r() * 8); g.fillRect(x, y, 4, 4);
      hg.fillStyle = gray(((x / 4 + y / 4) % 2 ? 90 : 170) + r() * 20); hg.fillRect(x, y, 4, 4);
    }
  }, 1.6);
}
export function leather() {
  return make('leather', 256, (g, hg, S, r) => {
    g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, S, S);
    noise(g, S, 4000, r, .1);
    for (let i = 0; i < 2500; i++) { hg.fillStyle = gray(100 + r() * 70); hg.beginPath(); hg.arc(r() * S, r() * S, 1 + r() * 3, 0, 7); hg.fill(); }
  }, 1.2);
}
export function marble(c = '#f2efea') {
  return make('marble' + c, 512, (g, hg, S, r) => {
    g.fillStyle = c; g.fillRect(0, 0, S, S);
    for (let k = 0; k < 18; k++) {
      g.strokeStyle = `rgba(120,115,110,${.08 + r() * .15})`; g.lineWidth = .5 + r() * 2.5;
      let x = r() * S, y = 0; g.beginPath(); g.moveTo(x, y);
      while (y < S) { x += (r() - .5) * 40; y += 10 + r() * 30; g.lineTo(x, y); }
      g.stroke();
    }
  }, 0);
}
export function grass() {
  return make('grass', 512, (g, hg, S, r) => {
    g.fillStyle = '#5c9a3a'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 3000; i++) { g.fillStyle = `hsl(${85 + r() * 30},${45 + r() * 25}%,${25 + r() * 25}%)`; g.fillRect(r() * S, r() * S, 2, 4 + r() * 5); }
    fastNoise(g, S, .15);
  }, 0);
}

export function bookSpines(seed = 1) {
  const key = 'books' + seed;
  if (cache.has(key)) return cache.get(key);
  const c = canvas(1024, 256), g = c.getContext('2d'), r = rng(seed * 977);
  g.fillStyle = '#1c120a'; g.fillRect(0, 0, 1024, 256);
  const cols = ['#7b1f1f', '#1f3d7b', '#1f5b33', '#8a6a1c', '#4a1f6b', '#165a5a', '#3b2a1a', '#a33d22', '#2a2a2a', '#c9b98f'];
  let x = 4;
  while (x < 1020) {
    const w = 18 + r() * 30, h = 170 + r() * 80, col = cols[Math.floor(r() * cols.length)];
    const lean = r() < .08;
    g.save(); g.translate(x, 256);
    if (lean) g.rotate(-.12);
    g.fillStyle = col; g.fillRect(0, -h, w, h);
    const gr = g.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, 'rgba(0,0,0,.35)'); gr.addColorStop(.3, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(0,0,0,.4)');
    g.fillStyle = gr; g.fillRect(0, -h, w, h);
    g.fillStyle = r() < .5 ? '#d4af37' : '#e8e0c8';
    g.fillRect(2, -h + 14, w - 4, 3); g.fillRect(2, -24, w - 4, 3);
    for (let t = 0; t < 3; t++) g.fillRect(w * .3, -h + 40 + t * 12, w * .4, 4);
    g.restore();
    x += w + 1 + (lean ? 8 : 0);
  }
  const res = { map: tex(c) };
  cache.set(key, res);
  return res;
}

export function painting(seed) {
  const key = 'paint' + seed;
  if (cache.has(key)) return cache.get(key);
  const W = 512, H = 384, c = canvas(W, H), g = c.getContext('2d'), r = rng(seed * 131);
  const sky = g.createLinearGradient(0, 0, 0, H * .7);
  const pal = [['#7ec8ff', '#ffe4b5'], ['#ff9a76', '#ffd8a8'], ['#4a5bbd', '#f5a7c8'], ['#9fe3c9', '#fff6c2']][seed % 4];
  sky.addColorStop(0, pal[0]); sky.addColorStop(1, pal[1]); g.fillStyle = sky; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,250,220,.95)'; g.beginPath(); g.arc(80 + r() * 350, 60 + r() * 80, 26 + r() * 20, 0, 7); g.fill();
  for (let L = 0; L < 4; L++) {
    g.fillStyle = `hsl(${120 + L * 25 + r() * 40},${30 + L * 8}%,${55 - L * 11}%)`;
    g.beginPath(); g.moveTo(0, H);
    let y = H * (.45 + L * .12);
    for (let x = 0; x <= W; x += 16) { y += (r() - .5) * 22; g.lineTo(x, y); }
    g.lineTo(W, H); g.closePath(); g.fill();
  }
  for (let i = 0; i < 9; i++) {
    const x = r() * W, y = H * .7 + r() * H * .25;
    g.fillStyle = '#3b2a1a'; g.fillRect(x - 3, y - 20, 6, 22);
    g.fillStyle = `hsl(${100 + r() * 40},50%,${25 + r() * 15}%)`; g.beginPath(); g.arc(x, y - 30, 16 + r() * 8, 0, 7); g.fill();
  }
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${r() < .5 ? '0,0,0' : '255,255,255'},.05)`; g.fillRect(r() * W, r() * H, 3, 2); }
  const res = { map: tex(c) };
  cache.set(key, res);
  return res;
}

export function tvScreen() {
  const key = 'tv'; if (cache.has(key)) return cache.get(key);
  const W = 512, H = 288, c = canvas(W, H), g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#5ec8ff'); sky.addColorStop(1, '#c8f0ff');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  g.fillStyle = '#6cc04a'; g.beginPath(); g.ellipse(W / 2, H + 60, W * .8, 150, 0, 0, 7); g.fill();
  g.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(60 + i * 130, 50 + (i % 2) * 20, 22, 0, 7); g.arc(85 + i * 130, 45 + (i % 2) * 20, 28, 0, 7); g.arc(110 + i * 130, 52 + (i % 2) * 20, 20, 0, 7); g.fill(); }
  g.fillStyle = '#ffd23f'; g.font = 'bold 54px sans-serif'; g.textAlign = 'center';
  g.strokeStyle = '#a3280e'; g.lineWidth = 8; g.strokeText('QUVLASHMACHOQ', W / 2, H * .62); g.fillText('QUVLASHMACHOQ', W / 2, H * .62);
  const res = { map: tex(c) }; cache.set(key, res); return res;
}

// ---------------- SKIN TEKSTURALARI ----------------
export function galaxy() {
  return make('galaxy', 512, (g, hg, S, r) => {
    const gr = g.createLinearGradient(0, 0, S, S); gr.addColorStop(0, '#0b0030'); gr.addColorStop(.5, '#2a0a5e'); gr.addColorStop(1, '#03163d');
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 26; i++) {
      const x = r() * S, y = r() * S, rad = 40 + r() * 120;
      const n = g.createRadialGradient(x, y, 1, x, y, rad);
      n.addColorStop(0, ['rgba(255,60,200,.35)', 'rgba(60,140,255,.35)', 'rgba(150,80,255,.35)'][i % 3]); n.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = n; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    for (let i = 0; i < 900; i++) { const s = r(); g.fillStyle = `rgba(255,255,255,${.4 + s * .6})`; g.fillRect(r() * S, r() * S, s < .95 ? 1.2 : 2.6, s < .95 ? 1.2 : 2.6); }
  }, 0);
}
export function lava() {
  const key = 'lava'; if (cache.has(key)) return cache.get(key);
  const S = 512, c = canvas(S), e = canvas(S), g = c.getContext('2d'), ge = e.getContext('2d'), r = rng(77);
  g.fillStyle = '#2a1a14'; g.fillRect(0, 0, S, S); ge.fillStyle = '#000'; ge.fillRect(0, 0, S, S);
  noise(g, S, 20000, r, .2);
  for (let k = 0; k < 40; k++) {
    let x = r() * S, y = r() * S;
    const w = 2 + r() * 5;
    for (const ctx of [g, ge]) { ctx.strokeStyle = ctx === g ? '#ff6a00' : '#ffb300'; ctx.lineWidth = w; ctx.lineCap = 'round'; }
    for (let s = 0; s < 8; s++) {
      const nx = x + (r() - .5) * 70, ny = y + (r() - .5) * 70;
      for (const ctx of [g, ge]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(nx, ny); ctx.stroke(); }
      x = nx; y = ny;
    }
  }
  const res = { map: tex(c), emissiveMap: tex(e) }; cache.set(key, res); return res;
}
export function shirt(c1, c2, num) {
  const key = 'shirt' + c1 + c2 + num; if (cache.has(key)) return cache.get(key);
  const c = canvas(512, 256), g = c.getContext('2d');
  g.fillStyle = c1; g.fillRect(0, 0, 512, 256);
  g.fillStyle = c2; for (let x = 0; x < 512; x += 64) g.fillRect(x, 0, 18, 256);
  g.fillStyle = c1; g.fillRect(170, 50, 170, 150);
  g.fillStyle = c2; g.font = 'bold 130px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(num, 256, 128);
  const res = { map: tex(c) }; cache.set(key, res); return res;
}

// yumshoq zarra (chang, uchqun)
export function softDot() {
  const key = 'dot'; if (cache.has(key)) return cache.get(key);
  const c = canvas(64), g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, t); return t;
}
export function petal() {
  const key = 'petal'; if (cache.has(key)) return cache.get(key);
  const c = canvas(64), g = c.getContext('2d');
  g.fillStyle = '#ffb7d0'; g.beginPath(); g.ellipse(32, 32, 14, 26, .6, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(28, 26, 5, 12, .6, 0, 7); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; cache.set(key, t); return t;
}
export function beamGradient() {
  const key = 'beam'; if (cache.has(key)) return cache.get(key);
  const c = canvas(64, 256), g = c.getContext('2d');
  const gv = g.createLinearGradient(0, 0, 0, 256); gv.addColorStop(0, 'rgba(255,255,255,1)'); gv.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gv; g.fillRect(0, 0, 64, 256);
  g.globalCompositeOperation = 'destination-in';
  const gh = g.createLinearGradient(0, 0, 64, 0); gh.addColorStop(0, 'rgba(0,0,0,0)'); gh.addColorStop(.5, 'rgba(0,0,0,1)'); gh.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gh; g.fillRect(0, 0, 64, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; cache.set(key, t); return t;
}
