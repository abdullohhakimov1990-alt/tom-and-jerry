// WebAudio: sintez qilingan effektlar va 11 ta generativ musiqa treki.
import { rng } from './textures.js';

const A = { enabled: true, vol: .8, musVol: .55 };
export const audio = A;
let ctx, master, sfx, mus, musF, noiseBuf, timer = null, track = null, nextT = 0, step = 0, mood = 'chase';

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = A.enabled ? A.vol : 0; master.connect(ctx.destination);
  const comp = ctx.createDynamicsCompressor(); comp.connect(master);
  sfx = ctx.createGain(); sfx.gain.value = .9; sfx.connect(comp);
  musF = ctx.createBiquadFilter(); musF.type = 'lowpass'; musF.frequency.value = 9000; musF.connect(comp);
  mus = ctx.createGain(); mus.gain.value = A.musVol * .5; mus.connect(musF);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}
export function setVolumes(v, m, on) {
  A.vol = v; A.musVol = m; A.enabled = on;
  if (!ctx) return;
  master.gain.setTargetAtTime(on ? v : 0, ctx.currentTime, .05);
  mus.gain.setTargetAtTime(m * .5, ctx.currentTime, .05);
}

function tone(type, f0, f1, dur, vol, when, bus, attack = .008) {
  if (!ctx) return;
  const t = when || ctx.currentTime;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t);
  if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(f1, 20), t + dur);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g); g.connect(bus || sfx); o.start(t); o.stop(t + dur + .05);
}
function noise(dur, vol, freq, q, when, bus, type = 'bandpass') {
  if (!ctx) return;
  const t = when || ctx.currentTime;
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(bus || sfx); s.start(t, Math.random() * .5); s.stop(t + dur + .05);
}

const SFX = {
  step() { noise(.05, .05, 2500, 1.5); },
  jump() { tone('square', 320, 760, .15, .1); },
  land() { noise(.08, .12, 400, 1); },
  cheese() { const t = ctx.currentTime; tone('triangle', 1320, 0, .08, .12, t); tone('triangle', 1760, 0, .12, .1, t + .06); },
  coin() { const t = ctx.currentTime; tone('square', 988, 0, .08, .08, t); tone('square', 1319, 0, .25, .08, t + .08); },
  buy() { const t = ctx.currentTime; [523, 659, 784, 1047, 1319].forEach((f, i) => tone('triangle', f, 0, .16, .12, t + i * .06)); },
  error() { tone('square', 200, 140, .2, .1); },
  click() { tone('square', 820, 0, .04, .06); },
  hide() { tone('sine', 700, 200, .25, .2); noise(.15, .15, 3000, 1); },
  unhide() { tone('sine', 220, 660, .18, .18); },
  spotted() { const t = ctx.currentTime; for (let i = 0; i < 3; i++) { tone('sawtooth', 880, 0, .12, .16, t + i * .24); tone('sawtooth', 660, 0, .12, .16, t + i * .24 + .12); } tone('square', 110, 55, .6, .2, t); },
  found() { const t = ctx.currentTime; tone('sawtooth', 300, 900, .3, .2, t); noise(.3, .3, 800, .7, t); },
  escape() { const t = ctx.currentTime; [392, 523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, 0, .18, .13, t + i * .08)); },
  caught() { const t = ctx.currentTime; [392, 370, 349, 262].forEach((f, i) => tone('sawtooth', f, i === 3 ? 160 : 0, i === 3 ? .8 : .28, .14, t + i * .28)); },
  pounce() { tone('sawtooth', 200, 600, .2, .15); noise(.2, .2, 1500, .8); },
  meow() { tone('sawtooth', 500, 900, .18, .1); tone('sawtooth', 900, 450, .3, .1, ctx.currentTime + .18); },
  squeak() { tone('sine', 2200, 3200, .08, .08); tone('sine', 2600, 1800, .1, .07, ctx.currentTime + .09); },
  slip() { tone('sine', 900, 120, .5, .2); noise(.4, .2, 3000, .5); },
  trap() { noise(.12, .6, 2000, .7); tone('square', 1500, 300, .1, .2); },
  boom() { const t = ctx.currentTime; noise(1.1, 1, 160, .5, t, null, 'lowpass'); noise(.5, .6, 900, .4, t); tone('sine', 140, 28, .9, .6, t); },
  fuse() { noise(.5, .12, 5200, 1.2); },
  tweet() { const t = ctx.currentTime; for (let i = 0; i < 3; i++) tone('sine', 2500 + i * 300, 3300, .07, .06, t + i * .1); },
  bark() { const t = ctx.currentTime; for (let i = 0; i < 2; i++) { noise(.12, .6, 600, 2, t + i * .22); tone('sawtooth', 260, 140, .12, .25, t + i * .22); } },
  power() { const t = ctx.currentTime; [523, 659, 784, 1047].forEach((f, i) => tone('square', f, 0, .12, .09, t + i * .07)); },
  poof() { noise(.4, .4, 900, .5); tone('sine', 600, 100, .3, .15); },
  count() { tone('square', 660, 0, .15, .12); },
  go() { tone('square', 1320, 0, .35, .12); },
  win() { const t = ctx.currentTime; [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone('triangle', f, 0, .22, .14, t + i * .12)); },
  lose() { const t = ctx.currentTime; [523, 494, 440, 330].forEach((f, i) => tone('triangle', f, 0, .35, .14, t + i * .25)); },
};
export function play(name) { if (ctx && A.enabled && SFX[name]) SFX[name](); }

// ---------------- MUSIQA ----------------
const SCALES = {
  minor: [0, 2, 3, 5, 7, 8, 10], major: [0, 2, 4, 5, 7, 9, 11], dorian: [0, 2, 3, 5, 7, 9, 10], hijaz: [0, 1, 4, 5, 7, 8, 10],
  penta: [0, 2, 4, 7, 9, 12, 14], blues: [0, 3, 5, 6, 7, 10, 12], harm: [0, 2, 3, 5, 7, 8, 11], lyd: [0, 2, 4, 6, 7, 9, 11],
};
const TRACKS = {
  classic: { bpm: 152, scale: 'minor', root: 57, prog: [0, 5, 3, 4], lead: 'triangle', bass: 'square', drum: 'chase', dens: .7, seed: 1 },
  bit8: { bpm: 160, scale: 'major', root: 60, prog: [0, 4, 5, 3], lead: 'square', bass: 'triangle', drum: 'chip', dens: .8, seed: 8, arp: true },
  jazz: { bpm: 128, scale: 'dorian', root: 55, prog: [0, 3, 6, 4], lead: 'sine', bass: 'triangle', drum: 'swing', dens: .55, seed: 3, swing: .22, walk: true },
  horror: { bpm: 96, scale: 'harm', root: 50, prog: [0, 5, 1, 4], lead: 'sawtooth', bass: 'sine', drum: 'slow', dens: .35, seed: 13, pad: true },
  rock: { bpm: 168, scale: 'blues', root: 52, prog: [0, 3, 4, 0], lead: 'sawtooth', bass: 'sawtooth', drum: 'rock', dens: .75, seed: 21 },
  sharq: { bpm: 118, scale: 'hijaz', root: 57, prog: [0, 3, 0, 4], lead: 'triangle', bass: 'sine', drum: 'doira', dens: .7, seed: 33, trill: true },
  lofi: { bpm: 82, scale: 'major', root: 57, prog: [3, 4, 2, 5], lead: 'sine', bass: 'sine', drum: 'lofi', dens: .45, seed: 44, swing: .18, pad: true },
  electro: { bpm: 128, scale: 'minor', root: 53, prog: [0, 5, 6, 4], lead: 'sawtooth', bass: 'square', drum: 'house', dens: .6, seed: 55, arp: true },
  space: { bpm: 100, scale: 'lyd', root: 60, prog: [0, 1, 4, 3], lead: 'sine', bass: 'triangle', drum: 'slow', dens: .5, seed: 66, pad: true, arp: true },
  tango: { bpm: 120, scale: 'harm', root: 57, prog: [0, 4, 0, 4], lead: 'sawtooth', bass: 'triangle', drum: 'tango', dens: .65, seed: 77 },
  epic: { bpm: 140, scale: 'minor', root: 50, prog: [0, 5, 2, 6], lead: 'sawtooth', bass: 'sawtooth', drum: 'epic', dens: .7, seed: 88, pad: true },
};
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

function compose(def) {
  const r = rng(def.seed * 7919), sc = SCALES[def.scale];
  const deg = d => def.root + sc[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
  const lead = [], bass = [];
  for (let bar = 0; bar < 8; bar++) {
    const ch = def.prog[bar % def.prog.length];
    let cur = ch + 7;
    for (let s = 0; s < 16; s++) {
      const strong = s % 4 === 0;
      if (def.arp && !strong && r() < .5) { lead.push(deg(ch + 7 + [0, 2, 4, 7][s % 4])); continue; }
      if (r() < (strong ? .9 : def.dens * .7)) {
        cur += strong ? (r() < .5 ? 0 : 2) * (r() < .5 ? -1 : 1) : Math.round((r() - .5) * 3);
        cur = Math.max(ch + 4, Math.min(ch + 12, cur));
        lead.push(deg(cur));
      } else lead.push(0);
    }
    for (let s = 0; s < 16; s++) {
      if (def.walk) bass.push(s % 4 === 0 ? deg(ch + [0, 2, 4, 5][s / 4 | 0] - 7) : 0);
      else bass.push(s % 4 === 0 ? deg(ch - 7) : (s % 4 === 2 && r() < .6 ? deg(ch - 7 + 4) : 0));
    }
  }
  return { lead, bass, deg };
}
const comps = {};
function drums(kind, s, t, bus) {
  const k = () => tone('sine', 150, 40, .14, .45, t, bus), sn = () => noise(.12, .22, 2200, .8, t, bus), hh = (v = .06) => noise(.03, v, 9000, 1, t, bus, 'highpass');
  switch (kind) {
    case 'chase': if (s % 4 === 0) k(); if (s % 8 === 4) sn(); if (s % 2) hh(); break;
    case 'chip': if (s % 4 === 0) tone('square', 120, 50, .08, .25, t, bus); if (s % 8 === 4) noise(.05, .2, 6000, .5, t, bus); break;
    case 'swing': if (s % 8 === 0) k(); if (s % 4 === 2) hh(.08); if (s % 8 === 4) noise(.15, .1, 4000, .5, t, bus); break;
    case 'slow': if (s % 16 === 0) tone('sine', 70, 30, .8, .4, t, bus); if (s % 16 === 8) noise(.4, .08, 600, .5, t, bus); break;
    case 'rock': if (s % 8 === 0 || s % 8 === 3) k(); if (s % 8 === 4) sn(); hh(.05); break;
    case 'doira': if (s % 8 === 0) k(); if ([3, 6, 10, 11, 14].includes(s % 16)) noise(.06, .2, 1800, 2, t, bus); if (s % 2) noise(.02, .06, 7000, 2, t, bus); break;
    case 'lofi': if (s % 8 === 0) k(); if (s % 8 === 4) noise(.18, .12, 1500, .5, t, bus); if (s % 2 === 0) hh(.03); break;
    case 'house': if (s % 4 === 0) k(); if (s % 4 === 2) hh(.1); if (s % 8 === 4) noise(.1, .15, 1800, .5, t, bus); break;
    case 'tango': if ([0, 3, 6, 8].includes(s % 16)) k(); if (s % 8 === 4) noise(.08, .12, 3000, 1, t, bus); break;
    case 'epic': if (s % 4 === 0) tone('sine', 90, 35, .4, .5, t, bus); if (s % 16 === 12) noise(.5, .3, 400, .3, t, bus); if (s % 2) hh(.04); break;
  }
}
function schedule() {
  const def = TRACKS[track] || TRACKS.classic, c = comps[track] ||= compose(def);
  const six = 60 / def.bpm / 4 * (mood === 'sneak' ? 1.5 : 1);
  while (nextT < ctx.currentTime + .15) {
    const i = step % 128, s = i % 16;
    const t = nextT + (def.swing && s % 2 ? six * def.swing : 0);
    const l = c.lead[i];
    if (l && (mood !== 'sneak' || s % 2 === 0)) {
      tone(def.lead, mtof(l), 0, six * (def.lead === 'sine' ? 2.4 : 1.7), def.lead === 'sawtooth' ? .06 : .1, t, mus);
      if (def.trill && s % 8 === 6) tone(def.lead, mtof(l + 1), 0, six * .5, .05, t + six * .5, mus);
    }
    const b = c.bass[i]; if (b) tone(def.bass, mtof(b), 0, six * 2.2, def.bass === 'sawtooth' ? .08 : .14, t, mus);
    if (def.pad && s === 0) { const ch = def.prog[(i / 16 | 0) % def.prog.length]; for (const d of [0, 2, 4]) tone('triangle', mtof(c.deg(ch + d)), 0, six * 16, .035, t, mus, .4); }
    if (mood !== 'sneak') drums(def.drum, s, t, mus); else if (s % 8 === 0) tone('sine', 60, 40, .3, .2, t, mus);
    nextT += six; step++;
  }
}
export function playMusic(id) {
  if (!ctx) return;
  if (track === id && timer) return;
  track = id || 'classic';
  if (!timer) { nextT = ctx.currentTime + .08; step = 0; timer = setInterval(schedule, 30); }
}
export function stopMusic() { if (timer) { clearInterval(timer); timer = null; } }
export function setMood(m) {
  if (!ctx || m === mood) return;
  mood = m; musF.frequency.setTargetAtTime(m === 'sneak' ? 1300 : 9000, ctx.currentTime, .2);
}
