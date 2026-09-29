// Verdes y relleno: eucalipto, helecho y paniculata.
import { makeRng } from '../paint/rng.js';
import { hsl, shift, hslStr } from '../paint/color.js';
import { makeCanvas, ctx2d } from '../paint/canvas.js';
import { part } from '../scene/head.js';
import { paintStems, bezier, pointAt } from '../paint/stem.js';
import { D, sprite, petalSet } from './common.js';
import { paintPetal } from '../paint/petal.js';
import { glaze, edgeDarken, granulate } from '../paint/brush.js';
import { getPaper } from '../paint/paper.js';

// ---------------------------------------------------------------- eucalipto
const EU = {
  leaf: { main: hsl('#8FA396'), deep: hsl('#657F72'), edge: hsl('#46605A') },
  leafB: { main: hsl('#A3B2A8'), deep: hsl('#7E9290'), edge: hsl('#56706E') },
  bloom: hsl('#A497AC'),
  stem: hsl('#8A4A3A'),
};

export function bakeEucalyptus({ seed = 'eucalipto', scale = 2, L = 170, dir = 1 } = {}) {
  const rng = makeRng(seed);
  const parts = [];
  const sway = dir * L * 0.16;
  const main = bezier({ x: 0, y: 0 }, { x: sway * 0.2, y: -L * 0.35 }, { x: sway, y: -L * 0.7 }, { x: sway * 1.4 + rng.gauss(0, 5), y: -L }, 36);
  parts.push(part(paintStems(`${seed}st`, [{ pts: main, w0: 2.2, w1: 0.8 }], scale, EU.stem, { light: true }), { sx: 1, sx0: 1, sy0: 1, revealR: L * 1.1, delay: 0, dur: 0.55, a0: 1 }));
  const n = 16;
  for (let i = 0; i < n; i++) {
    const t = 0.14 + (i / (n - 1)) * 0.84;
    const p = pointAt(main, t);
    const side = i % 2 ? 1 : -1;
    const size = (25 - t * 11) * (L / 205) * rng.range(0.8, 1.15);
    const alt = rng.chance(0.4);
    const pet = paintPetal({
      seed: `${seed}l${i}`, scale, L: size * 1.2, W: size * rng.range(0.6, 0.72), widest: 0.48, base: 0.15, tip: 'round',
      asym: rng.gauss(0, 0.2), bend: rng.gauss(0, 0.05), colors: alt ? EU.leafB : EU.leaf, layers: 24, alpha: 0.05,
      deep: [0.3], liftAmt: 0.55, rim: 1.2, grainAmt: 0.55, veins: 0, spread: 0.12, baseSpread: 0.35,
      bleed: rng.chance(0.35) ? { color: EU.bloom, frac: 0.6, alpha: 0.35 } : null, pencilAmt: 0.25,
    });
    // nervadura central
    const c = ctx2d(pet.canvas);
    c.save();
    c.globalCompositeOperation = 'source-atop';
    c.strokeStyle = hslStr(shift(EU.leaf.edge, 0, 0, -4), 0.45);
    c.lineWidth = 0.6 * scale;
    c.beginPath();
    c.moveTo(pet.ax, pet.ay);
    c.quadraticCurveTo(pet.ax + rng.gauss(0, 1) * scale, pet.ay - pet.L * 0.5, pet.ax + rng.gauss(0, 1.5) * scale, pet.ay - pet.L * 0.88);
    c.stroke();
    c.restore();
    const rot = p.ang + Math.PI / 2 + side * (62 + rng.gauss(0, 10)) * D;
    parts.push(part(sprite(pet, scale), {
      x: p.x, y: p.y, rot, sx: rng.chance(0.5) ? 1 : -1, sy: rng.range(0.8, 1), rot0: p.ang + Math.PI / 2, sx0: 0.1, sy0: 0.1,
      delay: 0.1 + t * 0.45, dur: 0.45,
    }));
    parts[parts.length - 1].sx0 *= Math.sign(parts[parts.length - 1].sx);
  }
  return { parts, r: L * 0.5, kind: 'eucalyptus' };
}

// ------------------------------------------------------------------ helecho
const FE = {
  pinna: { main: hsl('#4F6E3E'), deep: hsl('#34502E'), edge: hsl('#243C24'), tip: hsl('#7A944E') },
  pinnaB: { main: hsl('#5E7C44'), deep: hsl('#3F5B3A'), edge: hsl('#2A4228'), tip: hsl('#8FA35A') },
  stem: hsl('#4E6A36'),
};

export function bakeFern({ seed = 'helecho', scale = 2, L = 150, dir = 1 } = {}) {
  const rng = makeRng(seed);
  const parts = [];
  const bend = dir * L * 0.22;
  const rachis = bezier({ x: 0, y: 0 }, { x: bend * 0.1, y: -L * 0.4 }, { x: bend * 0.7, y: -L * 0.75 }, { x: bend * 1.3, y: -L * 0.98 }, 40);
  parts.push(part(paintStems(`${seed}st`, [{ pts: rachis, w0: 1.8, w1: 0.5 }], scale, FE.stem), { sx: 1, sx0: 1, sy0: 1, revealR: L * 1.1, delay: 0, dur: 0.6, a0: 1 }));
  const kk = L / 150;
  const set = petalSet(`${seed}p`, 8, scale, (i) => ({
    L: 18 * kk, W: rng.range(4.2, 5.4) * kk, widest: 0.35, base: 0.35, tip: 'point', asym: rng.gauss(0, 0.2), bend: rng.gauss(0, 0.1),
    colors: i % 3 === 0 ? FE.pinnaB : FE.pinna, layers: 14, alpha: 0.08, deep: [0.4], liftAmt: 0.35, rim: 1.2, grainAmt: 0.4,
    spread: 0.1, baseSpread: 0.25,
  }));
  const pairs = 17;
  for (let i = 0; i < pairs; i++) {
    const t = 0.2 + (i / pairs) * 0.78;
    const p = pointAt(rachis, t);
    const len = (1 - Math.pow((t - 0.2) / 0.8, 1.3) * 0.82) * rng.range(0.9, 1.05) * (t < 0.3 ? 0.85 + (t - 0.2) * 1.5 : 1);
    for (const side of [-1, 1]) {
      const off = side === 1 ? 0.012 : 0; // alternas, apenas desfasadas
      const q = off ? pointAt(rachis, Math.min(1, t + off)) : p;
      const rot = q.ang + Math.PI / 2 + side * (58 + rng.gauss(0, 6)) * D;
      const img = set[Math.floor(rng.next() * set.length)];
      parts.push(part(img, {
        x: q.x, y: q.y, rot, sx: side, sy: len * 1.1, rot0: q.ang + Math.PI / 2, sx0: 0.2 * side, sy0: 0.05,
        delay: 0.12 + t * 0.55, dur: 0.4,
      }));
    }
  }
  const tip = pointAt(rachis, 0.995);
  parts.push(part(set[0], { x: tip.x, y: tip.y, rot: tip.ang + Math.PI / 2, sx: 0.7, sy: 0.35, sx0: 0.1, sy0: 0.05, delay: 0.7, dur: 0.3 }));
  return { parts, r: L * 0.5, kind: 'fern' };
}

// --------------------------------------------------------------- paniculata
const PA = { stem: hsl('#8C9A70'), shade: hsl('#9C9A92'), shadeV: hsl('#A89AA8'), center: hsl('#B8B070'), flower: hsl('#FFFBF1') };

// Una florecita: papel reservado con sombra de color de un lado.
function floret(c, x, y, rad, rng, s) {
  const r = rad * s;
  // sombra (abajo a la derecha) con color: gris verdoso o violáceo, nunca gris puro
  const sh = rng.chance(0.5) ? PA.shade : PA.shadeV;
  c.fillStyle = hslStr(shift(sh, rng.gauss(0, 6), 8, rng.gauss(0, 5) + 6), 0.3);
  c.beginPath();
  c.ellipse(x + r * 0.3, y + r * 0.34, r * 0.9, r * 0.75, rng.next() * 3, 0, Math.PI * 2);
  c.fill();
  // cuerpo de papel (más claro que el fondo: casi sin pigmento)
  c.fillStyle = hslStr(shift(PA.flower, 0, 0, rng.gauss(0, 1)), 0.97);
  c.beginPath();
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + rng.next();
    const pr = r * rng.range(0.55, 0.75);
    c.moveTo(x + Math.cos(a) * r * 0.35, y + Math.sin(a) * r * 0.35);
    c.arc(x + Math.cos(a) * r * 0.42, y + Math.sin(a) * r * 0.42, pr, 0, Math.PI * 2);
  }
  c.fill();
  c.fillStyle = hslStr(shift(PA.center, rng.gauss(0, 8), 0, rng.gauss(0, 8) + 8), 0.35);
  c.beginPath();
  c.arc(x + rng.gauss(0, r * 0.12), y + rng.gauss(0, r * 0.12), r * 0.13, 0, Math.PI * 2);
  c.fill();
}

export function bakeBabysBreath({ seed = 'paniculata', scale = 2, L = 95, dir = 1 } = {}) {
  const rng = makeRng(seed);
  const parts = [];
  const paths = [];
  const clusters = [];
  function branch(x, y, ang, len, depth, w) {
    const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
    const mx = x + Math.cos(ang) * len * 0.5 + rng.gauss(0, len * 0.08), my = y + Math.sin(ang) * len * 0.5;
    paths.push({ pts: bezier({ x, y }, { x: mx, y: my }, { x: mx, y: my }, { x: ex, y: ey }, 8), w0: w, w1: w * 0.7 });
    if (depth === 0 || len < 7) {
      clusters.push({ x: ex, y: ey, depth });
      return;
    }
    const k = depth > 2 ? 2 : rng.chance(0.6) ? 3 : 2;
    for (let i = 0; i < k; i++) {
      const spread = (k === 2 ? (i ? 1 : -1) * 28 : (i - 1) * 32) + rng.gauss(0, 9);
      branch(ex, ey, ang + spread * D, len * rng.range(0.58, 0.75), depth - 1, w * 0.72);
    }
  }
  branch(0, 0, -Math.PI / 2 + dir * 8 * D, L * 0.42, 4, 1.4);
  parts.push(part(paintStems(`${seed}st`, paths, scale, PA.stem, { passes: 4, alpha: 0.3, rim: 0.5 }), { sx: 1, sx0: 1, sy0: 1, revealR: L * 1.1, delay: 0, dur: 0.55, a0: 1 }));
  // tandas de florecitas: cada racimo es un sprite y brota a su tiempo
  clusters.forEach((cl, i) => {
    const R = 9 * (L / 95);
    const size = R * 2.6 * scale;
    const cv = makeCanvas(size, size);
    const c = ctx2d(cv);
    const n = rng.int(6, 11);
    const pts = [];
    for (let k = 0; k < n; k++) {
      const a = rng.next() * Math.PI * 2, d = Math.sqrt(rng.next()) * R * 0.85;
      pts.push({ x: size / 2 + Math.cos(a) * d * scale, y: size / 2 + Math.sin(a) * d * scale * 0.85, r: rng.range(1.5, 2.4) * Math.sqrt(L / 95) });
    }
    // ramitas mínimas hacia cada florecita
    c.strokeStyle = hslStr(PA.stem, 0.5);
    c.lineWidth = 0.45 * scale;
    for (const p of pts) {
      c.beginPath();
      c.moveTo(size / 2, size / 2 + R * 0.3 * scale);
      c.lineTo(p.x, p.y);
      c.stroke();
    }
    pts.sort((a, b) => a.y - b.y);
    for (const p of pts) floret(c, p.x, p.y, p.r, rng, scale);
    const dist = Math.hypot(cl.x, cl.y) / L;
    parts.push(part({ canvas: cv, ax: size / 2, ay: size / 2, s: scale }, {
      x: cl.x, y: cl.y, sx: 1, sx0: 0.1, delay: 0.3 + dist * 0.35 + (i % 3) * 0.05, dur: 0.35,
    }));
  });
  return { parts, r: L * 0.5, kind: 'paniculata' };
}
