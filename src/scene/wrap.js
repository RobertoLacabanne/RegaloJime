// Papel: el cono inicial (atrás / adelante), el envoltorio final que sube,
// el moño carmín con cinta plateada y las sombras de papel. Todo pintado
// como acuarela y horneado a sprites en coordenadas de escena.
import { makeRng } from '../paint/rng.js';
import { hsl, shift, hslStr } from '../paint/color.js';
import { makeCanvas, ctx2d } from '../paint/canvas.js';
import { glaze, edgeDarken, granulate, paperUnderlay, liftSoft, wetBleed, pencil, splatter, smooth } from '../paint/brush.js';
import { getPaper } from '../paint/paper.js';
import { paintPetal } from '../paint/petal.js';
import { ribbon } from '../paint/stem.js';

const K = {
  kraft: hsl('#CFA574'), kraftDeep: hsl('#B07A48'), kraftShadow: hsl('#7E4A2C'), kraftLight: hsl('#E6C89C'),
  inside: hsl('#9C7450'), tissue: hsl('#F4E6CE'), tissueShade: hsl('#D8B7A0'),
  ribbon: { main: hsl('#A3122B'), deep: hsl('#6E0A26'), edge: hsl('#4A0A2C') },
  silver: hsl('#B9B3C2'),
};

// Lienzo en coordenadas de escena: devuelve { cv, c, map(p), sprite() }
function sceneCanvas(x0, y0, x1, y1, s) {
  const cv = makeCanvas((x1 - x0) * s, (y1 - y0) * s);
  const c = ctx2d(cv);
  const map = (p) => ({ x: (p.x - x0) * s, y: (p.y - y0) * s, v: p.v });
  return { cv, c, map, sprite: () => ({ canvas: cv, ax: -x0 * s, ay: -y0 * s, s }) };
}

function paintKraft(cv, c, poly, rng, s, { light = 0, shadowSide = 1, creases = [] } = {}) {
  const paper = getPaper();
  glaze(c, [{ poly, color: K.kraft, alpha: 0.06, count: 30, baseRounds: 2, rounds: 3, spread: 0.1, baseSpread: 0.15, drift: 4 }], rng);
  // sombra hacia un lado (luz de ventana desde la izquierda)
  let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
  for (const p of poly) { minx = Math.min(minx, p.x); maxx = Math.max(maxx, p.x); miny = Math.min(miny, p.y); maxy = Math.max(maxy, p.y); }
  const w = maxx - minx, h = maxy - miny;
  const sidePoly = [
    { x: shadowSide > 0 ? minx + w * 0.55 : minx - 4, y: miny - 4 }, { x: shadowSide > 0 ? maxx + 4 : minx + w * 0.45, y: miny - 4 },
    { x: shadowSide > 0 ? maxx + 4 : minx + w * 0.45, y: maxy + 4 }, { x: shadowSide > 0 ? minx + w * 0.55 : minx - 4, y: maxy + 4 },
  ];
  wetBleed(cv, sidePoly, K.kraftDeep, rng, { alpha: 0.45, blur: 10 });
  if (light > 0) liftSoft(cv, poly.map((p) => ({ x: minx + (p.x - minx) * 0.3 + w * 0.08, y: miny + (p.y - miny) * 0.6 + h * 0.05 })), rng, { alpha: light, blur: 12, hard: 0.05 });
  // pliegues: línea oscura con un lado claro
  c.save();
  c.globalCompositeOperation = 'source-atop';
  for (const cr of creases) {
    const pts = [];
    for (let k = 0; k <= 10; k++) pts.push({ x: cr[0].x + (cr[1].x - cr[0].x) * (k / 10) + rng.gauss(0, 0.6), y: cr[0].y + (cr[1].y - cr[0].y) * (k / 10) });
    pencil(c, pts, rng, K.kraftShadow, { width: 1.1 * s, alpha: 0.45 });
    pencil(c, pts.map((p) => ({ x: p.x - 2 * s, y: p.y })), rng, K.kraftLight, { width: 1.4 * s, alpha: 0.35 });
  }
  c.restore();
  // fibras del kraft
  c.save();
  c.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 90; i++) {
    const x = minx + rng.next() * w, y = miny + rng.next() * h;
    const a = rng.gauss(-0.2, 0.5), L = rng.range(3, 10) * s;
    c.strokeStyle = hslStr(shift(K.kraftShadow, 0, 0, rng.gauss(0, 8)), 0.12);
    c.lineWidth = 0.4 * s;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L);
    c.stroke();
  }
  c.restore();
  edgeDarken(cv, K.kraftShadow, 0.9, 6);
  granulate(cv, paper.grain, K.kraftDeep, 0.4);
  paperUnderlay(cv, paper.paper, 0, 0, 3, poly, rng);
}

function wavy(a, b, n, amp, rng) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t + Math.sin(t * Math.PI * (2 + rng.next())) * amp + rng.gauss(0, amp * 0.3) });
  }
  return out;
}

// Arco de elipse (boca del cono en perspectiva).
function arc(cx, cy, rx, ry, a0, a1, n, rng, j = 0.6) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    out.push({ x: cx + Math.cos(a) * rx + rng.gauss(0, j * 0.4), y: cy + Math.sin(a) * ry + rng.gauss(0, j) });
  }
  return out;
}

export function bakeCone(s, seed = 'cono') {
  const rng = makeRng(seed);
  const paper = getPaper();
  const cx = 200, cy = 390, rx = 94, ry = 15;
  // --- atrás: el interior del cono (mitad de atrás de la boca) + seda
  const back = sceneCanvas(90, 300, 310, 420, s);
  const inner = [...arc(cx, cy, rx, ry, Math.PI, Math.PI * 2, 18, rng, 0.3), ...arc(cx, cy, rx, ry, 0, Math.PI, 18, rng, 0.2)].map(back.map);
  glaze(back.c, [{ poly: inner, color: hsl('#8E6444'), alpha: 0.07, count: 22, baseRounds: 2, rounds: 3, spread: 0.1, baseSpread: 0.15 }], rng);
  wetBleed(back.cv, inner.map((p) => ({ x: p.x, y: p.y + 6 * s })), hsl('#5E3A2A'), rng, { alpha: 0.5, blur: 8 });
  // seda crema que asoma por detrás, con picos suaves
  const tissue = [];
  const nT = 6;
  for (let i = 0; i <= nT * 2; i++) {
    const t = i / (nT * 2);
    const x = cx - rx * 0.96 + t * rx * 1.92;
    const peak = i % 2 === 0 ? rng.range(16, 30) : rng.range(9, 15);
    tissue.push({ x: x + rng.gauss(0, 2), y: cy - 6 - peak * Math.sin(Math.PI * (0.15 + t * 0.7)) });
  }
  const tissuePoly = [...smooth(tissue.map((p) => ({ ...p, v: 1 })), 2).slice(1, -1), ...arc(cx, cy, rx * 0.97, ry, 0, Math.PI, 14, rng, 0.2)].map(back.map);
  const tc = makeCanvas(back.cv.width, back.cv.height);
  const tcc = ctx2d(tc);
  glaze(tcc, [{ poly: tissuePoly, color: hsl('#EBD3B8'), alpha: 0.045, count: 16, baseRounds: 2, rounds: 3, spread: 0.14, baseSpread: 0.25 }], rng);
  wetBleed(tc, tissuePoly.map((p) => ({ x: p.x + 14 * s, y: p.y + 10 * s })), hsl('#C79A86'), rng, { alpha: 0.35, blur: 8 });
  edgeDarken(tc, hsl('#B08068'), 1.0, 5);
  paperUnderlay(tc, paper.paper, 0, 0, 3, tissuePoly, rng);
  back.c.drawImage(tc, 0, 0);
  tc.width = tc.height = 1;
  edgeDarken(back.cv, K.kraftShadow, 0.6, 6);
  paperUnderlay(back.cv, paper.paper, 0, 0, 3, inner, rng);

  // --- adelante: frente del cono (borde = mitad de adelante de la boca)
  const front = sceneCanvas(90, 370, 310, 630, s);
  const tip = { x: 203, y: 612 };
  const rimF = arc(cx, cy, rx, ry, 0, Math.PI, 20, rng, 0.5); // derecha → izquierda por abajo
  const frontPoly = [...rimF.reverse(), { x: tip.x + 5, y: tip.y - 8 }, { x: tip.x, y: tip.y }, { x: tip.x - 5, y: tip.y - 6 }].reverse().map(front.map);
  paintKraft(front.cv, front.c, frontPoly, rng, s, {
    light: 0.3, shadowSide: 1,
    creases: [
      [{ x: 150, y: 402 }, { x: 196, y: 590 }].map(front.map),
    ],
  });
  // costura: el borde del papel que envuelve, en diagonal
  const seam = [{ x: 252, y: 400 }, { x: 262, y: 404 }, { x: 207, y: 606 }, { x: 203, y: 600 }].map(front.map);
  const sc = makeCanvas(front.cv.width, front.cv.height);
  const scc = ctx2d(sc);
  glaze(scc, [{ poly: seam, color: hsl('#E0C49C'), alpha: 0.05, count: 14, baseRounds: 1, rounds: 2, spread: 0.08, baseSpread: 0.1 }], rng);
  front.c.save();
  front.c.globalCompositeOperation = 'source-atop';
  front.c.drawImage(sc, 0, 0);
  pencil(front.c, [{ x: 262, y: 404 }, { x: 240, y: 488 }, { x: 222, y: 556 }, { x: 207, y: 606 }].map(front.map), rng, K.kraftShadow, { width: 1.1 * s, alpha: 0.55 });
  front.c.restore();
  sc.width = sc.height = 1;
  // labio del borde: una franja clara (el grosor del papel doblado)
  const lip = [...arc(cx, cy + 1, rx, ry, 0, Math.PI, 20, rng, 0.3), ...arc(cx, cy + 4.5, rx * 0.985, ry, Math.PI, 0, 20, rng, 0.3)].map(front.map);
  liftSoft(front.cv, lip, rng, { alpha: 0.55, blur: 3, hard: 0.3 });
  splatter(front.c, rng, K.kraftShadow, { n: 14, x: front.map({ x: 200, y: 0 }).x, y: front.map({ x: 0, y: 500 }).y, rx: 80 * s, ry: 90 * s, size: 0.9 * s, alpha: 0.3 });
  return { back: back.sprite(), front: front.sprite() };
}

// Envoltorio final: dos paños de kraft que suben por los lados, con
// pliegues que irradian desde la punta, borde arrugado y el revés doblado.
export function bakeWrap(s, seed = 'envoltorio') {
  const rng = makeRng(seed);
  const panels = [];
  const tip = { x: 202, y: 614 };
  for (const side of [-1, 1]) {
    const X = (x) => 200 + side * x;
    const bb = side < 0 ? [8, 220, 212, 630] : [188, 220, 392, 630];
    const P = sceneCanvas(bb[0], bb[1], bb[2], bb[3], s);
    // borde superior arrugado: de afuera-arriba hacia adentro-abajo
    const outerTop = { x: X(184 + rng.gauss(0, 3)), y: 312 + rng.gauss(0, 6) };
    const innerTop = { x: X(70), y: 372 + rng.gauss(0, 4) };
    const top = [];
    const n = 14;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const bulge = Math.sin(t * Math.PI) * -14; // el borde se abomba hacia arriba
      top.push({
        x: outerTop.x + (innerTop.x - outerTop.x) * t + rng.gauss(0, 1.2),
        y: outerTop.y + (innerTop.y - outerTop.y) * t + bulge + Math.sin(t * 23 + rng.next() * 3) * 2.2 + rng.gauss(0, 1),
      });
    }
    const poly = [tip, { x: X(150), y: 420 }, ...top, { x: X(40), y: 470 }, { x: tip.x + side * 4, y: tip.y - 8 }];
    const pleats = [0.2, 0.45, 0.72].map((f) => {
      const q = top[Math.round(f * n)];
      return [{ x: tip.x + (q.x - tip.x) * 0.06, y: tip.y + (q.y - tip.y) * 0.06 }, { x: q.x, y: q.y + 6 }].map(P.map);
    });
    paintKraft(P.cv, P.c, poly.map(P.map), rng, s, { light: side < 0 ? 0.45 : 0.18, shadowSide: side, creases: pleats });
    // revés doblado: una franja clara y cálida a lo largo del borde superior
    const lip = [...top, ...top.slice().reverse().map((p, i) => ({ x: p.x + side * (i % 3) * 0.6, y: p.y + 10 + Math.sin(i * 1.7) * 2.5 }))];
    const L = makeCanvas(P.cv.width, P.cv.height);
    const lc = ctx2d(L);
    const lipPoly = lip.map(P.map);
    glaze(lc, [{ poly: lipPoly, color: K.kraftLight, alpha: 0.08, count: 14, baseRounds: 1, rounds: 2, spread: 0.08, baseSpread: 0.1 }], rng);
    wetBleed(L, lipPoly.map((p) => ({ x: p.x, y: p.y + 7 * s })), K.kraftDeep, rng, { alpha: 0.35, blur: 6 });
    edgeDarken(L, K.kraftShadow, 1.1, 4);
    paperUnderlay(L, getPaper().paper, 0, 0, 3, lipPoly, rng);
    P.c.drawImage(L, 0, 0);
    L.width = L.height = 1;
    panels.push({ sprite: P.sprite(), side });
  }
  return panels;
}

// Moño: lazo carmín, colas cortadas en V y una cinta plateada más fina.
export function bakeBow(s, seed = 'monio') {
  const rng = makeRng(seed);
  const knot = { x: 200, y: 446 };
  const B = sceneCanvas(90, 370, 310, 560, s);
  const parts = [];
  const band = sceneCanvas(110, 420, 290, 470, s);
  const bandPts = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    bandPts.push({ x: 128 + t * 144, y: 441 + Math.sin(t * Math.PI) * 7 + rng.gauss(0, 0.3) });
  }
  const bandPoly = ribbon(bandPts.map(band.map), () => 10 * s);
  glaze(band.c, [{ poly: bandPoly, color: K.ribbon.main, alpha: 0.07, count: 22, baseRounds: 2, rounds: 3, spread: 0.1, baseSpread: 0.2 }], rng);
  for (const off of [-4.5, 4.5]) liftSoft(band.cv, ribbon(bandPts.map((p) => band.map({ x: p.x, y: p.y + off })), () => 1.3 * s), rng, { alpha: 0.8, blur: 2, hard: 0.55 });
  edgeDarken(band.cv, K.ribbon.edge, 1.4, 4);
  paperUnderlay(band.cv, getPaper().paper, 0, 0, 3, bandPoly, rng);

  // cinta roja con dos rayas blancas (como la del ramo de rosas)
  const stripes = (pet, W, L) => {
    for (const off of [-0.24, 0.24]) {
      const pts = [];
      for (let k = 0; k <= 10; k++) pts.push({ x: pet.ax + off * W * s * (1 - k * 0.02), y: pet.ay - (L * s * k) / 10 * 0.96 });
      liftSoft(pet.canvas, ribbon(pts, () => 1.3 * s), rng, { alpha: 0.8, blur: 2, hard: 0.55 });
    }
    return pet;
  };
  const mk = (o) => stripes(paintPetal({ scale: s, colors: K.ribbon, layers: 26, alpha: 0.06, deep: [0.3, 0.55], liftAmt: 0.6, rim: 1.4, spread: 0.12, baseSpread: 0.3, pencilAmt: 0.3, ...o }), o.W, o.L);
  // colas (atrás), cinta plateada, lazos y nudo
  const tails = [
    { rot: 162, L: 92, seed: 't1' }, { rot: -150, L: 80, seed: 't2' },
  ];
  const sil = [{ rot: 174, L: 74, seed: 's1' }, { rot: -166, L: 64, seed: 's2' }];
  const loops = [{ rot: -70, L: 50, W: 42, seed: 'l1' }, { rot: 68, L: 52, W: 44, seed: 'l2' }];
  const draw = (pet, rot, sy = 1) => {
    B.c.save();
    const m = B.map(knot);
    B.c.translate(m.x, m.y);
    B.c.rotate((rot * Math.PI) / 180);
    B.c.scale(1, sy);
    B.c.drawImage(pet.canvas, -pet.ax, -pet.ay);
    B.c.restore();
    pet.canvas.width = pet.canvas.height = 1;
  };
  for (const t of sil) draw(paintPetal({ scale: s, seed: seed + t.seed, L: t.L, W: 7, widest: 0.8, base: 0.8, tip: 'notch', tipDepth: 0.12, colors: { main: K.silver, deep: shift(K.silver, 10, 5, -14), edge: shift(K.silver, 15, 5, -30) }, layers: 18, alpha: 0.07, deep: [0.3], liftAmt: 0.7, rim: 1.2, spread: 0.1, baseSpread: 0.2 }), t.rot);
  for (const t of tails) draw(mk({ seed: seed + t.seed, L: t.L, W: 17, widest: 0.85, base: 0.7, tip: 'notch', tipDepth: 0.22, bend: rng.gauss(0, 0.1) }), t.rot);
  for (const l of loops) draw(mk({ seed: seed + l.seed, L: l.L, W: l.W, widest: 0.62, base: 0.25, tip: 'round', cup: 0.6 }), l.rot, 0.85);
  const kn = mk({ seed: seed + 'k', L: 18, W: 17, widest: 0.5, base: 0.5, tip: 'round', liftAmt: 0.8 });
  B.c.save();
  const m = B.map(knot);
  B.c.drawImage(kn.canvas, m.x - kn.ax, m.y - kn.ay + 6 * s);
  B.c.restore();
  kn.canvas.width = kn.canvas.height = 1;
  splatter(B.c, rng, K.ribbon.deep, { n: 7, x: m.x, y: m.y + 30 * s, rx: 50 * s, ry: 30 * s, size: 1.1 * s, alpha: 0.4 });
  parts.push({ band: band.sprite(), bow: B.sprite(), knot });
  return parts[0];
}

// Pétalos sueltos para la explosión y la lluvia (sprites chicos).
export function bakeLoosePetals(s, colors, seed = 'sueltos') {
  const out = [];
  colors.forEach((hex, i) => {
    for (let k = 0; k < 2; k++) {
      const col = hsl(hex);
      const p = paintPetal({
        seed: `${seed}${i}${k}`, scale: s, L: 9 + k * 2, W: 7 + k, widest: 0.6, base: 0.3, tip: k ? 'flat' : 'round', tipDepth: 0.08,
        colors: { main: col, deep: shift(col, -4, 4, -12), edge: shift(col, -6, 4, -26) }, layers: 14, alpha: 0.08, deep: [0.4], liftAmt: 0.6, rim: 1.2, spread: 0.12, baseSpread: 0.35,
      });
      out.push({ canvas: p.canvas, ax: p.canvas.width / 2, ay: p.canvas.height / 2, s });
    }
  });
  return out;
}

