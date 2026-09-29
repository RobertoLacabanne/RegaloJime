// Una "cabeza" de flor = lista de partes (sprites horneados) con su pose
// abierta y su pose de capullo. drawHead interpola según el progreso.
import { clamp01, lerp, easeBloom } from './ease.js';

export function part(img, o) {
  return {
    img,
    closed: o.closed || null,
    x: o.x ?? 0, y: o.y ?? 0, rot: o.rot ?? 0, sx: o.sx ?? 1, sy: o.sy ?? o.sx ?? 1,
    x0: o.x0 ?? o.x ?? 0, y0: o.y0 ?? o.y ?? 0, rot0: o.rot0 ?? o.rot ?? 0,
    sx0: o.sx0 ?? 0.2, sy0: o.sy0 ?? o.sx0 ?? 0.2,
    delay: o.delay ?? 0, dur: o.dur ?? 0.6, a0: o.a0 ?? 0, revealR: o.revealR ?? 0,
    ease: o.ease || easeBloom,
  };
}

// t ∈ [0,1] progreso global de la floración.
export function drawHead(ctx, head, t = 1) {
  for (const p of head.parts) {
    const u = clamp01((t - p.delay) / p.dur);
    if (u <= 0 && p.a0 <= 0) continue;
    const e = p.ease(u);
    const alpha = lerp(p.a0, 1, clamp01(u * 2.2));
    if (alpha <= 0.002) continue;
    ctx.save();
    ctx.translate(lerp(p.x0, p.x, e), lerp(p.y0, p.y, e));
    ctx.rotate(lerp(p.rot0, p.rot, e));
    ctx.scale(lerp(p.sx0, p.sx, e), lerp(p.sy0, p.sy, e));
    if (p.revealR && u < 1) {
      // crecimiento de tallos: se descubre desde el ancla con un clip circular
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(0.01, p.revealR * u), 0, Math.PI * 2);
      ctx.clip();
      drawSprite(ctx, p.img, 1);
    } else if (p.closed && u < 1) {
      drawSprite(ctx, p.closed, alpha * (1 - clamp01(u * 1.4)));
      drawSprite(ctx, p.img, alpha * clamp01(u * 1.4));
    } else {
      drawSprite(ctx, p.img, alpha);
    }
    ctx.restore();
  }
}

export function drawSprite(ctx, sp, alpha = 1) {
  if (alpha <= 0) return;
  ctx.globalAlpha = alpha;
  const k = 1 / sp.s;
  ctx.drawImage(sp.canvas, -sp.ax * k, -sp.ay * k, sp.canvas.width * k, sp.canvas.height * k);
  ctx.globalAlpha = 1;
}

// Caja (en unidades de la cabeza) que ocupa la pose final de todas las partes.
export function headBounds(head) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of head.parts) {
    const sp = p.img;
    const k = 1 / sp.s;
    const w = sp.canvas.width * k, h = sp.canvas.height * k;
    const ax = sp.ax * k, ay = sp.ay * k;
    const cs = Math.cos(p.rot), sn = Math.sin(p.rot);
    for (const [cx, cy] of [[-ax, -ay], [w - ax, -ay], [-ax, h - ay], [w - ax, h - ay]]) {
      const X = cx * p.sx, Y = cy * p.sy;
      const x = p.x + X * cs - Y * sn, y = p.y + X * sn + Y * cs;
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
  }
  return { x0, y0, x1, y1 };
}

// Todos los canvases que usa una cabeza (para liberarlos después).
export function headCanvases(head) {
  const set = new Set();
  for (const p of head.parts) {
    set.add(p.img.canvas);
    if (p.closed) set.add(p.closed.canvas);
  }
  return set;
}
