// Tallos y ramitas: varias pasadas de ancho variable y baja opacidad a lo
// largo de un camino, con borde oscuro y granulación. Sin filtros.
import { makeRng } from './rng.js';
import { makeCanvas, ctx2d } from './canvas.js';
import { hslStr, shift } from './color.js';
import { edgeDarken, granulate, tracePoly } from './brush.js';
import { getPaper } from './paper.js';

// Contorno de un trazo de ancho variable a lo largo de pts.
export function ribbon(pts, wf, off = 0) {
  const L = [], R = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let nx = -(b.y - a.y), ny = b.x - a.x;
    const d = Math.hypot(nx, ny) || 1;
    nx /= d; ny /= d;
    const w = Math.max(0.35, wf(i / (n - 1))) / 2;
    L.push({ x: pts[i].x + nx * (w + off), y: pts[i].y + ny * (w + off) });
    R.push({ x: pts[i].x - nx * (w - off), y: pts[i].y - ny * (w - off) });
  }
  return [...L, ...R.reverse()];
}

// Curva cuadrática/cúbica muestreada.
export function bezier(p0, p1, p2, p3, n = 24) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push({
      x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
    });
  }
  return out;
}

export function pathLength(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return L;
}

export function pointAt(pts, t) {
  const L = pathLength(pts) * t;
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (acc + d >= L) {
      const k = d ? (L - acc) / d : 0;
      const a = pts[i - 1], b = pts[i];
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, ang: Math.atan2(b.y - a.y, b.x - a.x) };
    }
    acc += d;
  }
  const a = pts[pts.length - 2], b = pts[pts.length - 1];
  return { x: b.x, y: b.y, ang: Math.atan2(b.y - a.y, b.x - a.x) };
}

/**
 * Pinta uno o varios caminos (en unidades) en un sprite con ancla en origin.
 * paths: [{ pts, w0, w1 }]
 */
export function paintStems(seed, paths, s, color, { origin = { x: 0, y: 0 }, passes = 7, alpha = 0.22, rim = 0.9, light = null } = {}) {
  const rng = makeRng(seed);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of paths) for (const q of p.pts) {
    x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y);
  }
  const pad = 6;
  x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
  const cv = makeCanvas((x1 - x0) * s, (y1 - y0) * s);
  const c = ctx2d(cv);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  const tx = (q) => ({ x: (q.x - x0) * s, y: (q.y - y0) * s });
  for (const p of paths) {
    const pts = p.pts.map(tx);
    // cada pasada es una cinta (polígono) continua: sin cuentas en las uniones
    for (let k = 0; k < passes; k++) {
      const col = shift(color, rng.gauss(0, 5), rng.gauss(0, 4), rng.gauss(0, 4));
      c.fillStyle = hslStr(col, alpha);
      const off = rng.gauss(0, 0.2) * s;
      const wk = rng.range(0.7, 1.12);
      const ph = rng.next() * 6;
      tracePoly(c, ribbon(pts, (t) => (p.w0 + (p.w1 - p.w0) * t) * s * wk * (1 + 0.12 * Math.sin(t * 9 + ph)), off));
      c.fill();
    }
    if (light) {
      // una línea de luz (papel) a lo largo del tallo, del lado de la ventana
      c.save();
      c.globalCompositeOperation = 'destination-out';
      c.strokeStyle = 'rgba(0,0,0,0.35)';
      for (let i = 1; i < pts.length; i++) {
        const t = i / (pts.length - 1);
        c.lineWidth = Math.max(0.4, (p.w0 + (p.w1 - p.w0) * t) * s * 0.25);
        c.beginPath();
        c.moveTo(pts[i - 1].x - (p.w0 * s) * 0.18, pts[i - 1].y);
        c.lineTo(pts[i].x - (p.w0 * s) * 0.18, pts[i].y);
        c.stroke();
      }
      c.restore();
    }
  }
  edgeDarken(cv, shift(color, 0, 0, -18), rim, 3);
  granulate(cv, getPaper().grain, shift(color, 0, 0, -14), 0.35);
  return { canvas: cv, ax: (origin.x - x0) * s, ay: (origin.y - y0) * s, s };
}
