// Laboratorio de estudios estáticos: /lab.html?s=petal&zoom=2
import { getPaper, fillPattern } from './paint/paper.js';
import { paintPetal } from './paint/petal.js';
import { hsl, PALETTE } from './paint/color.js';
import { bakeRose } from './flowers/rose.js';
import { bakeGerbera } from './flowers/gerbera.js';
import { bakeChrysanthemum } from './flowers/chrysanthemum.js';
import { bakeAlstroemeria } from './flowers/alstroemeria.js';
import { bakeFreesia } from './flowers/freesia.js';
import { bakeEucalyptus, bakeFern, bakeBabysBreath } from './flowers/greens.js';
import { drawHead } from './scene/head.js';
import { canvasStats, canvasMB } from './paint/canvas.js';


const params = new URLSearchParams(location.search);
const study = params.get('s') || 'petal';
const zoom = parseFloat(params.get('zoom') || '1');
const dpr = Math.min(3, window.devicePixelRatio || 1);
const cv = document.getElementById('lab');
const W = innerWidth, H = innerHeight;
cv.width = W * dpr; cv.height = H * dpr;
const ctx = cv.getContext('2d');
cv.addEventListener('contextlost', () => console.log('CONTEXT LOST'));

function background() {
  const p = getPaper();
  fillPattern(ctx, p.paper, cv.width, cv.height, 0, 0);
}

// Dibuja una cabeza en unidades de escena (1 unidad = 1 px CSS * zoom).
function head(h, x, y, t = 1, z = zoom) {
  ctx.save();
  ctx.translate(x * dpr, y * dpr);
  ctx.scale(dpr * z, dpr * z);
  drawHead(ctx, h, t);
  ctx.restore();
}

const studies = {
  // Ícono de la app: una rosa pintada sobre el papel (se captura en PNG).
  icon() {
    const s = dpr * zoom;
    const r = bakeRose({ seed: 'icono', variant: 'red', scale: s, r: 34 });
    head(r, W * 0.5, H * 0.45);
  },
  petalx() {
    const s = dpr * zoom;
    const off = (params.get('off') || '').split(',');
    const o = { seed: 'px', scale: s, L: 40, W: 40, widest: 0.68, base: 0.22, tip: 'flat', tipDepth: 0.1, asym: 0.2, bend: 0.03,
      colors: { main: hsl('#B51D33'), deep: hsl('#7A0E2A'), edge: hsl('#4A0C2E'), tip: hsl('#CE4A4E') }, reflex: 0.9, gap: 0.025, cup: 0.5, liftAmt: 0.5, pencilAmt: 0.35, rim: 1.7, alpha: 0.03 };
    for (const k of off) if (k) o[k] = 0;
    const pet = paintPetal(o);
    ctx.drawImage(pet.canvas, cv.width / 2 - pet.ax, cv.height * 0.75 - pet.ay);
  },
  rose() {
    const s = dpr * zoom;
    const one = params.get('one');
    if (one) {
      head(bakeRose({ seed: params.get('seed') || 'r1', variant: one, scale: s }), W * 0.5, H * 0.45);
      return;
    }
    const red = bakeRose({ seed: params.get('seed') || 'r1', variant: 'red', scale: s });
    head(red, W * 0.5, H * 0.3);
    const yel = bakeRose({ seed: params.get('seed') || 'y1', variant: 'yellow', scale: s });
    head(yel, W * 0.5, H * 0.72);
  },
  gerbera() {
    const s = dpr * zoom;
    head(bakeGerbera({ seed: params.get('seed') || 'g1', scale: s }), W * 0.5, H * 0.45);
  },
  sheet() {
    const s = dpr * zoom;
    const seed = params.get('seed') || 'a';
    const which = params.get('f') || 'chrysanthemum';
    const B = { chrysanthemum: bakeChrysanthemum, alstroemeria: bakeAlstroemeria, freesia: bakeFreesia, eucalyptus: bakeEucalyptus, fern: bakeFern, paniculata: bakeBabysBreath, gerbera: bakeGerbera, rose: bakeRose }[which];
    const oy = parseFloat(params.get('oy') || '0.5');
    head(B({ seed, scale: s }), W * 0.5, H * oy);
  },
  bloom() {
    const s = dpr * zoom;
    const red = bakeRose({ seed: 'r1', variant: 'red', scale: s });
    [0.1, 0.3, 0.5, 0.75, 1].forEach((t, i) => head(red, W * (0.2 + (i % 3) * 0.3), H * (0.25 + Math.floor(i / 3) * 0.45), t));
  },
  petal() {
    const s = dpr * zoom;
    const items = [
      { x: 0.5, y: 0.45, L: 120, W: 110, seed: 'p1' },
      { x: 0.25, y: 0.85, L: 70, W: 64, seed: 'p2' },
      { x: 0.75, y: 0.85, L: 70, W: 70, seed: 'p3' },
    ];
    for (const it of items) {
      const pet = paintPetal({
        seed: it.seed, scale: s, L: it.L, W: it.W, widest: 0.7, base: 0.2, tip: 'flat', tipDepth: 0.1, cup: 0.6,
        asym: 0.15, bend: 0.05,
        colors: { main: hsl('#B81B34'), deep: hsl('#6E0B2A'), edge: hsl('#4E0A2E') },
        worldX: 0, worldY: 0, pencilAmt: 0.6, splat: 6,
      });
      ctx.drawImage(pet.canvas, it.x * cv.width - pet.ax, it.y * cv.height - pet.ay + (it.L * s) / 2);
    }
  },
};

background();
const t0 = performance.now();
studies[study]();
document.title = `lab ${study} ${(performance.now() - t0).toFixed(0)}ms canvases=${canvasStats.created} liveMB=${canvasMB().toFixed(1)} peakMB=${((canvasStats.peakPx * 4) / 1048576).toFixed(1)}`;
requestAnimationFrame(() => requestAnimationFrame(() => { window.__labDone = true; }));
