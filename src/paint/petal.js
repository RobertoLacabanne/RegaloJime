// Forma y pintura de un pétalo genérico. El eje va de la base (0,0) a la
// punta (0,-L). Todo en px de horneado.
import { makeRng } from './rng.js';
import { makeCanvas, ctx2d } from './canvas.js';
import { glaze, deform, withVariance, smooth, edgeDarken, edgeStrokes, granulate, liftSoft, wetBleed, paperUnderlay, splatter, pencil } from './brush.js';
import { getPaper } from './paper.js';
import { shift } from './color.js';

export function petalOutline({ L, W, widest = 0.6, base = 0.12, tip = 'round', asym = 0, bend = 0, n = 9, rng, tipDepth = 0.12 }) {
  const right = [], left = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    let prof;
    if (t < widest) {
      const u = t / widest;
      prof = base + (1 - base) * Math.sin((u * Math.PI) / 2) ** 0.9;
    } else {
      const u = (t - widest) / (1 - widest);
      if (tip === 'point') prof = Math.cos((u * Math.PI) / 2) ** 1.2;
      else if (tip === 'flat' || tip === 'notch' || tip === 'peak') prof = 1 - 0.42 * u * u;
      else prof = Math.sqrt(Math.max(0, 1 - u * u));
    }
    const jitter = rng ? rng.gauss(1, 0.04) : 1;
    const hw = (W / 2) * prof * jitter;
    const cx = bend * t * t * L;
    const y = -t * L;
    right.push({ x: cx + hw * (1 + asym * 0.35), y });
    left.push({ x: cx - hw * (1 - asym * 0.35), y });
  }
  const pts = [...right];
  // Punta: plana con muesca/ondas (rosa) o simple.
  if (tip === 'flat' || tip === 'notch' || tip === 'peak') {
    const tr = right[n], tl = left[n];
    const k = 6;
    for (let j = 1; j < k; j++) {
      const u = j / k;
      const dip = tip === 'notch' ? Math.sin(u * Math.PI) * tipDepth * L * (rng ? rng.range(0.6, 1.4) : 1) : 0;
      const bulge = Math.sin(u * Math.PI) * tipDepth * L * (rng ? rng.range(0.6, 1.2) : 1);
      pts.push({ x: tr.x + (tl.x - tr.x) * u, y: tr.y + (tl.y - tr.y) * u - (tip === 'flat' ? bulge : tip === 'peak' ? tipDepth * L * 1.3 * (1 - Math.abs(2 * u - 1 - (rng ? rng.gauss(0, 0.15) : 0))) ** 1.6 : 0) + dip * 0.5 });
    }
  }
  for (let i = n; i >= 0; i--) pts.push(left[i]);
  return pts;
}

export function bounds(pts, pad = 0) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of pts) {
    if (p.x < x0) x0 = p.x;
    if (p.y < y0) y0 = p.y;
    if (p.x > x1) x1 = p.x;
    if (p.y > y1) y1 = p.y;
  }
  return { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad, w: x1 - x0 + pad * 2, h: y1 - y0 + pad * 2 };
}

export function translate(pts, dx, dy) {
  return pts.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy }));
}

export function scalePts(pts, sx, sy = sx, cx = 0, cy = 0) {
  return pts.map((p) => ({ ...p, x: cx + (p.x - cx) * sx, y: cy + (p.y - cy) * sy }));
}

// Recorta la forma a la fracción inferior (base) del pétalo: para glaseados
// que se concentran en la base.
export function lowerPart(pts, L, frac) {
  const yCut = -L * frac;
  return pts.map((p) => ({ ...p, y: p.y < yCut ? yCut + (p.y - yCut) * 0.15 : p.y }));
}

export function shrink(pts, k) {
  let cx = 0, cy = 0;
  for (const p of pts) { cx += p.x; cy += p.y; }
  cx /= pts.length; cy /= pts.length;
  return pts.map((p) => ({ ...p, x: cx + (p.x - cx) * k, y: cy + (p.y - cy) * k }));
}

/**
 * Pinta un pétalo y devuelve { canvas, ax, ay } con el ancla en la base.
 * colors: { main, deep, edge, bleed?, tip? } en HSL.
 * El degradé base-oscura → punta-clara se construye con glaseados anidados
 * (nunca con un gradiente lineal).
 */
export function paintPetal(opts) {
  const {
    seed, scale = 2, L, W, colors, widest, base, tip, asym, bend, tipDepth,
    layers = 36, alpha = 0.026, deep = [0.28, 0.48, 0.7], deepAlpha = 0.024, liftAmt = 0.55, rim = 1.4, mottle = 1,
    grainAmt = 0.3, bleed = null, stripes = null, pencilAmt = 0, splat = 0,
    worldX = 0, worldY = 0, veins = 0, spread = 0.16, cup = 0, baseSpread = 0.5, gap = 0, reflex = 0,
  } = opts;
  const rng = makeRng(seed);
  const paper = getPaper();
  const Ls = L * scale, Ws = W * scale;
  let outline = petalOutline({ L: Ls, W: Ws, widest, base, tip, asym, bend, rng, tipDepth, n: 10 });
  const pad = Math.max(10, Ws * 0.16);
  const bb = bounds(outline, pad);
  outline = translate(outline, -bb.x0, -bb.y0);
  const ax = -bb.x0, ay = -bb.y0;
  const cv = makeCanvas(bb.w, bb.h);
  const c = ctx2d(cv);
  const inner = shrink(outline, 0.94);

  // 1) Lavado principal intercalado con los glaseados de la base.
  // La silueta se decide una vez (irregular), y las capas varían poco:
  // borde nítido pero vivo, como un lavado que secó con charco en el borde.
  const silhouette = smooth(deform(withVariance(inner, rng, 0.4), 2, rng, baseSpread), 1);
  const specs = [
    { poly: silhouette, color: colors.main, alpha, count: layers, baseRounds: 0, rounds: 3, drift: 3, spread, baseSpread: 0.2, jitter: Ws * 0.006 },
    { poly: shrink(silhouette, 0.985), color: shift(colors.main, 0, 0, -4), alpha: 0.07, count: 3, baseRounds: 1, rounds: 3, drift: 2, spread: 0.12, baseSpread: 0.1 },
  ];
  deep.forEach((f, i) => {
    specs.push({
      poly: scalePts(inner, 0.9 - i * 0.08, f + 0.05, ax + rng.gauss(0, Ws * 0.04), ay), color: shift(colors.deep, rng.gauss(0, 3), 0, i * 3),
      alpha: deepAlpha, count: Math.round(layers * (0.8 - i * 0.15)), baseRounds: 3, rounds: 3, drift: 4, spread: 0.35, baseSpread: 0.35, clip: silhouette,
    });
  });
  if (colors.tip) {
    const cut = ay - Ls * 0.62;
    specs.push({ poly: scalePts(silhouette, 0.9, 0.45, ax, ay - Ls), color: colors.tip, alpha: alpha * 0.8, count: Math.round(layers * 0.5), baseRounds: 3, rounds: 3, drift: 4, spread: 0.35, clip: silhouette });
  }
  // Moteado: charquitos de pigmento dentro del lavado (no uniforme).
  for (let m = 0; m < 5 * mottle; m++) {
    const cx = ax + rng.gauss(0, Ws * 0.18), cy = ay - Ls * rng.range(0.2, 0.75);
    const r = Ws * rng.range(0.08, 0.18);
    const blob = [];
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      blob.push({ x: cx + Math.cos(a) * r * rng.range(0.7, 1.3), y: cy + Math.sin(a) * r * 1.4 * rng.range(0.7, 1.3) });
    }
    specs.push({ poly: blob, color: shift(colors.deep, rng.gauss(0, 5), 0, 6), alpha: 0.03, count: 8, baseRounds: 3, rounds: 3, drift: 4, spread: 0.7, clip: silhouette });
  }
  const bases = glaze(c, specs, rng);

  // Cuenco: sombra en un costado, como si el pétalo se curvara.
  if (cup) {
    const side = asym >= 0 ? 1 : -1;
    const band = inner.map((p) => ({ ...p, x: p.x + side * Ws * 0.28, y: p.y + Ls * 0.04 }));
    wetBleed(cv, shrink(band, 0.8), colors.deep, rng, { alpha: 0.4 * cup, blur: 7 });
  }

  // 2) Sangrado húmedo desde la base (p. ej. verde de la gerbera).
  if (bleed) {
    const bp = shrink(lowerPart(inner, Ls, bleed.frac ?? 0.3), 0.9);
    wetBleed(cv, bp, bleed.color, rng, { alpha: bleed.alpha ?? 0.6, blur: 6 });
  }

  // 3) Rayitas (alstroemeria).
  if (stripes) {
    c.save();
    c.globalCompositeOperation = 'source-atop';
    for (let i = 0; i < stripes.n; i++) {
      const sx = ax + rng.gauss(0, Ws * 0.12);
      const sy = ay - Ls * rng.range(0.22, 0.4);
      const len = Ls * rng.range(0.12, 0.3);
      const pts = [];
      for (let k = 0; k <= 6; k++) pts.push({ x: sx + rng.gauss(0, 0.5) + (sx - ax) * 0.4 * (k / 6), y: sy - (len * k) / 6 });
      pencil(c, pts, rng, stripes.color, { width: stripes.width * scale, alpha: stripes.alpha ?? 0.8 });
    }
    c.restore();
  }

  // 4) Luces reservadas: franja lateral hacia la punta, papel limpio.
  if (liftAmt > 0 && rng.chance(0.75)) {
    const side = asym ? -Math.sign(asym) : rng.chance(0.5) ? 1 : -1;
    // forma de la luz distinta en cada pétalo: ancho, alto, posición y giro
    const kx = rng.range(0.35, 0.6), ky = rng.range(0.1, 0.22), rot = side * rng.range(0.1, 0.45);
    const hx = ax + side * Ws * rng.range(0.05, 0.2), hy = ay - Ls * rng.range(0.55, 0.75);
    const hl = inner.map((p) => {
      const dx = (p.x - ax) * kx, dy = (p.y - ay + Ls * 0.5) * ky;
      return { x: hx + dx * Math.cos(rot) - dy * Math.sin(rot), y: hy + dx * Math.sin(rot) + dy * Math.cos(rot) };
    });
    liftSoft(cv, hl, rng, { alpha: liftAmt, blur: 9, hard: 0.08 * liftAmt });
    // brillo fino en el borde superior, donde el pétalo se da vuelta
    const hl2 = inner.map((p) => ({ x: ax + (p.x - ax) * 0.6 + rng.gauss(0, 1), y: ay + (p.y - ay) * 0.1 - Ls * 0.86 }));
    liftSoft(cv, hl2, rng, { alpha: liftAmt * 0.5, blur: 5, hard: 0.1 });
  }

  // 4b) Borde revirado: franja clara junto a la punta con una línea oscura
  // debajo (el revés del pétalo que se enrolla hacia afuera).
  if (reflex > 0) {
    const band = scalePts(silhouette, rng.range(0.5, 0.85), reflex * 0.08, ax + rng.gauss(0, Ws * 0.12), ay - Ls * 1.02);
    liftSoft(cv, band, rng, { alpha: 0.55, blur: 4, hard: 0.2 });
    const lower = band.filter((p) => p.y > ay - Ls * (1 - reflex * 0.12));
    if (lower.length > 3) {
      c.save();
      c.globalCompositeOperation = 'source-atop';
      const srt = lower.sort((a, b) => a.x - b.x).filter((_, i) => i % 3 === 0);
      pencil(c, srt, rng, colors.deep, { width: 0.8 * scale, alpha: 0.35 });
      c.restore();
    }
  }

  // 5) Nervaduras suaves.
  if (veins) {
    c.save();
    c.globalCompositeOperation = 'source-atop';
    for (let i = 0; i < veins; i++) {
      const off = (i / (veins - 1 || 1) - 0.5) * Ws * 0.55;
      const pts = [];
      for (let k = 0; k <= 8; k++) {
        const t = k / 8;
        pts.push({ x: ax + off * Math.sin(t * 1.5) + bend * t * t * Ls + rng.gauss(0, 0.4), y: ay - t * Ls * 0.8 });
      }
      pencil(c, pts, rng, colors.edge, { width: 0.45 * scale, alpha: 0.14 });
    }
    c.restore();
  }

  // 6) Borde oscuro + contornos húmedos + granulación.
  edgeDarken(cv, colors.edge, rim, 6);
  edgeDarken(cv, colors.edge, rim * 0.5, 3);
  edgeStrokes(c, bases[0], rng, colors.edge, { passes: 3, width: 0.5 * scale, alpha: 0.2 * rim });
  granulate(cv, paper.grain, shift(colors.deep, 0, 5, -6), grainAmt, worldX, worldY);

  if (pencilAmt > 0) {
    const pts = bases[0].filter((_, i) => i % 5 === 0);
    const start = Math.floor(rng.next() * pts.length);
    const seg = pts.slice(start, start + Math.floor(pts.length * 0.4));
    c.save();
    c.globalCompositeOperation = 'source-atop';
    pencil(c, seg.map((p) => ({ x: p.x + rng.gauss(0, 1), y: p.y + rng.gauss(0, 1) })), rng, colors.edge, { width: 0.55 * scale, alpha: 0.4 * pencilAmt });
    c.restore();
  }

  // 7) Papel crema debajo (los blancos son papel) y salpicado.
  paperUnderlay(cv, paper.paper, worldX, worldY, 3, gap ? scalePts(silhouette, 1 + gap, 1 + gap * 0.6, ax, ay) : shrink(bases[0], 0.985), gap ? null : rng);
  if (splat) splatter(c, rng, colors.deep, { n: splat, x: ax, y: ay - Ls * 0.5, rx: Ws * 0.8, ry: Ls * 0.6, size: 1.1 * scale });
  return { canvas: cv, ax, ay, L: Ls, W: Ws };
}
