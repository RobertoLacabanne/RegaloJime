// Orquesta el horneado: en un Web Worker con OffscreenCanvas cuando se
// puede (el hilo de animación nunca se bloquea); si no, en el hilo
// principal, en momentos quietos.
import { bakeItem, liteOf } from './bakeItem.js';
import { bakeWrap, bakeBow, bakeLoosePetals } from './wrap.js';
import { easeBloom } from './ease.js';

function supportsWorkerBake() {
  try {
    if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') return false;
    const oc = new OffscreenCanvas(1, 1);
    return !!oc.getContext('2d') && typeof oc.transferToImageBitmap === 'function';
  } catch (e) {
    return false;
  }
}

export class Baker {
  constructor() {
    this.worker = null;
    this.seq = 0;
    this.pending = new Map();
    if (supportsWorkerBake() && !new URLSearchParams(location.search).has('sinworker')) {
      try {
        this.worker = new Worker(new URL('./bake.worker.js', import.meta.url), { type: 'module' });
        this.worker.onmessage = (e) => {
          const { id, ok, data, error } = e.data;
          const p = this.pending.get(id);
          if (!p) return;
          this.pending.delete(id);
          if (ok) p.resolve(data);
          else p.reject(new Error(error));
        };
        this.worker.onerror = (e) => {
          console.warn('Worker de horneado falló; sigo en el hilo principal.', e.message);
          this.worker = null;
          for (const p of this.pending.values()) p.fallback();
          this.pending.clear();
        };
      } catch (e) {
        this.worker = null;
      }
    }
  }

  get mode() {
    return this.worker ? 'worker' : 'hilo principal';
  }

  call(type, lite, px, local) {
    if (!this.worker) return Promise.resolve().then(local);
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, fallback: () => resolve(local()) });
      this.worker.postMessage({ id, type, lite, px });
    });
  }

  item(plan, px) {
    const lite = liteOf(plan);
    return this.call('item', lite, px, () => bakeItem(lite, px)).then((d) => {
      for (const p of d.head.parts) if (!p.ease) p.ease = easeBloom;
      return d;
    });
  }

  final(px) {
    return this.call('final', null, px, () => ({
      wrap: bakeWrap(px),
      bow: bakeBow(px),
      rain: bakeLoosePetals(px, ['#A3122B', '#F6D86B', '#F3C89A', '#F08A24', '#F2B705', '#C4303F'], 'lluvia'),
    }));
  }
}
