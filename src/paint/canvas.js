// Utilidades de canvas para horneado. Todo lo temporal se libera a 1×1.
// Contabilidad de memoria de canvas (para no pasarnos del tope de iOS).
// (Solo contadores: guardar referencias a los canvases impediría que el
// recolector libere los que se descartan sin pasar por freeCanvas.)
export const canvasStats = { created: 0, peakPx: 0, livePx: 0 };

const inWorker = typeof document === 'undefined';

export function makeCanvas(w, h) {
  const W = Math.max(1, Math.ceil(w)), H = Math.max(1, Math.ceil(h));
  // En el worker de horneado no hay DOM: OffscreenCanvas.
  const c = inWorker ? new OffscreenCanvas(W, H) : document.createElement('canvas');
  c.width = W;
  c.height = H;
  canvasStats.created++;
  canvasStats.livePx += c.width * c.height;
  if (canvasStats.livePx > canvasStats.peakPx) canvasStats.peakPx = canvasStats.livePx;
  return c;
}

export function canvasMB() {
  return (canvasStats.livePx * 4) / 1048576;
}

export function ctx2d(c) {
  return c.getContext('2d', { willReadFrequently: false });
}

export function freeCanvas(c) {
  if (!c || c.tagName === 'IMG') return; // el arte propio (PNG) no se toca
  if (typeof c.close === 'function') {
    // ImageBitmap
    c.close();
    return;
  }
  canvasStats.livePx -= c.width * c.height - 1;
  c.width = 1;
  c.height = 1;
}

// Desenfoque barato y universal: bajar de resolución y volver a subir.
// (ctx.filter no existe en Safari viejos; esto anda en todos lados.)
export function softBlurInto(src, factor = 6, passes = 2) {
  const w = src.width, h = src.height;
  let cur = src;
  const temps = [];
  let cw = w, ch = h;
  for (let i = 0; i < passes; i++) {
    cw = Math.max(2, Math.round(cw / (i === 0 ? factor : 2)));
    ch = Math.max(2, Math.round(ch / (i === 0 ? factor : 2)));
    const t = makeCanvas(cw, ch);
    const x = ctx2d(t);
    x.imageSmoothingEnabled = true;
    x.imageSmoothingQuality = 'high';
    x.drawImage(cur, 0, 0, cw, ch);
    temps.push(t);
    cur = t;
  }
  const out = makeCanvas(w, h);
  const o = ctx2d(out);
  o.imageSmoothingEnabled = true;
  o.imageSmoothingQuality = 'high';
  o.drawImage(cur, 0, 0, w, h);
  temps.forEach(freeCanvas);
  return out;
}

export function cloneCanvas(src) {
  const c = makeCanvas(src.width, src.height);
  ctx2d(c).drawImage(src, 0, 0);
  return c;
}
