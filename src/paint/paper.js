// Papel de algodón: ruido de valor periódico (tileable) con relieve iluminado
// desde arriba a la izquierda, más fibras. Se hornea una vez y se reutiliza
// en el fondo y dentro de cada sprite, para que todo parezca una misma hoja.
import { makeRng } from './rng.js';
import { makeCanvas, ctx2d } from './canvas.js';

const TILE = 512;
let cache = null;

function periodicNoise(rng, size, period) {
  const n = Math.max(2, Math.round(size / period));
  const lat = new Float32Array(n * n);
  for (let i = 0; i < lat.length; i++) lat[i] = rng.next();
  const out = new Float32Array(size * size);
  const sc = n / size;
  for (let y = 0; y < size; y++) {
    const fy = y * sc, y0 = Math.floor(fy), ty = fy - y0;
    const sy = ty * ty * (3 - 2 * ty);
    const r0 = (y0 % n) * n, r1 = ((y0 + 1) % n) * n;
    for (let x = 0; x < size; x++) {
      const fx = x * sc, x0 = Math.floor(fx), tx = fx - x0;
      const sx = tx * tx * (3 - 2 * tx);
      const c0 = x0 % n, c1 = (x0 + 1) % n;
      const a = lat[r0 + c0] + (lat[r0 + c1] - lat[r0 + c0]) * sx;
      const b = lat[r1 + c0] + (lat[r1 + c1] - lat[r1 + c0]) * sx;
      out[y * TILE + x] = a + (b - a) * sy;
    }
  }
  return out;
}

// Devuelve { height: Float32Array, paper: canvas, grain: canvas }
// - paper: color crema con relieve (opaco).
// - grain: alfa = profundidad del valle (para granulación del pigmento).
// - light: alfa = cresta iluminada (para reservar blancos con textura).
export function getPaper(scale = 1) {
  if (cache) return cache;
  const rng = makeRng('papel-de-algodon');
  const S = TILE;
  // Escalas pensadas para ~px CSS*2 (dpr 2): celdas de 5–7 px CSS.
  const o1 = periodicNoise(rng, S, 5 * scale);
  const o2 = periodicNoise(rng, S, 14 * scale);
  const o3 = periodicNoise(rng, S, 40 * scale);
  const o4 = periodicNoise(rng, S, 2 * scale);
  const h = new Float32Array(S * S);
  for (let i = 0; i < h.length; i++) {
    // "Pelotitas" del cold-press: valor absoluto para crestas redondeadas.
    // Granos redondeados (no crestas): suavizado del ruido fino.
    const b = o1[i];
    const bump = b * b * (3 - 2 * b);
    h[i] = bump * 0.42 + o2[i] * 0.3 + o3[i] * 0.16 + o4[i] * 0.12;
  }
  // Fibras: trazos finos y largos apenas más claros.
  const fib = new Float32Array(S * S);
  for (let k = 0; k < 260; k++) {
    let x = rng.next() * S, y = rng.next() * S;
    let a = rng.next() * Math.PI * 2;
    const len = 20 + rng.next() * 70;
    const str = 0.04 + rng.next() * 0.08;
    for (let t = 0; t < len; t++) {
      a += rng.gauss(0, 0.08);
      x += Math.cos(a); y += Math.sin(a);
      const ix = ((Math.round(x) % S) + S) % S, iy = ((Math.round(y) % S) + S) % S;
      fib[iy * S + ix] += str;
    }
  }
  const paper = makeCanvas(S, S);
  const grain = makeCanvas(S, S);
  const light = makeCanvas(S, S);
  const pc = ctx2d(paper), gc = ctx2d(grain), lc = ctx2d(light);
  const pd = pc.createImageData(S, S), gd = gc.createImageData(S, S), ld = lc.createImageData(S, S);
  // Crema #FBF3E4 = 251,243,228
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      const xl = y * S + ((x - 1 + S) % S), yu = ((y - 1 + S) % S) * S + x;
      // Relieve con luz desde arriba a la izquierda.
      const shade = (h[i] - h[xl]) * 1.1 + (h[i] - h[yu]) * 1.1;
      const v = shade * 26 + (h[i] - 0.45) * 8 + fib[i] * 30;
      const p = i * 4;
      pd.data[p] = clamp(251 + v * 0.55);
      pd.data[p + 1] = clamp(243 + v * 0.62 - 1);
      pd.data[p + 2] = clamp(228 + v * 0.8 - 2);
      pd.data[p + 3] = 255;
      // Valles: donde se asienta el pigmento.
      const valley = Math.max(0, 0.52 - h[i]) * 2.3 + Math.max(0, -shade) * 3;
      gd.data[p] = 0; gd.data[p + 1] = 0; gd.data[p + 2] = 0;
      gd.data[p + 3] = clamp(valley * valley * 255);
      const crest = Math.max(0, h[i] - 0.5) * 2 + Math.max(0, shade) * 3;
      ld.data[p + 3] = clamp(crest * 255);
    }
  }
  pc.putImageData(pd, 0, 0);
  gc.putImageData(gd, 0, 0);
  lc.putImageData(ld, 0, 0);
  cache = { paper, grain, light, size: S };
  return cache;
}

function clamp(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

// Rellena el rectángulo con un patrón alineado al "mundo" (ox, oy = origen
// del sprite en px del mundo), para que el grano coincida con el del fondo.
export function fillPattern(ctx, tile, w, h, ox = 0, oy = 0, alpha = 1) {
  const pat = ctx.createPattern(tile, 'repeat');
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(-ox, -oy);
  ctx.fillStyle = pat;
  ctx.fillRect(ox, oy, w, h);
  ctx.restore();
}
