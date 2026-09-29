// Worker de horneado: pinta fuera del hilo principal y devuelve
// ImageBitmaps transferibles (sin copias).
import { bakeItem, serialize, withFlat } from './bakeItem.js';
import { bakeWrap, bakeBow, bakeLoosePetals } from './wrap.js';

const toBitmap = (c) => c.transferToImageBitmap();

self.onmessage = (e) => {
  const { id, type, lite, px } = e.data;
  try {
    if (type === 'item') {
      const { out, transfer } = serialize(withFlat(bakeItem(lite, px), lite, px), toBitmap);
      self.postMessage({ id, ok: true, data: out }, transfer);
    } else if (type === 'final') {
      const wrap = bakeWrap(px).map((w) => ({ side: w.side, sprite: { ...w.sprite, canvas: toBitmap(w.sprite.canvas) } }));
      const b = bakeBow(px);
      const bow = { knot: b.knot, band: { ...b.band, canvas: toBitmap(b.band.canvas) }, bow: { ...b.bow, canvas: toBitmap(b.bow.canvas) } };
      const rain = bakeLoosePetals(px, ['#A3122B', '#F6D86B', '#F3C89A', '#F08A24', '#F2B705', '#C4303F'], 'lluvia').map((r) => ({ ...r, canvas: toBitmap(r.canvas) }));
      const transfer = [...wrap.map((w) => w.sprite.canvas), bow.band.canvas, bow.bow.canvas, ...rain.map((r) => r.canvas)];
      self.postMessage({ id, ok: true, data: { wrap, bow, rain } }, transfer);
    }
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err && err.stack || err) });
  }
};
