// Escenario: un canvas de escena con sprites horneados. Se anima solo con
// transformaciones y opacidad; si nada se mueve, no se redibuja (dirty
// flag). Los elementos terminados se aplanan a un único sprite y se liberan
// sus pétalos.
import { makeRng } from '../paint/rng.js';
import { freeCanvas } from '../paint/canvas.js';
import { drawSprite, headCanvases } from './head.js';
import { drawItemRaw, flattenItem } from './itemDraw.js';
import { clamp01, easeOutCubic, easeInOutSine, easeBloom, easeOutQuint, lerp } from './ease.js';
import { SCENE } from './compose.js';
import { bakeCone } from './wrap.js';
import { applyArt, hasArt } from './assets.js';

const STEM_DUR = 0.9;
const HEAD_DELAY = 0.42;
const HEAD_DUR = 1.8;

export class Stage {
  constructor(canvas, { reduced = false } = {}) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.reduced = reduced;
    this.items = [];
    this.particles = [];
    this.final = null;
    this.dirty = true;
    this.running = false;
    this.lastDraw = 0;
    this.rng = makeRng('escenario');
    this.onSettled = null;
    this.visible = true;
    document.addEventListener('visibilitychange', () => {
      this.visible = !document.hidden;
      if (this.visible) this.kick();
    });
  }

  // area: { x, y, w, h } en px CSS dentro del canvas donde vive la escena.
  layout(cssW, cssH, area) {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.cssW = cssW;
    this.cssH = cssH;
    this.cv.width = Math.round(cssW * this.dpr);
    this.cv.height = Math.round(cssH * this.dpr);
    this.cv.style.width = cssW + 'px';
    this.cv.style.height = cssH + 'px';
    this.scale = Math.min(area.w / SCENE.W, area.h / SCENE.H);
    this.ox = area.x + (area.w - SCENE.W * this.scale) / 2;
    this.oy = area.y + (area.h - SCENE.H * this.scale);
    // la escala de horneado se fija una sola vez (rotar el teléfono solo
    // re-escala los sprites al dibujar)
    if (!this.px) this.px = Math.min(2.4, Math.max(1, this.scale * this.dpr));
    this.dirty = true;
    this.kick();
  }

  // posición en px CSS de un punto de la escena
  toScreen(p) {
    return { x: this.ox + p.x * this.scale, y: this.oy + p.y * this.scale };
  }

  bakeBase() {
    this.cone = bakeCone(this.px);
    this.dirty = true;
  }

  setFinalAssets(d) {
    this.wrap = d.wrap;
    this.bow = d.bow;
    this.rain = d.rain;
  }

  // Arma un elemento a partir de lo horneado (en el worker o acá).
  assemble(plan, d) {
    return {
      plan, head: applyArt(plan.name, d.head), stem: d.stem, burst: d.burst, stemLen: d.stemLen,
      // con arte propio la pose final se recalcula acá
      preflat: d.flat && !hasArt(plan.name) ? d.flat : (d.flat && freeCanvas(d.flat.canvas), null),
      t0: -1, done: false, flat: null, alpha: 1,
      phase: this.rng.next() * 10, phase2: this.rng.next() * 10, amp: 0.0045 + this.rng.next() * 0.002,
    };
  }

  show(item, now = performance.now()) {
    item.t0 = now / 1000;
    this.items.push(item);
    this.items.sort((a, b) => a.plan.depth - b.plan.depth || (b.plan.dist || 0) - (a.plan.dist || 0) || a.plan.index - b.plan.index);
    // pétalos que saltan donde va a abrir la flor
    const at = item.plan.kind === 'head' ? item.plan.center : this.sprayMid(item.plan);
    if (!this.reduced) this.burstAt(at, item.burst, now);
    this.kick();
  }

  sprayMid(p) {
    const lx = p.dir * p.L * 0.2, ly = -p.L * 0.7;
    return { x: p.origin.x + lx * Math.cos(p.rot) - ly * Math.sin(p.rot), y: p.origin.y + lx * Math.sin(p.rot) + ly * Math.cos(p.rot) };
  }

  burstAt(p, sprites, now) {
    const n = 11;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + this.rng.gauss(0, 0.3);
      const sp = 38 + this.rng.next() * 55;
      this.particles.push({
        sp: sprites[i % sprites.length], x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30,
        rot: this.rng.next() * 6, vr: this.rng.gauss(0, 3), t0: now / 1000, life: 1.1 + this.rng.next() * 0.6, g: 70, sc: 0.7 + this.rng.next() * 0.5,
      });
    }
  }

  // ----------------------------------------------------------- final
  startFinal(now = performance.now()) {
    this.final = { t0: now / 1000, rainUntil: now / 1000 + 9 };
    this.kick();
  }

  reset() {
    for (const it of this.items) this.release(it, true);
    this.items = [];
    this.particles = [];
    this.final = null;
    this.dirty = true;
    this.kick();
  }

  release(item, all = false) {
    const set = headCanvases(item.head);
    set.forEach(freeCanvas);
    item.head.parts = [];
    freeCanvas(item.stem.canvas);
    item.burst.forEach((b) => freeCanvas(b.canvas));
    item.burst = [];
    if (all && item.flat) freeCanvas(item.flat.canvas);
    if (all && item.preflat) freeCanvas(item.preflat.canvas);
  }

  // Aplana un elemento terminado a un único sprite y libera sus pétalos.
  // MB de bitmaps vivos de la escena (canvas propio + sprites).
  memoryMB() {
    const seen = new Set();
    let px = this.cv.width * this.cv.height;
    const add = (sp) => {
      if (!sp || !sp.canvas || seen.has(sp.canvas)) return;
      seen.add(sp.canvas);
      px += sp.canvas.width * sp.canvas.height;
    };
    for (const it of this.items) {
      add(it.flat); add(it.preflat); add(it.stem);
      it.head.parts.forEach((p) => { add(p.img); add(p.closed); });
      it.burst.forEach(add);
    }
    if (this.cone) { add(this.cone.back); add(this.cone.front); }
    if (this.wrap) this.wrap.forEach((w) => add(w.sprite));
    if (this.bow) { add(this.bow.band); add(this.bow.bow); }
    if (this.rain) this.rain.forEach(add);
    return (px * 4) / 1048576;
  }

  // Si el worker ya horneó la pose final, aplanar es cambiar la referencia.
  flatten(item) {
    item.flat = item.preflat || flattenItem(item, this.px);
    item.preflat = null;
    this.release(item);
  }

  // ----------------------------------------------------------- bucle
  kick() {
    this.dirty = true;
    if (this.running) return;
    this.running = true;
    requestAnimationFrame((t) => this.frame(t));
  }

  frame(now) {
    if (!this.visible) { this.running = false; return; }
    const t = now / 1000;
    let animating = false;
    for (const it of this.items) {
      if (!it.done) {
        const e = t - it.t0;
        const total = this.reduced ? 0.9 : HEAD_DELAY + HEAD_DUR + 0.05;
        if (e >= total) {
          it.done = true;
          this.flatten(it);
          if (this.onSettled && this.items.every((x) => x.done)) setTimeout(() => this.onSettled && this.onSettled(), 30);
        } else animating = true;
      }
    }
    this.particles = this.particles.filter((q) => t - q.t0 < q.life);
    if (this.particles.length) animating = true;
    if (this.final) {
      const e = t - this.final.t0;
      if (e < 4.2) animating = true;
      if (!this.reduced && t < this.final.rainUntil) {
        animating = true;
        if (this.rng.next() < 0.09) this.spawnRain(t);
      }
    }
    const swaying = !this.reduced && this.items.length > 0;
    // Solo balanceo: el movimiento es de subpíxel, 20 fps alcanzan.
    const minGap = animating ? 0 : 1 / 20 - 0.004;
    if (this.dirty || animating || (swaying && t - this.lastDraw >= minGap)) {
      const d0 = performance.now();
      this.draw(t);
      const dm = performance.now() - d0;
      this.stats = this.stats || { n: 0, ms: 0, max: 0 };
      this.stats.n++; this.stats.ms += dm; this.stats.max = Math.max(this.stats.max, dm);
      this.lastDraw = t;
      this.dirty = false;
    }
    if (animating || swaying) requestAnimationFrame((n) => this.frame(n));
    else this.running = false;
  }

  spawnRain(t) {
    if (!this.rain) return;
    this.particles.push({
      sp: this.rain[Math.floor(this.rng.next() * this.rain.length)],
      x: 30 + this.rng.next() * (SCENE.W - 60), y: -20 - (this.oy / this.scale), vx: this.rng.gauss(0, 6), vy: 26 + this.rng.next() * 18,
      rot: this.rng.next() * 6, vr: this.rng.gauss(0, 1.2), t0: t, life: 9, g: 0, sc: 0.7 + this.rng.next() * 0.5, rain: true, ph: this.rng.next() * 6,
    });
  }

  draw(t) {
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.cv.width, this.cv.height);
    c.setTransform(this.dpr * this.scale, 0, 0, this.dpr * this.scale, this.dpr * this.ox, this.dpr * this.oy);
    if (this.cone) drawSprite(c, this.cone.back);
    for (const it of this.items) {
      const e = t - it.t0;
      c.save();
      if (!this.reduced) {
        const sw = it.amp * (Math.sin(t * 0.43 + it.phase) * 0.65 + Math.sin(t * 0.71 + it.phase2) * 0.35);
        c.translate(SCENE.B.x, SCENE.B.y);
        c.rotate(sw);
        c.translate(-SCENE.B.x, -SCENE.B.y);
      }
      if (it.flat) {
        drawSprite(c, it.flat);
      } else if (this.reduced) {
        c.globalAlpha = clamp01(e / 0.9);
        drawItemRaw(c, it, 1, 1);
        c.globalAlpha = 1;
      } else {
        const stemU = easeOutCubic(clamp01(e / STEM_DUR));
        const headT = clamp01((e - HEAD_DELAY) / HEAD_DUR);
        drawItemRaw(c, it, stemU, headT);
      }
      c.restore();
    }
    if (this.cone) drawSprite(c, this.cone.front);
    if (this.final) this.drawFinal(c, t);
    for (const q of this.particles) {
      const e = t - q.t0;
      let x, y;
      if (q.rain) {
        x = q.x + q.vx * e + Math.sin(e * 1.3 + q.ph) * 12;
        y = q.y + q.vy * e;
      } else {
        const drag = 1 - Math.exp(-e * 2.2);
        x = q.x + (q.vx / 2.2) * drag;
        y = q.y + (q.vy / 2.2) * drag + 0.5 * q.g * e * e * 0.6;
      }
      const a = q.rain ? clamp01(e / 0.6) * clamp01((q.life - e) / 1.5) : clamp01((q.life - e) / (q.life * 0.45));
      c.save();
      c.translate(x, y);
      c.rotate(q.rot + q.vr * e);
      c.scale(q.sc, q.sc * (0.6 + 0.4 * Math.abs(Math.cos(e * 2 + q.rot))));
      drawSprite(c, q.sp, a);
      c.restore();
    }
  }

  drawFinal(c, t) {
    const e = t - this.final.t0;
    if (!this.wrap) return;
    const R = this.reduced;
    // 1) el papel sube envolviendo
    this.wrap.forEach((w, i) => {
      const u = R ? clamp01(e / 0.8) : easeOutQuint(clamp01((e - i * 0.18) / 1.5));
      c.save();
      const piv = { x: 200, y: 610 };
      c.translate(piv.x, piv.y + (R ? 0 : (1 - u) * 240));
      c.rotate((R ? 0 : (1 - u) * 0.22) * w.side);
      c.translate(-piv.x, -piv.y);
      drawSprite(c, w.sprite, R ? u : clamp01(u * 3));
      c.restore();
    });
    // 2) la cinta rodea el cuello y se ata el moño
    const ub = R ? clamp01((e - 0.6) / 0.8) : clamp01((e - 1.5) / 0.7);
    if (ub > 0) {
      c.save();
      if (!R) {
        c.beginPath();
        c.rect(116, 400, 170 * easeInOutSine(ub) + 4, 80);
        c.clip();
      }
      drawSprite(c, this.bow.band, R ? ub : 1);
      c.restore();
    }
    const uk = R ? ub : clamp01((e - 2.05) / 0.9);
    if (uk > 0) {
      const k = R ? 1 : easeBloom(uk);
      c.save();
      c.translate(this.bow.knot.x, this.bow.knot.y);
      c.scale(lerp(0.2, 1, k), lerp(0.2, 1, k));
      c.translate(-this.bow.knot.x, -this.bow.knot.y);
      drawSprite(c, this.bow.bow, clamp01(uk * 2.5));
      c.restore();
    }
  }
}
