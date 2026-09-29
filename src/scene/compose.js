// Composición determinista (con semilla) en abanico. Cada paso elige su
// lugar mirando lo que ya está puesto, así cualquier prefijo de N pasos
// queda equilibrado: balance de masa, jerarquía focal (rosas y gerbera al
// centro), verdes armando la silueta, eucalipto alto de un lado y nada
// cortado por el borde.
import { makeRng } from '../paint/rng.js';
import { flowerDef } from './registry.js';

export const SCENE = { W: 400, H: 620, B: { x: 200, y: 452 }, RIM: 392 };
const D = Math.PI / 180;

function polar(a, d) {
  return { x: SCENE.B.x + Math.sin(a) * d, y: SCENE.B.y - Math.cos(a) * d };
}

// Puntos representativos (círculos) que ocupa un elemento.
function footprint(it) {
  if (it.kind === 'head') return [{ x: it.center.x, y: it.center.y, r: it.vr }];
  const out = [];
  for (const t of [0.45, 0.72, 1]) {
    const lx = it.dir * it.L * 0.3 * t * t, ly = -it.L * it.reach * t;
    out.push({
      x: it.origin.x + lx * Math.cos(it.rot) - ly * Math.sin(it.rot),
      y: it.origin.y + lx * Math.sin(it.rot) + ly * Math.cos(it.rot),
      r: it.L * 0.13, t,
    });
  }
  return out;
}

function massCenter(items) {
  let m = 0, x = 0;
  for (const it of items) {
    const fp = footprint(it);
    const p = fp[fp.length - 1 > 0 ? 1 : 0];
    m += it.mass;
    x += p.x * it.mass;
  }
  return m ? x / m : SCENE.B.x;
}

function inBounds(it) {
  const pad = 10;
  for (const c of footprint(it)) {
    const r = it.kind === 'head' ? c.r * 1.12 : c.r * (it.name === 'paniculata' ? 1.5 : it.name === 'fresia' ? 1.3 : 0.9);
    if (c.x - r < pad || c.x + r > SCENE.W - pad || c.y - r < pad) return false;
  }
  return true;
}

function candidate(def, a, d, i, jit, tallSide) {
  if (def.kind === 'head') {
    const head = polar(a, d);
    const off = def.center || { x: 0, y: 0 };
    return {
      kind: 'head', name: def.name, def, angle: a, dist: d, pos: head, rot: a * 0.32 + jit.rot,
      center: { x: head.x + off.x, y: head.y + off.y }, vr: def.vr, mass: def.mass, depth: def.depth, index: i,
    };
  }
  const tall = def.name === 'eucalipto';
  const dir = Math.abs(a) < 4 * D ? jit.dir : Math.sign(a);
  const L = def.L * (tall ? 1 : jit.Lk);
  return {
    kind: 'spray', name: def.name, def, angle: a, origin: polar(a, def.d0), rot: a * (tall ? 0.7 : 1.05), dir, L, reach: def.reach,
    mass: def.mass, depth: def.depth, index: i, tallSide,
  };
}

function score(c, placed, n) {
  let s = 0;
  const all = [...placed, c];
  // 1) balance de masa respecto del eje del ramo
  const mx = massCenter(all);
  s += Math.abs(mx - SCENE.B.x) * (placed.length < 3 ? 1.6 : 1.0);
  const deg = Math.abs(c.angle) / D;
  // 2) jerarquía
  if (c.kind === 'head') {
    const f = c.def.focal;
    s += f * deg * 0.7;
    s += (1 - f) * Math.abs(deg - 26) * 0.35;
    const mid = (c.def.dist[0] + c.def.dist[1]) / 2;
    s += Math.abs(c.dist - mid) * 0.12;
  } else if (c.name === 'eucalipto') {
    // el eucalipto alto se inclina hacia su lado (asimetría suave)
    s += Math.abs(c.angle / D - c.tallSide * 16) * 0.9;
  } else if (c.name === 'helecho') {
    s += Math.abs(deg - (placed.length < 1 ? 8 : 34)) * 0.5;
  } else if (c.name === 'fresia') {
    s += Math.abs(deg - 40) * 0.6;
  } else if (c.name === 'paniculata') {
    s += Math.abs(deg - 22) * 0.25;
  }
  // 3) superposición y compacidad
  const mine = footprint(c);
  let nearest = Infinity;
  for (const p of placed) {
    const other = footprint(p);
    for (const a of mine) for (const b of other) {
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const bothHeads = c.kind === 'head' && p.kind === 'head';
      const min = (a.r + b.r) * (bothHeads ? 0.9 : 0.55);
      if (d < min) s += (min - d) * (bothHeads ? 4 : 1.5);
      if (bothHeads) nearest = Math.min(nearest, d / (a.r + b.r));
    }
    if (c.kind === 'spray' && p.kind === 'spray' && Math.abs(c.angle - p.angle) < 10 * D && c.name === p.name) s += 40;
  }
  if (c.kind === 'head' && nearest !== Infinity && nearest > 1.15) s += (nearest - 1.15) * 60;
  // variedad: no dos flores iguales pegadas (se alternan colores)
  if (c.kind === 'head') {
    for (const p of placed) {
      if (p.kind !== 'head' || p.name !== c.name) continue;
      const d = Math.hypot(p.center.x - c.center.x, p.center.y - c.center.y);
      const lim = (p.vr + c.vr) * 1.5;
      if (d < lim) s += (lim - d) * 0.9;
    }
  }
  // 4) paniculata: repartida, lejos de otras ramas
  if (c.name === 'paniculata') {
    for (const p of placed) if (p.name === 'paniculata' && Math.abs(p.angle - c.angle) < 30 * D) s += 30;
  }
  return s;
}

export function planBouquet(steps, seed = 'jimena') {
  const rng = makeRng(seed);
  const tallSide = rng.chance(0.5) ? 1 : -1;
  const placed = [];
  steps.forEach((step, i) => {
    const def = flowerDef(step.flor);
    const lr = rng.fork(`paso${i}`);
    const jit = { rot: lr.gauss(0, 0.04), dir: lr.chance(0.5) ? 1 : -1, Lk: lr.range(0.9, 1.06) };
    let best = null, bestS = Infinity;
    const dists = def.kind === 'head' ? range(def.dist[0], def.dist[1], 6) : [0];
    for (let deg = -56; deg <= 56; deg += 2) {
      for (const d of dists) {
        const c = candidate(def, deg * D, d, i, jit, tallSide);
        if (!inBounds(c)) continue;
        const sc = score(c, placed, steps.length) + lr.next() * 0.8;
        if (sc < bestS) { bestS = sc; best = c; }
      }
    }
    if (!best) best = candidate(def, 0, def.dist ? def.dist[0] : 0, i, jit, tallSide);
    best.seed = `${seed}-${i}-${def.name}`;
    placed.push(best);
  });
  return placed;
}

function range(a, b, step) {
  const out = [];
  for (let v = a; v <= b; v += step) out.push(v);
  return out;
}
