// Crisantemo pompón: esfera densa de pétalos finos y curvos en capas
// radiales. Se estampan variantes horneadas en tres capas (afuera, medio,
// núcleo) y cada capa se sombrea como un volumen: siena abajo a la derecha,
// papel arriba a la izquierda.
import { makeRng } from '../paint/rng.js';
import { hsl, shift } from '../paint/color.js';
import { makeCanvas, ctx2d } from '../paint/canvas.js';
import { edgeDarken, liftSoft, wetBleed, glaze } from '../paint/brush.js';
import { part, drawSprite } from '../scene/head.js';
import { GOLDEN, petalSet, ellipsePoly, softBlob } from './common.js';

const TONES = [
  { main: hsl('#F6E04E'), deep: hsl('#E6C01C'), edge: hsl('#B39418') },
  { main: hsl('#F2D535'), deep: hsl('#DDB512'), edge: hsl('#A8860E') },
  { main: hsl('#F9EB8C'), deep: hsl('#EDCF3E'), edge: hsl('#C8A41A') },
];

export function bakeChrysanthemum({ seed = 'crisantemo', scale = 2, r = 27 } = {}) {
  const rng = makeRng(seed);
  const stamps = TONES.map((tone, ti) =>
    petalSet(`${seed}t${ti}`, 4, scale, () => ({
      L: r * rng.range(0.5, 0.58), W: r * rng.range(0.09, 0.11), widest: 0.62, base: 0.35, tip: 'round',
      asym: rng.gauss(0, 0.3), bend: rng.gauss(0, 0.14), colors: tone, layers: 14, alpha: 0.08,
      deep: [0.4], liftAmt: 0.5, rim: 1.1, grainAmt: 0.3, spread: 0.14, baseSpread: 0.35,
    })),
  ).flat();

  const S = r * scale * 2.7;
  const layers = [
    { r0: 0.55, r1: 1.0, n: 84, len: 0.95, fore: 0.9, delay: 0.0 },
    { r0: 0.28, r1: 0.72, n: 70, len: 0.85, fore: 0.65, delay: 0.18 },
    { r0: 0.0, r1: 0.4, n: 48, len: 0.7, fore: 0.45, delay: 0.34 },
  ];
  const parts = [];
  parts.push(part(softBlob(`${seed}sh`, r * 0.8, r * 0.7, scale, hsl('#9A5A3A'), 0.12), { x: r * 0.06, y: r * 0.1, sx: 1, sx0: 0.3, delay: 0, dur: 0.5 }));
  layers.forEach((L, li) => {
    const cv = makeCanvas(S, S);
    const c = ctx2d(cv);
    const cx = S / 2, cy = S / 2;
    // bola base: sin huecos de papel entre pétalos
    glaze(c, [{ poly: ellipsePoly(cx, cy, r * scale * (L.r1 * 0.62 + 0.12), r * scale * (L.r1 * 0.62 + 0.1), 12, rng, 0.06), color: shift(TONES[1].deep, 0, 0, 4 - li * 4), alpha: 0.06, count: 18, baseRounds: 3, rounds: 3, spread: 0.3 }], rng);
    const items = [];
    for (let i = 0; i < L.n; i++) {
      const f = (i + 0.5) / L.n;
      const rr = (L.r0 + (L.r1 - L.r0) * Math.sqrt(f)) * r * 0.62;
      const a = i * GOLDEN + li;
      items.push({ rr, a });
    }
    items.sort((p, q) => q.rr - p.rr);
    for (const it of items) {
      const img = stamps[Math.floor(rng.next() * stamps.length)];
      c.save();
      c.translate(cx + Math.cos(it.a) * it.rr * scale, cy + Math.sin(it.a) * it.rr * scale * 0.94);
      c.rotate(it.a + Math.PI / 2 + rng.gauss(0, 0.15));
      const fore = L.fore + (it.rr / (r * 0.62)) * 0.3;
      c.scale(rng.chance(0.5) ? 1 : -1, L.len * Math.min(1, fore) * rng.range(0.85, 1.1));
      c.scale(scale, scale);
      drawSprite(c, img, 1);
      c.restore();
    }
    // volumen: sombra cálida abajo a la derecha, luz arriba a la izquierda
    const R = r * scale * (L.r1 * 0.62 + 0.35);
    wetBleed(cv, ellipsePoly(cx + R * 0.45, cy + R * 0.5, R * 0.75, R * 0.6, 10, rng), hsl('#C09A1A'), rng, { alpha: 0.6 + li * 0.05, blur: 9 });
    wetBleed(cv, ellipsePoly(cx + R * 0.5, cy + R * 0.6, R * 0.45, R * 0.35, 9, rng), hsl('#8C7A22'), rng, { alpha: 0.3, blur: 7 });
    liftSoft(cv, ellipsePoly(cx - R * 0.35, cy - R * 0.38, R * 0.3, R * 0.22, 9, rng), rng, { alpha: 0.45, blur: 9, hard: 0.05 });
    edgeDarken(cv, hsl('#A8860E'), 0.35, 5);
    parts.push(part({ canvas: cv, ax: cx, ay: cy, s: scale }, {
      x: 0, y: -li * r * 0.03, sx: 1, sx0: 0.25, sy0: 0.25, delay: L.delay, dur: 0.6,
    }));
  });
  stamps.forEach((st) => { st.canvas.width = 1; st.canvas.height = 1; });
  return { parts, r, kind: 'chrysanthemum' };
}
