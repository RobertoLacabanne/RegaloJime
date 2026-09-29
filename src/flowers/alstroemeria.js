// Alstroemeria amarilla: racimo de 2–3 flores; 6 tépalos (3 externos anchos
// con punta verdosa, 3 internos angostos, los dos superiores con rayitas
// marrón-burdeos) y estambres curvos.
import { makeRng } from '../paint/rng.js';
import { hsl, shift, hslStr } from '../paint/color.js';
import { makeCanvas, ctx2d } from '../paint/canvas.js';
import { part } from '../scene/head.js';
import { paintStems, bezier } from '../paint/stem.js';
import { D, sprite } from './common.js';
import { paintPetal } from '../paint/petal.js';

const C = {
  outer: { main: hsl('#F5CD3C'), deep: hsl('#E6A416'), edge: hsl('#B87410'), tip: hsl('#B8C45A') },
  inner: { main: hsl('#F8DC6A'), deep: hsl('#EDB22A'), edge: hsl('#C07E14') },
  stripe: hsl('#6E1C2C'),
  stem: hsl('#6F8A45'),
};

function stamens(seed, r, s) {
  const rng = makeRng(seed);
  const size = r * 2 * s;
  const cv = makeCanvas(size, size);
  const c = ctx2d(cv);
  const cx = size / 2, cy = size * 0.62;
  c.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const a = (-90 + (i - 2.5) * 13 + rng.gauss(0, 4)) * D;
    const L = r * rng.range(0.55, 0.8) * s;
    const ex = cx + Math.cos(a) * L, ey = cy + Math.sin(a) * L;
    const mx = cx + Math.cos(a) * L * 0.5 + L * 0.12, my = cy + Math.sin(a) * L * 0.5;
    c.strokeStyle = hslStr(shift(hsl('#C9B86A'), 0, 0, rng.gauss(0, 5)), 0.7);
    c.lineWidth = 0.5 * s;
    c.beginPath();
    c.moveTo(cx, cy);
    c.quadraticCurveTo(mx, my, ex, ey);
    c.stroke();
    c.fillStyle = hslStr(shift(hsl('#7A3A22'), rng.gauss(0, 8), 0, rng.gauss(0, 6)), 0.85);
    c.beginPath();
    c.ellipse(ex, ey, 1.1 * s, 0.7 * s, a, 0, Math.PI * 2);
    c.fill();
  }
  return { canvas: cv, ax: cx, ay: cy, s };
}

export function bakeAlstroemeria({ seed = 'alstro', scale = 2, r = 21 } = {}) {
  const rng = makeRng(seed);
  const n = rng.chance(0.5) ? 3 : 2;
  const parts = [];
  // posiciones de las flores del racimo (relativas al punto de unión)
  const heads = [];
  for (let i = 0; i < n; i++) {
    const a = ((i - (n - 1) / 2) * 42 + rng.gauss(0, 6)) * D;
    const d = r * rng.range(1.25, 1.6);
    heads.push({ x: Math.sin(a) * d, y: -Math.cos(a) * d - r * 0.3, tilt: a * 0.6, sc: rng.range(0.85, 1.05) });
  }
  const pedicels = heads.map((h) => ({ pts: bezier({ x: 0, y: 0 }, { x: h.x * 0.1, y: h.y * 0.5 }, { x: h.x * 0.7, y: h.y * 0.8 }, { x: h.x, y: h.y + r * 0.35 }, 14), w0: 1.6, w1: 1.1 }));
  parts.push(part(paintStems(`${seed}p`, pedicels, scale, C.stem), { sx: 1, sx0: 1, sy0: 1, revealR: r * 3, delay: 0, dur: 0.45, a0: 1 }));
  heads.sort((a, b) => a.y - b.y);
  heads.forEach((h, hi) => {
    const base = 0.25 + hi * 0.15;
    const tep = [];
    for (let k = 0; k < 6; k++) {
      const outer = k % 2 === 0;
      const ang = (k * 60 + (outer ? 0 : 0) + rng.gauss(0, 5)) * D + h.tilt;
      const upper = !outer && Math.cos(ang - h.tilt) > 0.2;
      const pet = paintPetal({
        seed: `${seed}${hi}t${k}`, scale, L: r * (outer ? 1.0 : 0.9) * h.sc, W: r * (outer ? 0.62 : 0.42) * h.sc,
        widest: 0.6, base: 0.2, tip: 'point', asym: rng.gauss(0, 0.2), bend: rng.gauss(0, 0.08),
        colors: outer ? C.outer : C.inner, layers: 24, alpha: 0.055, deep: [0.25, 0.45, 0.6], liftAmt: 0.5, rim: 1.1,
        stripes: upper ? { n: 7, color: C.stripe, width: 0.45, alpha: 0.75 } : null, spread: 0.14, baseSpread: 0.4,
        pencilAmt: 0.2,
      });
      tep.push({ img: sprite(pet, scale), ang, outer, k });
    }
    // externos primero (quedan detrás), internos encima
    tep.sort((a, b) => (a.outer === b.outer ? 0 : a.outer ? -1 : 1));
    tep.forEach((t, i) => {
      const fore = 0.72 + 0.28 * Math.abs(Math.sin(t.ang - h.tilt));
      parts.push(part(t.img, {
        x: h.x, y: h.y, rot: t.ang, sx: 1, sy: fore, rot0: h.tilt + (t.ang - h.tilt) * 0.15, sx0: 0.35, sy0: 0.4,
        delay: base + i * 0.03, dur: 0.5,
      }));
    });
    parts.push(part(stamens(`${seed}s${hi}`, r * h.sc, scale), { x: h.x, y: h.y, rot: h.tilt, sx: 1, sx0: 0.2, delay: base + 0.25, dur: 0.4 }));
  });
  return { parts, r: r * 2.2, kind: 'alstroemeria' };
}
