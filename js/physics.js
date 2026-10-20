// Personaj harakati: silindr va AABB qutilar bilan to'qnashuv, gravitatsiya, zinapoya (step).
export const GRAV = 34;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

// b: { p: Vector3, v: Vector3, r, h, step, onGround }
export function moveBody(b, world, dt) {
  b.v.y -= GRAV * dt;
  const dist = Math.max(Math.abs(b.v.x), Math.abs(b.v.z)) * dt;
  const steps = Math.max(1, Math.ceil(dist / .25)), sdt = dt / steps;
  for (let s = 0; s < steps; s++) {
    b.p.x += b.v.x * sdt; b.p.z += b.v.z * sdt;
    resolveXZ(b, world);
  }
  const prevY = b.p.y;
  b.p.y += b.v.y * dt;
  if (b.v.y > 0) {
    const c = ceilingAt(b, world, prevY);
    if (b.p.y + b.h > c) { b.p.y = c - b.h; b.v.y = 0; }
  }
  const g = groundAt(b, world, Math.max(prevY, b.p.y));
  if (b.p.y <= g) { b.p.y = g; if (b.v.y < 0) b.v.y = 0; b.onGround = true; }
  else b.onGround = b.p.y - g < .06;
  b.ground = g;
}

function resolveXZ(b, world) {
  const r = b.r, y0 = b.p.y + b.step, y1 = b.p.y + b.h;
  const list = world.query(b.p.x - r, b.p.z - r, b.p.x + r, b.p.z + r);
  for (let k = 0; k < list.length; k++) {
    const c = list[k];
    if (c.maxY <= y0 || c.minY >= y1) continue;
    if (b.ignoreTag && c.tag === b.ignoreTag) continue;
    const cx = clamp(b.p.x, c.minX, c.maxX), cz = clamp(b.p.z, c.minZ, c.maxZ);
    const dx = b.p.x - cx, dz = b.p.z - cz, d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    if (d2 > 1e-9) { const d = Math.sqrt(d2), push = r - d; b.p.x += dx / d * push; b.p.z += dz / d * push; }
    else {
      const l = b.p.x - c.minX, rr = c.maxX - b.p.x, t = b.p.z - c.minZ, bb = c.maxZ - b.p.z, m = Math.min(l, rr, t, bb);
      if (m === l) b.p.x = c.minX - r; else if (m === rr) b.p.x = c.maxX + r; else if (m === t) b.p.z = c.minZ - r; else b.p.z = c.maxZ + r;
    }
  }
}
export function groundAt(b, world, fromY) {
  let g = 0; const r = b.r * .7;
  const list = world.query(b.p.x - r, b.p.z - r, b.p.x + r, b.p.z + r);
  for (let k = 0; k < list.length; k++) {
    const c = list[k];
    if (c.maxY > fromY + b.step + .01 || c.maxY <= g) continue;
    const cx = clamp(b.p.x, c.minX, c.maxX), cz = clamp(b.p.z, c.minZ, c.maxZ);
    if ((b.p.x - cx) ** 2 + (b.p.z - cz) ** 2 < r * r) g = c.maxY;
  }
  return g;
}
function ceilingAt(b, world, prevY) {
  let c = 14; const r = b.r * .7;
  const list = world.query(b.p.x - r, b.p.z - r, b.p.x + r, b.p.z + r);
  for (let k = 0; k < list.length; k++) {
    const q = list[k];
    if (q.minY < prevY + b.h - .02 || q.minY >= c) continue;
    const cx = clamp(b.p.x, q.minX, q.maxX), cz = clamp(b.p.z, q.minZ, q.maxZ);
    if ((b.p.x - cx) ** 2 + (b.p.z - cz) ** 2 < r * r) c = q.minY;
  }
  return c;
}
