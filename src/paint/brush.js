// Pincel acuarela a la Tyler Hobbs: deformación recursiva de polígonos y
// decenas de capas translúcidas. Más las pasadas que hacen que se lea como
// pigmento sobre papel: borde oscuro, granulación, levantado y fondo crema.
import { hslStr, shift } from './color.js';
import { makeCanvas, ctx2d, softBlurInto, freeCanvas } from './canvas.js';
import { fillPattern } from './paper.js';

// pts: [{x, y, v}] cerrado implícitamente. v = varianza propia del vértice.
export function deform(pts, rounds, rng, spread = 1) {
  let cur = pts;
  for (let r = 0; r < rounds; r++) {
    const out = [];
    const n = cur.length;
    for (let i = 0; i < n; i++) {
      const a = cur[i], b = cur[(i + 1) % n];
      out.push(a);
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      const perp = Math.atan2(dy, dx) - Math.PI / 2;
      const v = (a.v + b.v) * 0.5;
      const ang = perp + rng.gauss(0, 0.7);
      const mag = rng.gauss(0, len * v * 0.32 * spread);
      out.push({
        x: (a.x + b.x) * 0.5 + Math.cos(ang) * mag,
        y: (a.y + b.y) * 0.5 + Math.sin(ang) * mag,
        v: v * Math.max(0.35, rng.gauss(1, 0.12)),
      });
    }
    cur = out;
  }
  return cur;
}

// Suavizado de Chaikin (curvas orgánicas sin dientes).
export function smooth(pts, iters = 2) {
  let cur = pts;
  for (let k = 0; k < iters; k++) {
    const out = [];
    const n = cur.length;
    for (let i = 0; i < n; i++) {
      const a = cur[i], b = cur[(i + 1) % n];
      out.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25, v: a.v });
      out.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75, v: b.v });
    }
    cur = out;
  }
  return cur;
}

export function withVariance(pts, rng, sd = 0.35, mean = 1) {
  return pts.map((p) => ({ x: p.x, y: p.y, v: p.v ?? Math.max(0.15, rng.gauss(mean, sd)) }));
}

export function tracePoly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}

// specs: [{ poly, color:{h,s,l}, alpha, count, baseRounds, rounds, drift, spread, comp }]
// Las capas de distintas pinceladas se intercalan para que se mezclen.
export function glaze(ctx, specs, rng) {
  const prepared = specs.map((s) => ({
    ...s,
    base: deform(withVariance(s.poly, rng, s.vsd ?? 0.35), s.baseRounds ?? 5, rng, s.baseSpread ?? s.spread ?? 1),
  }));
  // Tope de vértices por capa: más allá de ~1200 no se ve diferencia y el
  // costo en un celular se dispara.
  for (const s of prepared) {
    let r = s.rounds ?? 3;
    while (r > 1 && s.base.length * 2 ** r > (s.maxPts ?? 1200)) r--;
    s.effRounds = r;
  }
  const max = Math.max(...prepared.map((s) => s.count ?? 40));
  ctx.save();
  for (let i = 0; i < max; i++) {
    for (const s of prepared) {
      const count = s.count ?? 40;
      if (i >= count) continue;
      let layer = deform(s.base, s.effRounds, rng, s.spread ?? 1);
      if (s.jitter) {
        const jx = rng.gauss(0, s.jitter), jy = rng.gauss(0, s.jitter);
        layer = layer.map((p) => ({ x: p.x + jx, y: p.y + jy }));
      }
      const d = s.drift ?? 4;
      const c = shift(s.color, rng.gauss(0, d), rng.gauss(0, d * 0.8), rng.gauss(0, d * 0.5));
      ctx.globalCompositeOperation = s.comp ?? 'source-over';
      ctx.fillStyle = hslStr(c, s.alpha ?? 0.045);
      if (s.clip) {
        ctx.save();
        tracePoly(ctx, s.clip);
        ctx.clip();
        tracePoly(ctx, layer);
        ctx.fill();
        ctx.restore();
      } else {
        tracePoly(ctx, layer);
        ctx.fill();
      }
    }
  }
  ctx.restore();
  return prepared.map((p) => p.base);
}

// Pigmento que se acumula en el borde. Usa la diferencia entre el alfa y su
// versión desenfocada, así el anillo sigue el contorno real de la mancha.
export function edgeDarken(canvas, color, strength = 0.8, blur = 5, rng = null) {
  const w = canvas.width, h = canvas.height;
  const blurred = softBlurInto(canvas, blur, 1);
  const rim = makeCanvas(w, h);
  const r = ctx2d(rim);
  r.drawImage(canvas, 0, 0);
  r.globalCompositeOperation = 'destination-out';
  r.drawImage(blurred, 0, 0);
  r.drawImage(blurred, 0, 0);
  r.globalCompositeOperation = 'source-in';
  r.fillStyle = hslStr(color, 1);
  r.fillRect(0, 0, w, h);
  const c = ctx2d(canvas);
  c.save();
  c.globalCompositeOperation = 'source-atop';
  c.globalAlpha = Math.min(1, strength);
  c.drawImage(rim, 0, 0);
  if (strength > 1) {
    c.globalAlpha = strength - 1;
    c.drawImage(rim, 0, 0);
  }
  c.restore();
  freeCanvas(blurred);
  freeCanvas(rim);
}

// Contorno irregular extra (pasadas finas y discontinuas del borde húmedo).
export function edgeStrokes(ctx, base, rng, color, { passes = 5, width = 1, alpha = 0.12, rounds = 2 } = {}) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.lineJoin = 'round';
  for (let i = 0; i < passes; i++) {
    const p = deform(base, rounds, rng, 0.6);
    ctx.strokeStyle = hslStr(shift(color, rng.gauss(0, 4), 0, rng.gauss(0, 3)), alpha * rng.range(0.6, 1.2));
    ctx.lineWidth = width * rng.range(0.6, 1.5);
    ctx.setLineDash([rng.range(8, 40) * width, rng.range(2, 14) * width]);
    ctx.lineDashOffset = rng.range(0, 50);
    tracePoly(ctx, p);
    ctx.stroke();
  }
  ctx.restore();
}

// Granulación: el pigmento se asienta en los valles del grano.
export function granulate(canvas, grainTile, color, strength = 0.35, ox = 0, oy = 0) {
  const w = canvas.width, h = canvas.height;
  const g = makeCanvas(w, h);
  const gc = ctx2d(g);
  fillPattern(gc, grainTile, w, h, ox, oy);
  gc.globalCompositeOperation = 'source-in';
  gc.fillStyle = hslStr(color, 1);
  gc.fillRect(0, 0, w, h);
  const c = ctx2d(canvas);
  c.save();
  c.globalCompositeOperation = 'source-atop';
  c.globalAlpha = strength;
  c.drawImage(g, 0, 0);
  c.restore();
  freeCanvas(g);
}

// Levantar pigmento (luces reservadas): se ve el papel crema de abajo.
export function lift(ctx, poly, rng, { alpha = 0.08, count = 14, rounds = 3, baseRounds = 4, spread = 1 } = {}) {
  const base = deform(withVariance(poly, rng), baseRounds, rng, spread);
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    tracePoly(ctx, deform(base, rounds, rng, spread));
    ctx.fill();
  }
  ctx.restore();
}

// Levantado blando: la forma se desenfoca antes de quitar pigmento, así la
// luz tiene un lado difuso y el papel aparece limpio en el centro.
export function liftSoft(canvas, poly, rng, { alpha = 0.8, blur = 6, hard = 0.25 } = {}) {
  const w = canvas.width, h = canvas.height;
  const t = makeCanvas(w, h);
  const tc = ctx2d(t);
  glaze(tc, [{ poly, color: { h: 0, s: 0, l: 0 }, alpha: 0.2, count: 10, baseRounds: 3, rounds: 3, drift: 0, spread: 0.6 }], rng);
  const b = softBlurInto(t, blur, 1);
  const c = ctx2d(canvas);
  c.save();
  c.globalCompositeOperation = 'destination-out';
  c.globalAlpha = alpha;
  c.drawImage(b, 0, 0);
  c.globalAlpha = hard;
  c.drawImage(t, 0, 0);
  c.restore();
  freeCanvas(t);
  freeCanvas(b);
}

// Mancha blanda (húmedo sobre húmedo): se desenfoca y entra "sangrando".
export function wetBleed(canvas, poly, color, rng, { alpha = 0.6, blur = 8, count = 10, comp = 'source-atop' } = {}) {
  const w = canvas.width, h = canvas.height;
  const t = makeCanvas(w, h);
  const tc = ctx2d(t);
  glaze(tc, [{ poly, color, alpha: 0.12, count, baseRounds: 4, rounds: 3, drift: 5 }], rng);
  const b = softBlurInto(t, blur, 1);
  const c = ctx2d(canvas);
  c.save();
  c.globalCompositeOperation = comp;
  c.globalAlpha = alpha;
  c.drawImage(b, 0, 0);
  c.globalAlpha = alpha * 0.5;
  c.drawImage(t, 0, 0);
  c.restore();
  freeCanvas(t);
  freeCanvas(b);
}

// Base de papel crema bajo el pigmento, con la forma del propio pigmento:
// así las luces son papel sin pintar y no "transparente".
// Si se pasa "poly", la base sale de ese polígono (más limpia que el alfa del
// pigmento, cuya franja externa es muy tenue).
export function paperUnderlay(canvas, paperTile, ox = 0, oy = 0, boost = 3, poly = null, rng = null) {
  const w = canvas.width, h = canvas.height;
  const m = makeCanvas(w, h);
  const mc = ctx2d(m);
  if (poly) {
    mc.fillStyle = '#000';
    for (let i = 0; i < boost; i++) {
      tracePoly(mc, rng ? deform(poly, 1, rng, 0.3) : poly);
      mc.globalAlpha = i === 0 ? 0.9 : 0.35;
      mc.fill();
    }
    mc.globalAlpha = 1;
  } else {
    for (let i = 0; i < boost; i++) mc.drawImage(canvas, 0, 0);
  }
  mc.globalCompositeOperation = 'source-in';
  fillPattern(mc, paperTile, w, h, ox, oy);
  const c = ctx2d(canvas);
  c.save();
  c.globalCompositeOperation = 'destination-over';
  c.drawImage(m, 0, 0);
  c.restore();
  freeCanvas(m);
}

// Salpicado fino de pigmento.
export function splatter(ctx, rng, color, { n = 12, x = 0, y = 0, rx = 40, ry = 40, size = 1.2, alpha = 0.35 } = {}) {
  ctx.save();
  for (let i = 0; i < n; i++) {
    const a = rng.next() * Math.PI * 2, d = Math.abs(rng.gauss(0, 0.6));
    const px = x + Math.cos(a) * rx * d, py = y + Math.sin(a) * ry * d;
    const r = size * Math.pow(rng.next(), 2.2) + size * 0.25;
    ctx.fillStyle = hslStr(shift(color, rng.gauss(0, 5), 0, rng.gauss(0, 4)), alpha * rng.range(0.5, 1));
    ctx.beginPath();
    ctx.ellipse(px, py, r, r * rng.range(0.7, 1), rng.next() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Lápiz de color suave y discontinuo siguiendo una curva.
export function pencil(ctx, pts, rng, color, { width = 0.7, alpha = 0.35 } = {}) {
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < pts.length - 1; i++) {
    if (rng.chance(0.22)) continue;
    const a = pts[i], b = pts[i + 1];
    ctx.strokeStyle = hslStr(shift(color, 0, 0, rng.gauss(0, 4)), alpha * rng.range(0.4, 1));
    ctx.lineWidth = width * rng.range(0.6, 1.3);
    ctx.beginPath();
    ctx.moveTo(a.x + rng.gauss(0, 0.3), a.y + rng.gauss(0, 0.3));
    ctx.lineTo(b.x + rng.gauss(0, 0.3), b.y + rng.gauss(0, 0.3));
    ctx.stroke();
  }
  ctx.restore();
}
