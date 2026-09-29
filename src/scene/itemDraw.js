// Dibujo de un elemento (tallo + cabeza) y su versión aplanada. Lo usan el
// escenario y el worker (que hornea de antemano la pose final).
import { drawHead, drawSprite, headBounds } from './head.js';
import { SCENE } from './compose.js';
import { makeCanvas, ctx2d } from '../paint/canvas.js';

export function drawItemRaw(c, item, stemU, headT) {
  const p = item.plan;
  c.save();
  c.translate(SCENE.B.x, SCENE.B.y);
  if (stemU < 1) {
    c.save();
    c.beginPath();
    c.arc(0, 0, Math.max(0.01, item.stemLen * stemU), 0, Math.PI * 2);
    c.clip();
    drawSprite(c, item.stem);
    c.restore();
  } else drawSprite(c, item.stem);
  c.restore();
  if (headT > 0) {
    const pos = p.kind === 'head' ? p.pos : p.origin;
    c.save();
    c.translate(pos.x, pos.y);
    c.rotate(p.rot);
    drawHead(c, item.head, headT);
    c.restore();
  }
}

// Pose final en un único sprite (recortado bajo el borde del cono).
export function flattenItem(item, s) {
  const p = item.plan;
  const hb = headBounds(item.head);
  const pos = p.kind === 'head' ? p.pos : p.origin;
  const cs = Math.cos(p.rot), sn = Math.sin(p.rot);
  let x0 = SCENE.B.x - 4, y0 = SCENE.B.y + 4, x1 = SCENE.B.x + 4, y1 = SCENE.B.y + 4;
  for (const [cx, cy] of [[hb.x0, hb.y0], [hb.x1, hb.y0], [hb.x0, hb.y1], [hb.x1, hb.y1]]) {
    const x = pos.x + cx * cs - cy * sn, y = pos.y + cx * sn + cy * cs;
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  const st = item.stem;
  x0 = Math.min(x0, SCENE.B.x - st.ax / st.s); y0 = Math.min(y0, SCENE.B.y - st.ay / st.s);
  x1 = Math.max(x1, SCENE.B.x + (st.canvas.width - st.ax) / st.s); y1 = Math.max(y1, SCENE.B.y + (st.canvas.height - st.ay) / st.s);
  // lo que queda debajo del borde del cono no se ve: no se guarda
  y1 = Math.min(y1, SCENE.RIM + 18);
  x0 = Math.floor(x0 - 2); y0 = Math.floor(y0 - 2); x1 = Math.ceil(x1 + 2); y1 = Math.ceil(y1 + 2);
  const cv = makeCanvas((x1 - x0) * s, (y1 - y0) * s);
  const c = ctx2d(cv);
  c.setTransform(s, 0, 0, s, -x0 * s, -y0 * s);
  drawItemRaw(c, item, 1, 1);
  return { canvas: cv, ax: -x0 * s, ay: -y0 * s, s };
}
