// Qué es cada flor para la composición: cómo se hornea, cuánto "pesa"
// visualmente, en qué capa de profundidad va y dónde puede ubicarse.
import { bakeRose } from '../flowers/rose.js';
import { bakeGerbera } from '../flowers/gerbera.js';
import { bakeChrysanthemum } from '../flowers/chrysanthemum.js';
import { bakeAlstroemeria } from '../flowers/alstroemeria.js';
import { bakeFreesia } from '../flowers/freesia.js';
import { bakeEucalyptus, bakeFern, bakeBabysBreath } from '../flowers/greens.js';
import { hsl } from '../paint/color.js';

// Tamaño general de las flores respecto del cono.
export const K = 1.45;

// kind: 'head' = cabeza con tallo desde el punto de atado.
//       'spray' = rama con su propio eje que nace cerca del borde del cono.
export const FLOWERS = {
  'rosa roja': {
    kind: 'head', vr: 36 * K, mass: 3.2, depth: 5, focal: 1, dist: [222, 268], stem: hsl('#4E6A38'),
    bake: (o) => bakeRose({ ...o, variant: 'red', r: 34 * K }), burst: ['#A3122B', '#C4303F', '#7C0D2A'],
  },
  'rosa amarilla': {
    kind: 'head', vr: 36 * K, mass: 3.0, depth: 5, focal: 0.9, dist: [218, 268], stem: hsl('#56703C'),
    bake: (o) => bakeRose({ ...o, variant: 'yellow', r: 34 * K }), burst: ['#F6D86B', '#F2B705', '#F08A24'],
  },
  gerbera: {
    kind: 'head', vr: 40 * K, mass: 3.2, depth: 5, focal: 1, dist: [228, 272], stem: hsl('#6E8A45'),
    bake: (o) => bakeGerbera({ ...o, r: 40 * K }), burst: ['#F4D48E', '#EBB468'],
  },
  crisantemo: {
    kind: 'head', vr: 33 * K, mass: 2.2, depth: 4.6, focal: 0.4, dist: [196, 276], stem: hsl('#5E7A40'),
    bake: (o) => bakeChrysanthemum({ ...o, r: 32 * K }), burst: ['#F6E04E', '#F9EB8C'],
  },
  alstroemeria: {
    kind: 'head', vr: 36 * K, mass: 1.9, depth: 4.4, focal: 0.3, dist: [160, 200], center: { x: 0, y: -32 * K }, stem: hsl('#6F8A45'),
    bake: (o) => bakeAlstroemeria({ ...o, r: 21 * K }), burst: ['#F5CD3C', '#F8DC6A'],
  },
  fresia: {
    kind: 'spray', L: 74 * K, mass: 1.3, depth: 5.6, focal: 0, d0: 180, reach: 0.95, stem: hsl('#6E8A40'),
    bake: bakeFreesia, burst: ['#F6A21E', '#F9C24A'],
  },
  paniculata: {
    kind: 'spray', L: 118 * K, mass: 1.0, depth: 2.6, focal: 0, d0: 128, reach: 1.0, stem: hsl('#8C9A70'),
    bake: bakeBabysBreath, burst: ['#FFFBF1', '#F4EEDD'],
  },
  eucalipto: {
    kind: 'spray', L: 310, mass: 1.6, depth: 1, focal: 0, d0: 52, reach: 1.0, stem: hsl('#8A4A3A'),
    bake: bakeEucalyptus, burst: ['#93AAA2', '#A3B2A8'],
  },
  helecho: {
    kind: 'spray', L: 160 * K, mass: 1.4, depth: 0, focal: 0, d0: 50, reach: 1.0, stem: hsl('#4E6A36'),
    bake: bakeFern, burst: ['#4F6E3E', '#7A944E'],
  },
};

export function flowerDef(name) {
  const key = String(name || '').trim().toLowerCase();
  const def = FLOWERS[key];
  if (!def) {
    console.warn(`Flor desconocida "${name}", uso crisantemo.`);
    return { name: 'crisantemo', ...FLOWERS.crisantemo };
  }
  return { name: key, ...def };
}
