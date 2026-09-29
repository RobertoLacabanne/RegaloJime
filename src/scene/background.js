// Fondo: papel de algodón con grano, viñeta cálida y un lavado muy pálido
// detrás del ramo (como el que deja un acuarelista antes de pintar).
import { makeRng } from '../paint/rng.js';
import { getPaper, fillPattern } from '../paint/paper.js';
import { glaze, edgeDarken } from '../paint/brush.js';
import { hsl } from '../paint/color.js';
import { makeCanvas, ctx2d, freeCanvas } from '../paint/canvas.js';
import { ellipsePoly } from '../flowers/common.js';

export function paintBackground(cv, cssW, cssH, focus) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(cssW * dpr);
  cv.height = Math.round(cssH * dpr);
  cv.style.width = cssW + 'px';
  cv.style.height = cssH + 'px';
  const c = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const rng = makeRng('fondo');
  fillPattern(c, getPaper().paper, W, H);
  // a pantalla completa el grano se suaviza: una veladura crema encima
  c.fillStyle = 'rgba(251,243,228,0.45)';
  c.fillRect(0, 0, W, H);
  // lavado pálido detrás del ramo, con borde que secó (charco en el borde)
  const wash = makeCanvas(W, H);
  const wc = ctx2d(wash);
  const fx = focus.x * dpr, fy = focus.y * dpr, fr = focus.r * dpr;
  glaze(wc, [
    { poly: ellipsePoly(fx, fy, fr * 1.05, fr * 1.2, 11, rng, 0.2), color: hsl('#F3C89A'), alpha: 0.006, count: 30, baseRounds: 4, rounds: 4, spread: 0.7, baseSpread: 0.8, drift: 6 },
    { poly: ellipsePoly(fx - fr * 0.35, fy - fr * 0.25, fr * 0.7, fr * 0.6, 9, rng, 0.25), color: hsl('#F6D86B'), alpha: 0.005, count: 24, baseRounds: 4, rounds: 4, spread: 0.7, drift: 6 },
    { poly: ellipsePoly(fx + fr * 0.45, fy + fr * 0.35, fr * 0.55, fr * 0.5, 9, rng, 0.25), color: hsl('#B8C4A0'), alpha: 0.004, count: 20, baseRounds: 4, rounds: 4, spread: 0.7, drift: 6 },
  ], rng);
  edgeDarken(wash, hsl('#D9A77A'), 0.12, 4);
  c.drawImage(wash, 0, 0);
  freeCanvas(wash);
  // viñeta cálida (siena muy diluida hacia los bordes)
  const g = c.createRadialGradient(W * 0.46, H * 0.42, Math.min(W, H) * 0.3, W * 0.5, H * 0.5, Math.max(W, H) * 0.78);
  g.addColorStop(0, 'rgba(160,100,60,0)');
  g.addColorStop(1, 'rgba(150,90,55,0.16)');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  // la viñeta también granula
  const gr = makeCanvas(W, H);
  const gc = ctx2d(gr);
  fillPattern(gc, getPaper().grain, W, H);
  gc.globalCompositeOperation = 'source-in';
  gc.fillStyle = 'rgba(140,90,60,1)';
  gc.fillRect(0, 0, W, H);
  c.globalAlpha = 0.07;
  c.drawImage(gr, 0, 0);
  c.globalAlpha = 1;
  freeCanvas(gr);
}

// Luz de ventana: dos paños de luz cálida muy suaves (se animan por CSS con
// transform/opacity, nunca con blur).
export function paintWindowLight() {
  const S = 256;
  const cv = makeCanvas(S, S);
  const c = ctx2d(cv);
  const rng = makeRng('ventana');
  const pane = (x, y, w, h, sk) => [
    { x: x + sk, y }, { x: x + w + sk, y }, { x: x + w, y: y + h }, { x, y: y + h },
  ];
  glaze(c, [
    { poly: pane(40, 20, 70, 200, 30), color: hsl('#FFE2A8'), alpha: 0.05, count: 24, baseRounds: 4, rounds: 3, spread: 0.6, baseSpread: 0.6 },
    { poly: pane(130, 20, 70, 200, 30), color: hsl('#FFE2A8'), alpha: 0.05, count: 24, baseRounds: 4, rounds: 3, spread: 0.6, baseSpread: 0.6 },
  ], rng);
  // suavizado por reducción: 64 px estirados = bordes muy blandos
  const small = makeCanvas(40, 40);
  ctx2d(small).drawImage(cv, 0, 0, 40, 40);
  freeCanvas(cv);
  return small.toDataURL();
}
