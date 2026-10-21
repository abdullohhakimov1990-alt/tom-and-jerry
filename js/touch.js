// Telefon boshqaruvi: chap — joystik (yurish), o'ng — barmoq bilan qarash, tugmalar: sakrash, yashirinish, tashlanish.
const $ = id => document.getElementById(id);
export const isTouch = () => matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window && navigator.maxTouchPoints > 0);

// telefonda to'liq ekran va yotiq holat
export function goLandscape() {
  if (!isTouch()) return;
  const el = document.documentElement;
  const lock = () => { try { const p = screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'); if (p && p.catch) p.catch(() => { }); } catch (e) { } };
  try {
    if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen({ navigationUI: 'hide' }).then(lock).catch(lock);
    else lock();
  } catch (e) { lock(); }
}

export function attachTouch(m) {
  const T = { mx: 0, mz: 0, active: false, sprint: false, jump: false };
  m.touch = T;
  $('touch').classList.remove('hidden');
  $('tAct').classList.toggle('hidden', m.me !== 'tom');
  const joy = $('joy'), knob = $('joyKnob'), look = $('lookPad');
  let joyId = null, lookId = null, lx = 0, ly = 0, cx = 0, cy = 0;
  const R = 60;
  const H = {
    jd: e => { e.preventDefault(); joyId = e.pointerId; joy.setPointerCapture(e.pointerId); const r = joy.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; H.jm(e); },
    jm: e => {
      if (e.pointerId !== joyId) return;
      let dx = e.clientX - cx, dy = e.clientY - cy; const L = Math.hypot(dx, dy);
      if (L > R) { dx = dx / L * R; dy = dy / L * R; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      const k = Math.min(1, L / R);
      T.mx = k > .15 ? dx / R : 0; T.mz = k > .15 ? -dy / R : 0; T.active = k > .15;
      T.sprint = T.sprintLock || L > R * 1.25;
      joy.classList.toggle('sprint', T.sprint);
    },
    ju: e => { if (e.pointerId !== joyId) return; joyId = null; T.mx = T.mz = 0; T.active = false; T.sprint = !!T.sprintLock; knob.style.transform = ''; joy.classList.toggle('sprint', T.sprint); },
    ld: e => { e.preventDefault(); lookId = e.pointerId; look.setPointerCapture(e.pointerId); lx = e.clientX; ly = e.clientY; },
    lm: e => { if (e.pointerId !== lookId) return; m.look((e.clientX - lx) * 1.6, (e.clientY - ly) * 1.6); lx = e.clientX; ly = e.clientY; },
    lu: e => { if (e.pointerId === lookId) lookId = null; },
    jump: e => { e.preventDefault(); T.jump = true; setTimeout(() => { T.jump = false; }, 180); },
    hide: e => { e.preventDefault(); if (m.phase === 'play') m.pressC(); },
    act: e => { e.preventDefault(); if (m.phase === 'play' && m.me === 'tom') m.pounce(m.tom); },
    sprint: e => { e.preventDefault(); T.sprintLock = !T.sprintLock; T.sprint = T.sprintLock; $('tSprint').classList.toggle('on', T.sprintLock); },
    map: e => { e.preventDefault(); m.bigOn = !m.bigOn; m.toggleBig(); },
    list: e => { e.preventDefault(); if (m.toggleScore) m.toggleScore(); },
    view: e => { e.preventDefault(); if (m.cam) m.cam.fp = !m.cam.fp; },
    pause: e => { e.preventDefault(); m.app.pause(); },
  };
  joy.addEventListener('pointerdown', H.jd); joy.addEventListener('pointermove', H.jm); joy.addEventListener('pointerup', H.ju); joy.addEventListener('pointercancel', H.ju);
  look.addEventListener('pointerdown', H.ld); look.addEventListener('pointermove', H.lm); look.addEventListener('pointerup', H.lu); look.addEventListener('pointercancel', H.lu);
  $('tJump').addEventListener('pointerdown', H.jump); $('tHide').addEventListener('pointerdown', H.hide); $('tAct').addEventListener('pointerdown', H.act);
  $('tSprint').addEventListener('pointerdown', H.sprint); $('tMap').addEventListener('pointerdown', H.map); $('tPause').addEventListener('pointerdown', H.pause);
  $('tList').addEventListener('pointerdown', H.list); $('tView').addEventListener('pointerdown', H.view);
  T.detach = () => {
    $('tList').removeEventListener('pointerdown', H.list); $('tView').removeEventListener('pointerdown', H.view);
    joy.removeEventListener('pointerdown', H.jd); joy.removeEventListener('pointermove', H.jm); joy.removeEventListener('pointerup', H.ju); joy.removeEventListener('pointercancel', H.ju);
    look.removeEventListener('pointerdown', H.ld); look.removeEventListener('pointermove', H.lm); look.removeEventListener('pointerup', H.lu); look.removeEventListener('pointercancel', H.lu);
    $('tJump').removeEventListener('pointerdown', H.jump); $('tHide').removeEventListener('pointerdown', H.hide); $('tAct').removeEventListener('pointerdown', H.act);
    $('tSprint').removeEventListener('pointerdown', H.sprint); $('tMap').removeEventListener('pointerdown', H.map); $('tPause').removeEventListener('pointerdown', H.pause);
    $('touch').classList.add('hidden'); $('tSprint').classList.remove('on'); knob.style.transform = '';
  };
  return T;
}
