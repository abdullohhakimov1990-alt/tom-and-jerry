// Yo'l topish: to'r (grid) + A* + yo'lni silliqlash. Tom va Jerry uchun alohida to'r.
import { SX, SZ, BOUNDS } from './house.js';

export class NavGrid {
  constructor(world, r, h, cs = .5) {
    this.cs = cs; this.ox = BOUNDS.x0; this.oz = BOUNDS.z0;
    this.nx = Math.ceil((BOUNDS.x1 - BOUNDS.x0) / cs); this.nz = Math.ceil((BOUNDS.z1 - BOUNDS.z0) / cs);
    const N = this.nx * this.nz;
    this.block = new Uint8Array(N);
    for (const c of world.colliders) {
      if (c.minY >= h || c.maxY <= .45) continue;
      const x0 = Math.max(0, Math.floor((c.minX - r - this.ox) / cs)), x1 = Math.min(this.nx - 1, Math.floor((c.maxX + r - this.ox) / cs));
      const z0 = Math.max(0, Math.floor((c.minZ - r - this.oz) / cs)), z1 = Math.min(this.nz - 1, Math.floor((c.maxZ + r - this.oz) / cs));
      for (let j = z0; j <= z1; j++) for (let i = x0; i <= x1; i++) {
        const x = (i + .5) * cs + this.ox, z = (j + .5) * cs + this.oz;
        const dx = Math.max(c.minX - x, 0, x - c.maxX), dz = Math.max(c.minZ - z, 0, z - c.maxZ);
        if (dx * dx + dz * dz < r * r) this.block[j * this.nx + i] = 1;
      }
    }
    for (let i = 0; i < this.nx; i++) { this.block[i] = 1; this.block[(this.nz - 1) * this.nx + i] = 1; }
    for (let j = 0; j < this.nz; j++) { this.block[j * this.nx] = 1; this.block[j * this.nx + this.nx - 1] = 1; }
    this.g = new Float32Array(N); this.f = new Float32Array(N); this.came = new Int32Array(N);
    this.seen = new Uint32Array(N); this.closed = new Uint32Array(N); this.stamp = 0;
    this.heap = new Int32Array(N); this.hn = 0;
    this.extra = null;  // qo'shimcha narx (masalan Tomdan qochish)
  }
  ci(x) { return Math.max(0, Math.min(this.nx - 1, Math.floor((x - this.ox) / this.cs))); }
  cj(z) { return Math.max(0, Math.min(this.nz - 1, Math.floor((z - this.oz) / this.cs))); }
  wx(i) { return (i + .5) * this.cs + this.ox; }
  wz(j) { return (j + .5) * this.cs + this.oz; }
  free(x, z) { return !this.block[this.cj(z) * this.nx + this.ci(x)]; }
  nearestFree(x, z, maxR = 10) {
    const i0 = this.ci(x), j0 = this.cj(z);
    if (!this.block[j0 * this.nx + i0]) return [x, z];
    for (let rr = 1; rr < maxR / this.cs; rr++) {
      for (let dj = -rr; dj <= rr; dj++) for (let di = -rr; di <= rr; di++) {
        if (Math.abs(di) !== rr && Math.abs(dj) !== rr) continue;
        const i = i0 + di, j = j0 + dj;
        if (i < 0 || j < 0 || i >= this.nx || j >= this.nz) continue;
        if (!this.block[j * this.nx + i]) return [this.wx(i), this.wz(j)];
      }
    }
    return null;
  }
  los(ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz), n = Math.ceil(L / (this.cs * .5));
    for (let k = 1; k <= n; k++) { const t = k / n; if (!this.free(ax + dx * t, az + dz * t)) return false; }
    return true;
  }
  // odatda uy ichidan (hovli emas) tasodifiy bo'sh joy
  randomFree(rnd = Math.random, tries = 200, outside = false) {
    for (let k = 0; k < tries; k++) {
      const x = outside ? BOUNDS.x0 + rnd() * (BOUNDS.x1 - BOUNDS.x0) : 1 + rnd() * (SX - 2);
      const z = outside ? BOUNDS.z0 + rnd() * (BOUNDS.z1 - BOUNDS.z0) : 1 + rnd() * (SZ - 2);
      const i = this.ci(x), j = this.cj(z);
      if (!this.block[j * this.nx + i]) return [this.wx(i), this.wz(j)];
    }
    return null;
  }
  push(n) {
    const h = this.heap, f = this.f; let i = this.hn++; h[i] = n;
    while (i > 0) { const p = (i - 1) >> 1; if (f[h[p]] <= f[n]) break; h[i] = h[p]; i = p; } h[i] = n;
  }
  pop() {
    const h = this.heap, f = this.f, top = h[0], last = h[--this.hn];
    let i = 0;
    for (; ;) { let c = 2 * i + 1; if (c >= this.hn) break; if (c + 1 < this.hn && f[h[c + 1]] < f[h[c]]) c++; if (f[h[c]] >= f[last]) break; h[i] = h[c]; i = c; }
    h[i] = last; return top;
  }
  // natija: [{x,z}, ...] yoki null
  find(sx, sz, tx, tz, maxIter = 40000) {
    const s0 = this.nearestFree(sx, sz, 3), t0 = this.nearestFree(tx, tz, 6);
    if (!s0 || !t0) return null;
    const nx = this.nx, si = this.ci(s0[0]), sj = this.cj(s0[1]), ti = this.ci(t0[0]), tj = this.cj(t0[1]);
    const start = sj * nx + si, goal = tj * nx + ti;
    const st = ++this.stamp; this.hn = 0;
    const H = (i, j) => { const dx = Math.abs(i - ti), dz = Math.abs(j - tj); return (dx + dz) + (1.4142 - 2) * Math.min(dx, dz); };
    this.g[start] = 0; this.f[start] = H(si, sj); this.seen[start] = st; this.came[start] = -1; this.push(start);
    let it = 0, found = false;
    const ex = this.extra;
    while (this.hn > 0 && it++ < maxIter) {
      const cur = this.pop();
      if (cur === goal) { found = true; break; }
      if (this.closed[cur] === st) continue;
      this.closed[cur] = st;
      const ci = cur % nx, cj = (cur - ci) / nx;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const i = ci + di, j = cj + dj;
        if (i < 0 || j < 0 || i >= nx || j >= this.nz) continue;
        const n = j * nx + i;
        if (this.block[n] || this.closed[n] === st) continue;
        if (di && dj && (this.block[cj * nx + i] || this.block[j * nx + ci])) continue;
        let cost = di && dj ? 1.4142 : 1;
        if (ex) cost += ex(this.wx(i), this.wz(j));
        const g = this.g[cur] + cost;
        if (this.seen[n] !== st || g < this.g[n]) {
          this.seen[n] = st; this.g[n] = g; this.f[n] = g + H(i, j); this.came[n] = cur; this.push(n);
        }
      }
    }
    if (!found) return null;
    const cells = [];
    for (let n = goal; n !== -1; n = this.came[n]) cells.push(n);
    cells.reverse();
    const pts = cells.map(n => { const i = n % nx; return { x: this.wx(i), z: this.wz((n - i) / nx) }; });
    pts[pts.length - 1] = { x: t0[0], z: t0[1] };
    // silliqlash
    const out = [pts[0]];
    let a = 0;
    while (a < pts.length - 1) {
      let b = Math.min(pts.length - 1, a + 40);
      while (b > a + 1 && !this.los(pts[a].x, pts[a].z, pts[b].x, pts[b].z)) b--;
      out.push(pts[b]); a = b;
    }
    out.len = this.g[goal] * this.cs;
    return out;
  }
}
