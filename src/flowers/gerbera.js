// Gerbera durazno: dos anillos de pétalos finos y largos con el verde del
// centro sangrando hacia el durazno; disco verde con florecitas en espiral
// áurea (filotaxis) y un anillo de estambres dorados.
import { makeRng } from '../paint/rng.js';
import { hsl, shift, hslStr } from '../paint/color.js';
import { makeCanvas, ctx2d } from '../paint/canvas.js';
import { glaze, liftSoft } from '../paint/brush.js';
import { part } from '../scene/head.js';
import { D, GOLDEN, petalSet, ellipsePoly, finishDisc, softBlob } from './common.js';

const C = {
  main: hsl('#F8DD90'), deep: hsl('#F0BE6E'), edge: hsl('#D49A52'), tip: hsl('#FBEAB8'),
  back: { main: hsl('#F0CE82'), deep: hsl('#E2AA60'), edge: hsl('#C08848') },
  green: hsl('#A8B04A'), disc: hsl('#8A9A42'), discDeep: hsl('#4E6A2E'), gold: hsl('#CFCB70'),
};

function paintDisc(seed, r, s, sy) {
  const rng = makeRng(seed);
  const R = r * s;
  const size = R * 2.6;
  const cv = makeCanvas(size, size * sy + R * 0.6);
  const c = ctx2d(cv);
  const cx = cv.width / 2, cy = cv.height / 2;
  const disc = ellipsePoly(cx, cy, R, R * sy, 14, rng, 0.05);
  // anillo de estambres dorados (afuera) y disco verde (adentro)
  glaze(c, [
    { poly: disc, color: C.gold, alpha: 0.05, count: 22, baseRounds: 3, rounds: 3, spread: 0.25, baseSpread: 0.3 },
    { poly: ellipsePoly(cx, cy, R * 0.74, R * 0.74 * sy, 12, rng, 0.05), color: C.disc, alpha: 0.05, count: 26, baseRounds: 3, rounds: 3, spread: 0.25 },
    { poly: ellipsePoly(cx + R * 0.1, cy + R * 0.12 * sy, R * 0.5, R * 0.5 * sy, 10, rng, 0.08), color: C.discDeep, alpha: 0.04, count: 16, baseRounds: 3, rounds: 3, spread: 0.3 },
  ], rng);
  // florecitas en espiral áurea
  const n = 90;
  for (let i = 1; i < n; i++) {
    const rr = Math.sqrt(i / n) * R * 0.9;
    const a = i * GOLDEN;
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * sy;
    const inner = rr < R * 0.7;
    const col = inner ? shift(C.discDeep, rng.gauss(0, 6), 0, rng.gauss(0, 5) + (rr / R) * 12) : shift(C.gold, rng.gauss(0, 5), 0, rng.gauss(0, 5));
    c.fillStyle = hslStr(col, inner ? 0.55 : 0.7);
    const d = (0.5 + (rr / R) * 0.9) * s;
    c.beginPath();
    c.ellipse(x, y, d, d * sy, a, 0, Math.PI * 2);
    c.fill();
    if (!inner && rng.chance(0.5)) {
      c.fillStyle = hslStr(shift(C.gold, 0, 0, -18), 0.5);
      c.beginPath();
      c.arc(x + d * 0.6, y + d * 0.6, d * 0.45, 0, Math.PI * 2);
      c.fill();
    }
  }
  // luz arriba a la izquierda (papel)
  liftSoft(cv, ellipsePoly(cx - R * 0.35, cy - R * 0.3 * sy, R * 0.28, R * 0.18, 8, rng), rng, { alpha: 0.5, blur: 5, hard: 0.15 });
  finishDisc(cv, disc, rng, shift(C.discDeep, 0, 0, -10), C.discDeep, 1.2);
  return { canvas: cv, ax: cx, ay: cy, s };
}

export function bakeGerbera({ seed = 'gerbera', scale = 2, r = 40 } = {}) {
  const rng = makeRng(seed);
  const sy = 0.78; // vista 3/4: el disco se achata
  const petal = (i, back) => ({
    L: r * rng.range(0.7, 0.8), W: r * rng.range(0.12, 0.15), widest: 0.7, base: 0.35, tip: 'notch', tipDepth: 0.025,
    asym: rng.gauss(0, 0.25), bend: rng.gauss(0, 0.06), colors: back ? C.back : C, layers: 26, alpha: 0.055, grainAmt: 0.18,
    deep: [0.25, 0.45], bleed: { color: C.green, frac: 0.09, alpha: 0.28 }, liftAmt: 0.45, rim: 0.8, spread: 0.12, baseSpread: 0.3,
    pencilAmt: i % 3 === 0 ? 0.3 : 0, veins: 2,
  });
  const outerSet = petalSet(`${seed}o`, 9, scale, (i) => petal(i, false));
  const backSet = petalSet(`${seed}b`, 6, scale, (i) => petal(i, true));
  const parts = [];
  parts.push(part(softBlob(`${seed}sh`, r * 0.7, r * 0.55, scale, hsl('#8A5A6A'), 0.12), { x: r * 0.05, y: r * 0.08, sx: 1, sx0: 0.2, delay: 0, dur: 0.5 }));
  // Dos anillos. El de atrás (más frío) primero, desfasado medio pétalo.
  const rings = [
    { n: 24, set: backSet, k: 0.97, off: 0.5, delay: 0.05 },
    { n: 21, set: outerSet, k: 0.95, off: 0, delay: 0.18 },
  ];
  rings.forEach((ring, ri) => {
    const items = [];
    for (let i = 0; i < ring.n; i++) {
      const a = ((i + ring.off) / ring.n) * Math.PI * 2 + rng.gauss(0, 3 * D);
      items.push({ a, i });
    }
    // de atrás (arriba) hacia adelante (abajo)
    items.sort((p, q) => -Math.cos(q.a) + Math.cos(p.a));
    for (const { a, i } of items) {
      const img = ring.set[(i * 7 + ri) % ring.set.length];
      const up = Math.cos(a); // 1 = apunta hacia arriba (atrás)
      const fore = 1 - Math.abs(up) * (1 - sy) * 1.1; // escorzo
      const L = ring.k * rng.range(0.86, 1.08);
      const dist = r * 0.3;
      const flip = rng.chance(0.5) ? 1 : -1;
      parts.push(part(img, {
        x: Math.sin(a) * dist, y: -Math.cos(a) * dist * sy,
        rot: a,
        sx: flip, sy: L * fore,
        sx0: 0.4 * flip, sy0: 0.05, delay: ring.delay + (i / ring.n) * 0.18, dur: 0.5,
      }));
    }
  });
  // sombra del disco sobre la base de los pétalos
  parts.push(part(softBlob(`${seed}ring`, r * 0.42, r * 0.36, scale, hsl('#B8903E'), 0.28), { x: r * 0.03, y: r * 0.05, sx: 1, sx0: 0.3, delay: 0.2, dur: 0.5 }));
  parts.push(part(paintDisc(`${seed}d`, r * 0.34, scale, sy), { x: 0, y: 0, sx: 1, sx0: 0.5, delay: 0, dur: 0.45, a0: 1 }));
  return { parts, r, kind: 'gerbera' };
}
