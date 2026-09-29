// Rosa en vista 3/4: pétalos anclados al receptáculo, anillo trasero visto
// por dentro (más oscuro), espiral central, paredes de copa vistas por
// fuera y pétalos externos abiertos con el borde revirado.
import { makeRng } from '../paint/rng.js';
import { hsl, shift } from '../paint/color.js';
import { makeCanvas, ctx2d, softBlurInto, freeCanvas } from '../paint/canvas.js';
import { paintPetal } from '../paint/petal.js';
import { glaze, edgeDarken, granulate, paperUnderlay, liftSoft, edgeStrokes } from '../paint/brush.js';
import { getPaper } from '../paint/paper.js';
import { part } from '../scene/head.js';

const D = Math.PI / 180;

const PALETTES = {
  red: {
    back: { main: hsl('#8A0C28'), deep: hsl('#4C0725'), edge: hsl('#340830') },
    wall: { main: hsl('#AC1530'), deep: hsl('#6E0A26'), edge: hsl('#43092C'), tip: hsl('#C73A45') },
    outer: { main: hsl('#B51D33'), deep: hsl('#7A0E2A'), edge: hsl('#4A0C2E'), tip: hsl('#CE4A4E') },
    center: { main: hsl('#6E0A26'), deep: hsl('#3E0626'), edge: hsl('#2A0624') },
    shadow: hsl('#3A0A30'),
  },
  yellow: {
    back: { main: hsl('#EBB22A'), deep: hsl('#D28310'), edge: hsl('#A8560C') },
    wall: { main: hsl('#F4CF4E'), deep: hsl('#E6A214'), edge: hsl('#BB6D0E'), tip: hsl('#F6DC80') },
    outer: { main: hsl('#F5D35A'), deep: hsl('#E9A81E'), edge: hsl('#C47610'), tip: hsl('#F08A24') },
    center: { main: hsl('#E39A1C'), deep: hsl('#C06A10'), edge: hsl('#8E4A12') },
    shadow: hsl('#9A4A18'),
  },
};

function jit(rng, c, k = 1) {
  return { main: shift(c.main, rng.gauss(0, 3 * k), rng.gauss(0, 3 * k), rng.gauss(0, 2.5 * k)), deep: c.deep, edge: c.edge, tip: c.tip };
}

function sprite(p, s) {
  return { canvas: p.canvas, ax: p.ax, ay: p.ay, s, petal: p.L ? { L: p.L, W: p.W } : null };
}

// Espiral central: medialunas oscuras superpuestas con papel entre ellas.
function paintCenter(seed, r, s, pal) {
  const rng = makeRng(seed);
  const paper = getPaper();
  const R = r * s;
  const size = R * 2.8;
  const cv = makeCanvas(size, size);
  const c = ctx2d(cv);
  const cx = size / 2, cy = size / 2;
  // base: cuenco oscuro
  const bowl = [];
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    bowl.push({ x: cx + Math.cos(a) * R * 0.95, y: cy + Math.sin(a) * R * 0.7 });
  }
  glaze(c, [{ poly: bowl, color: pal.main, alpha: 0.04, count: 28, baseRounds: 3, rounds: 3, spread: 0.3, baseSpread: 0.4, drift: 4 }], rng);
  // medialunas en espiral (de afuera hacia adentro)
  const arcs = 7;
  for (let i = 0; i < arcs; i++) {
    const t = i / arcs;
    const rad = R * (0.92 - t * 0.78);
    const a0 = (-200 + i * 115 + rng.gauss(0, 15)) * D;
    const span = (150 + rng.gauss(0, 20)) * D;
    const th = rad * (0.32 + rng.range(0, 0.12));
    const oy = -R * 0.12 * t;
    const pts = [];
    const n = 10;
    for (let k = 0; k <= n; k++) {
      const a = a0 + (span * k) / n;
      const w = Math.sin((k / n) * Math.PI);
      pts.push({ x: cx + Math.cos(a) * (rad + th * 0.5 * w), y: cy + oy + Math.sin(a) * (rad + th * 0.5 * w) * 0.72 });
    }
    for (let k = n; k >= 0; k--) {
      const a = a0 + (span * k) / n;
      const w = Math.sin((k / n) * Math.PI);
      pts.push({ x: cx + Math.cos(a) * (rad - th * 0.5 * w), y: cy + oy + Math.sin(a) * (rad - th * 0.5 * w) * 0.72 });
    }
    // luz de papel justo por encima de cada medialuna (separación)
    liftSoft(cv, pts.map((p) => ({ x: p.x, y: p.y - th * 0.35 })), rng, { alpha: 0.55, blur: 3, hard: 0.35 });
    glaze(c, [{ poly: pts, color: i % 2 ? pal.deep : shift(pal.main, 0, 0, -4), alpha: 0.07, count: 14, baseRounds: 2, rounds: 3, spread: 0.2, baseSpread: 0.25, drift: 3 }], rng);
  }
  edgeDarken(cv, pal.edge, 1.2, 4);
  granulate(cv, paper.grain, pal.edge, 0.3);
  paperUnderlay(cv, paper.paper, 0, 0, 3, bowl, rng);
  return { canvas: cv, ax: cx, ay: cy, s };
}

export function shadowBlob(seed, rx, ry, s, color, alpha = 0.5) {
  const rng = makeRng(seed);
  const w = rx * s * 3, h = ry * s * 3;
  const cv = makeCanvas(w, h);
  const c = ctx2d(cv);
  const poly = [];
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    poly.push({ x: w / 2 + Math.cos(a) * rx * s * rng.range(0.8, 1.1), y: h / 2 + Math.sin(a) * ry * s * rng.range(0.8, 1.1) });
  }
  glaze(c, [{ poly, color, alpha: 0.05 * alpha * 2, count: 20, baseRounds: 4, rounds: 3, spread: 0.6, drift: 5 }], rng);
  const b = softBlurInto(cv, 5, 1);
  freeCanvas(cv);
  return { canvas: b, ax: w / 2, ay: h / 2, s };
}

export function bakeRose({ seed = 'rosa', variant = 'red', scale = 2, r = 34 } = {}) {
  const rng = makeRng(seed + variant);
  const P = PALETTES[variant];
  const parts = [];
  const R = { x: 0, y: r * 0.32 };
  const common = { scale, pencilAmt: variant === 'red' ? 0.35 : 0.25, grainAmt: 0.32, alpha: variant === 'red' ? 0.03 : 0.036, rim: variant === 'red' ? 1.7 : 1.3 };

  // 1) Pétalos externos abiertos (laterales y abajo), borde revirado.
  const outerAngles = [-112, 108, -74, 76, 150 + rng.gauss(0, 10), -155 + rng.gauss(0, 8)];
  outerAngles.forEach((deg, i) => {
    const a = (deg + rng.gauss(0, 6)) * D;
    const L = r * rng.range(0.88, 1.02), W = r * rng.range(0.9, 1.08);
    const opts = {
      ...common, seed: `${seed}o${i}`, L, W, widest: 0.62, base: 0.22, tip: 'peak', tipDepth: 0.1,
      asym: rng.gauss(0, 0.25), bend: rng.gauss(0, 0.06), colors: jit(rng, P.outer), reflex: rng.chance(0.45) ? 0.9 : 0, gap: rng.chance(0.5) ? 0.025 : 0, cup: 0.5, liftAmt: variant === 'red' ? 0.45 : 0.6,
    };
    const open = sprite(paintPetal(opts), scale);
    const closed = sprite(paintPetal({ ...opts, seed: `${seed}oc${i}`, W: W * 0.6, reflex: 0, liftAmt: 0.3, colors: P.back }), scale);
    parts.push(part(open, {
      closed, x: R.x + Math.sin(a) * r * 0.12, y: R.y - Math.cos(a) * r * 0.1, rot: a, sx: 1, sy: 0.82,
      rot0: a * 0.12, sx0: 0.5, sy0: 0.6, delay: 0.3 + i * 0.05, dur: 0.55,
    }));
  });

  // Cuerpo: lavado oscuro de fondo que une la flor (sin huecos de papel).
  parts.unshift(part(shadowBlob(`${seed}body`, r * 0.7, r * 0.55, scale, P.back.deep, 0.9), { x: 0, y: r * 0.1, sx: 1, sx0: 0.3, delay: 0, dur: 0.5 }));

  // Sombra pintada dentro de la copa (color, nunca gris).
  parts.push(part(shadowBlob(`${seed}s`, r * 0.62, r * 0.42, scale, P.shadow, 0.55), { x: 0, y: -r * 0.05, sx: 1, sx0: 0.4, delay: 0.1, dur: 0.6 }));

  // 2) Anillo trasero, visto por dentro.
  [-38, 6, 34].forEach((deg, i) => {
    const a = (deg + rng.gauss(0, 5)) * D;
    const L = r * rng.range(1.02, 1.15), W = r * rng.range(0.85, 1.0);
    const pet = paintPetal({
      ...common, seed: `${seed}b${i}`, L, W, widest: 0.66, base: 0.25, tip: rng.chance(0.5) ? 'peak' : 'flat', tipDepth: 0.1,
      asym: rng.gauss(0, 0.2), bend: rng.gauss(0, 0.05), colors: jit(rng, P.back), reflex: rng.chance(0.5) ? 0.6 : 0, gap: rng.chance(0.4) ? 0.025 : 0, liftAmt: 0.3, deep: [0.4, 0.6, 0.8],
    });
    parts.push(part(sprite(pet, scale), {
      x: R.x, y: R.y, rot: a, sx: 1, sy: 0.95, rot0: a * 0.2, sx0: 0.55, sy0: 0.7, delay: 0.05 + i * 0.04, dur: 0.6,
    }));
  });

  // 3) Espiral central.
  const center = paintCenter(`${seed}c`, r * 0.48, scale, P.center);
  parts.push(part(center, { x: rng.gauss(0, 1), y: -r * 0.18, rot: rng.gauss(0, 0.1), sx: 1, sx0: 0.7, delay: 0, dur: 0.5, a0: 1 }));

  // 4) Paredes de la copa (por fuera), cubren la base de la espiral.
  const walls = [
    { dx: -0.32, deg: -26, L: 0.78, W: 0.78 },
    { dx: 0.3, deg: 24, L: 0.8, W: 0.8 },
    { dx: 0.02, deg: rng.gauss(0, 5), L: 0.66, W: 1.0 },
  ];
  walls.forEach((w, i) => {
    const a = w.deg * D;
    const pet = paintPetal({
      ...common, seed: `${seed}w${i}`, L: r * w.L, W: r * w.W, widest: 0.72, base: 0.35, tip: 'flat', tipDepth: 0.08,
      asym: -Math.sign(w.deg) * 0.3, bend: 0, colors: jit(rng, P.wall, 0.8), reflex: i === 2 ? 1 : 0, gap: 0.03, cup: 0.6, liftAmt: variant === 'red' ? 0.5 : 0.65,
      deep: [0.25, 0.42], splat: i === 2 ? 5 : 0,
    });
    parts.push(part(sprite(pet, scale), {
      x: R.x + w.dx * r, y: R.y + r * 0.12, rot: a, sx: 1, sy: 0.9, rot0: a * 0.3, sx0: 0.6, sy0: 0.8, y0: R.y + r * 0.1, delay: 0.12 + i * 0.06, dur: 0.55,
    }));
  });

  return { parts, r, kind: 'rose', variant };
}
