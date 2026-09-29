// Piezas compartidas entre flores: sprites, discos, sombras y variantes.
import { makeRng } from '../paint/rng.js';
import { makeCanvas, ctx2d, softBlurInto, freeCanvas } from '../paint/canvas.js';
import { glaze, edgeDarken, granulate, paperUnderlay } from '../paint/brush.js';
import { getPaper } from '../paint/paper.js';
import { paintPetal } from '../paint/petal.js';

export const D = Math.PI / 180;
export const GOLDEN = 137.508 * D;

export function sprite(p, s) {
  return { canvas: p.canvas, ax: p.ax, ay: p.ay, s, petal: p.L ? { L: p.L, W: p.W } : null };
}

export function ellipsePoly(cx, cy, rx, ry, n, rng, j = 0.1) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    const f = rng ? rng.range(1 - j, 1 + j) : 1;
    out.push({ x: cx + Math.cos(a) * rx * f, y: cy + Math.sin(a) * ry * f });
  }
  return out;
}

// Mancha blanda de sombra con color (siena, violeta, carmín).
export function softBlob(seed, rx, ry, s, color, alpha = 0.5) {
  const rng = makeRng(seed);
  const w = rx * s * 3, h = ry * s * 3;
  const cv = makeCanvas(w, h);
  const c = ctx2d(cv);
  glaze(c, [{ poly: ellipsePoly(w / 2, h / 2, rx * s, ry * s, 10, rng, 0.15), color, alpha: 0.1 * alpha, count: 20, baseRounds: 4, rounds: 3, spread: 0.6, drift: 5 }], rng);
  const b = softBlurInto(cv, 5, 1);
  freeCanvas(cv);
  return { canvas: b, ax: w / 2, ay: h / 2, s };
}

// Hornea n variantes de pétalo con la misma receta y semillas distintas.
export function petalSet(seed, n, s, opts) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const o = typeof opts === 'function' ? opts(i) : opts;
    out.push(sprite(paintPetal({ ...o, seed: `${seed}-${i}`, scale: s }), s));
  }
  return out;
}

// Termina un disco pintado a mano: borde oscuro, granulación y papel.
export function finishDisc(cv, poly, rng, edge, deep, rim = 1.1) {
  const paper = getPaper();
  edgeDarken(cv, edge, rim, 5);
  granulate(cv, paper.grain, deep, 0.4);
  paperUnderlay(cv, paper.paper, 0, 0, 3, poly, rng);
}
