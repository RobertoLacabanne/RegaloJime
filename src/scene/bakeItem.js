// Horneado de un paso (cabeza + tallo + pétalos sueltos). Corre en el worker
// o, si el navegador no lo permite, en el hilo principal.
import { makeRng } from '../paint/rng.js';
import { flowerDef } from './registry.js';
import { SCENE } from './compose.js';
import { paintStems, bezier } from '../paint/stem.js';
import { bakeLoosePetals } from './wrap.js';
import { flattenItem } from './itemDraw.js';

// "lite": lo mínimo serializable de un elemento del plan.
export function liteOf(plan) {
  const { name, seed, kind, L, dir, pos, origin, rot } = plan;
  return { name, seed, kind, L, dir, pos, origin, rot };
}

// Pose final horneada de antemano (así aplanar no cuesta nada después).
export function withFlat(baked, lite, px) {
  baked.flat = flattenItem({ ...baked, plan: lite }, px);
  return baked;
}

export function bakeItem(lite, px) {
  const def = flowerDef(lite.name);
  const rng = makeRng(lite.seed + '-item');
  const o = { seed: lite.seed, scale: px };
  const head = lite.kind === 'spray' ? def.bake({ ...o, L: lite.L, dir: lite.dir }) : def.bake(o);
  const B = SCENE.B;
  const stemEnd = lite.kind === 'head' ? { x: lite.pos.x, y: lite.pos.y + (lite.name === 'alstroemeria' ? 0 : 10) } : lite.origin;
  const dx = stemEnd.x - B.x, dy = stemEnd.y - B.y;
  const bow = rng.gauss(0, 0.06);
  const pts = bezier(B, { x: B.x + dx * 0.15 - dy * bow, y: B.y + dy * 0.35 }, { x: B.x + dx * 0.7 - dy * bow * 0.5, y: B.y + dy * 0.75 }, stemEnd, 18);
  const stem = paintStems(`${lite.seed}-tallo`, [{ pts, w0: lite.kind === 'head' ? 2.8 : 2.2, w1: lite.kind === 'head' ? 2.0 : 1.6 }], px, def.stem, { origin: B, light: true });
  const burst = bakeLoosePetals(px, def.burst.slice(0, 2), lite.seed + '-b');
  return { head, stem, burst, stemLen: Math.hypot(dx, dy) + 12 };
}

// Partes → datos transferibles (sin funciones). Los canvases compartidos
// se convierten una sola vez.
export function serialize(baked, toBitmap) {
  const map = new Map();
  const conv = (sp) => {
    if (!sp) return null;
    if (!map.has(sp.canvas)) map.set(sp.canvas, toBitmap(sp.canvas));
    return { canvas: map.get(sp.canvas), ax: sp.ax, ay: sp.ay, s: sp.s, petal: sp.petal || null };
  };
  const parts = baked.head.parts.map((p) => {
    const { ease, img, closed, ...rest } = p;
    void ease;
    return { ...rest, img: conv(img), closed: conv(closed) };
  });
  const out = {
    head: { ...baked.head, parts },
    stem: conv(baked.stem),
    burst: baked.burst.map(conv),
    flat: conv(baked.flat),
    stemLen: baked.stemLen,
  };
  return { out, transfer: [...map.values()] };
}
