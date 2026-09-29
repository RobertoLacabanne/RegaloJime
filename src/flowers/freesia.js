// Fresia naranja: espiga arqueada con capullos en fila sobre un solo lado
// (de trompetas abiertas en la base a capullitos verdes en la punta).
import { makeRng } from '../paint/rng.js';
import { hsl, shift, mix } from '../paint/color.js';
import { part } from '../scene/head.js';
import { paintStems, bezier, pointAt } from '../paint/stem.js';
import { D, sprite, softBlob } from './common.js';
import { paintPetal } from '../paint/petal.js';

const C = {
  orange: { main: hsl('#F6A21E'), deep: hsl('#E07A12'), edge: hsl('#B25812'), tip: hsl('#F9C24A') },
  throat: hsl('#F8D24A'),
  bud: hsl('#F4A828'),
  green: hsl('#8FA24A'),
  stem: hsl('#6E8A40'),
};

export function bakeFreesia({ seed = 'fresia', scale = 2, L = 74, dir = 1 } = {}) {
  const rng = makeRng(seed);
  const parts = [];
  const k = L / 74;
  // espiga: sube y se arquea hacia "dir"
  const spike = bezier({ x: 0, y: 0 }, { x: dir * 2, y: -L * 0.55 }, { x: dir * L * 0.2, y: -L * 0.95 }, { x: dir * L * 0.66, y: -L * 0.9 }, 30);
  parts.push(part(paintStems(`${seed}st`, [{ pts: spike, w0: 2.0 * k, w1: 0.9 * k }], scale, C.stem, { light: true }), { sx: 1, sx0: 1, sy0: 1, revealR: L * 1.2, delay: 0, dur: 0.5, a0: 1 }));
  const nFl = 2 + (rng.chance(0.5) ? 1 : 0);
  const nBud = 7;
  const lobe = (id, rr, colors, extra = {}) => sprite(paintPetal({
    seed: `${seed}${id}`, scale, L: rr, W: rr * rng.range(0.8, 0.95), widest: 0.65, base: 0.3, tip: 'round',
    asym: rng.gauss(0, 0.2), bend: rng.gauss(0, 0.06), colors, layers: 22, alpha: 0.055, deep: [0.35],
    liftAmt: 0.5, rim: 1.2, spread: 0.14, baseSpread: 0.45, ...extra,
  }), scale);
  // flores abiertas: embudo en vista lateral (tubo + lóbulos que se abren)
  for (let i = 0; i < nFl; i++) {
    const t = 0.36 + i * 0.13;
    const p = pointAt(spike, t);
    const face = p.ang - dir * (62 + rng.gauss(0, 8)) * D; // hacia arriba/afuera
    const tubeL = 11 * k * rng.range(0.9, 1.05) * (1 - i * 0.07);
    const mx = p.x + Math.cos(face) * tubeL * 0.8, my = p.y + Math.sin(face) * tubeL * 0.8;
    const rr = tubeL * 0.95;
    const delay = 0.28 + i * 0.12;
    const up = face + Math.PI / 2;
    // lóbulos de atrás (más oscuros), abiertos en abanico
    [-62, 0, 62].forEach((deg, k) => {
      parts.push(part(lobe(`fb${i}${k}`, rr, { ...C.orange, main: shift(C.orange.main, -3, 0, -6) }, { bleed: { color: C.throat, frac: 0.45, alpha: 0.7 } }), {
        x: mx, y: my, rot: up + (deg + rng.gauss(0, 6)) * D, sx: 1, sy: 0.9, rot0: up, sx0: 0.2, sy0: 0.2, delay: delay + 0.1 + k * 0.03, dur: 0.5,
      }));
    });
    // tubo: pétalo angosto desde la espiga hasta la boca
    parts.push(part(sprite(paintPetal({
      seed: `${seed}t${i}`, scale, L: tubeL, W: tubeL * 0.55, widest: 0.85, base: 0.25, tip: 'flat', tipDepth: 0.05,
      colors: C.orange, layers: 22, alpha: 0.06, deep: [0.3], bleed: { color: C.green, frac: 0.2, alpha: 0.5 }, liftAmt: 0.6, rim: 1.1, spread: 0.12, baseSpread: 0.35,
    }), scale), { x: p.x, y: p.y, rot: up, sx: 1, sx0: 0.4, sy0: 0.2, delay, dur: 0.45 }));
    // garganta amarilla y lóbulos de adelante, más chicos y claros
    parts.push(part(softBlob(`${seed}th${i}`, rr * 0.4, rr * 0.28, scale, hsl('#F2B82A'), 0.9), { x: mx, y: my, sx: 1, sx0: 0.2, delay: delay + 0.2, dur: 0.3 }));
    [-40, 40].forEach((deg, k) => {
      parts.push(part(lobe(`ff${i}${k}`, rr * 0.8, C.orange, { liftAmt: 0.7 }), {
        x: mx, y: my, rot: up + (deg + 180 * 0 + rng.gauss(0, 8)) * D + Math.PI * 0.15 * (k ? 1 : -1), sx: 1, sy: 0.7, rot0: up, sx0: 0.2, sy0: 0.2, delay: delay + 0.2 + k * 0.03, dur: 0.5,
      }));
    });
  }
  // capullos apiñados en fila sobre un solo lado, de naranja a verde
  for (let j = 0; j < nBud; j++) {
    const t = 0.62 + (j / (nBud - 1)) * 0.37;
    const p = pointAt(spike, t);
    const k = j / (nBud - 1);
    const col = mix(C.bud, C.green, Math.max(0, (k - 0.45) * 1.8));
    const Lb = 11 * (L / 74) * (1 - k * 0.55);
    const pet = paintPetal({
      seed: `${seed}b${j}`, scale, L: Lb, W: Lb * 0.34, widest: 0.5, base: 0.3, tip: 'point', bend: dir * 0.08,
      colors: { main: col, deep: shift(col, -8, 0, -12), edge: shift(col, -10, 0, -25) }, layers: 16, alpha: 0.07, deep: [0.4],
      bleed: { color: C.green, frac: 0.25, alpha: 0.45 }, liftAmt: 0.45, rim: 1.3, spread: 0.12, baseSpread: 0.3,
    });
    const rot = p.ang + Math.PI / 2 - dir * (32 + rng.gauss(0, 6)) * D;
    parts.push(part(sprite(pet, scale), { x: p.x, y: p.y, rot, sx: 1, sx0: 0.2, sy0: 0.1, delay: 0.15 + j * 0.04, dur: 0.4 }));
  }
  return { parts, r: L * 0.5, kind: 'freesia' };
}
