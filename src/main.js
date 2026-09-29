import '@fontsource/cormorant-garamond/latin-500-italic.css';
import '@fontsource/cormorant-garamond/latin-400-italic.css';
import '@fontsource/caveat/latin-500.css';
import './style.css';
import content from './content.js';
import { Stage } from './scene/stage.js';
import { planBouquet, SCENE } from './scene/compose.js';
import { paintBackground, paintWindowLight } from './scene/background.js';
import { Chime } from './scene/audio.js';
import { loadArt } from './scene/assets.js';
import { Baker } from './scene/baker.js';
import { paintCard, paintStroke } from './ui/decor.js';
import { canvasMB } from './paint/canvas.js';

const $ = (s) => document.querySelector(s);
const app = $('#app');
const bg = $('#bg');
const wrapEl = $('#stageWrap');
const versesEl = $('#verses');
const titleEl = $('#title');
const hintEl = $('#hint');
const finalEl = $('#final');
const cardEl = $('#card');
const soundEl = $('#sound');

const params = new URLSearchParams(location.search);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || params.has('calma');
// ?demo=N (control de calidad): N pasos sintéticos, para probar 6 a 16.
const DEMO = ['helecho', 'eucalipto', 'rosa roja', 'gerbera', 'rosa amarilla', 'crisantemo', 'helecho', 'rosa roja', 'fresia', 'alstroemeria', 'rosa amarilla', 'crisantemo', 'gerbera', 'fresia', 'paniculata', 'paniculata'];
const demoN = parseInt(params.get('demo') || '0', 10);
const steps = (demoN
  ? (demoN <= 8 ? ['helecho', 'eucalipto', 'rosa roja', 'gerbera', 'rosa amarilla', 'crisantemo', 'alstroemeria', 'paniculata'] : DEMO).slice(0, Math.min(16, demoN)).map((flor, i) => ({ flor, verso: `[VERSO ${i + 1} – reemplazar]` }))
  : content.pasos || []).slice(0, 16);
const seed = `${content.destinataria || 'ramo'}-${steps.map((s) => s.flor).join('|')}`;

const stage = new Stage($('#scene'), { reduced });
const chime = new Chime();
const plan = planBouquet(steps, seed);
const baker = new Baker();
const prepared = []; // elementos listos para mostrar
const promised = []; // horneados en curso
let generation = 0; // cambia al reiniciar
let current = 0;
let cooldownUntil = 0;
let queued = 0;
let finished = false;
let finalState = null;
let area = null;

// ------------------------------------------------------------ textos
document.title = content.titulo || 'Un ramo';
titleEl.innerHTML = '';
titleEl.append(document.createTextNode(content.titulo || ''));
const small = document.createElement('small');
small.textContent = `para ${content.destinataria}`;
titleEl.append(small);
hintEl.textContent = content.pista || 'tocá';

function renderSound() {
  soundEl.innerHTML = chime.muted ? 'sonido <s>sí</s> no' : 'sonido sí';
  soundEl.setAttribute('aria-pressed', String(!chime.muted));
  soundEl.setAttribute('aria-label', chime.muted ? 'Activar sonido' : 'Silenciar');
}
renderSound();

function isPlaceholder(v) {
  return /^\s*\[.*\]\s*$/.test(v);
}

function addVerse(text) {
  const before = new Map([...versesEl.querySelectorAll('.line')].map((l) => [l, l.getBoundingClientRect().top]));
  const line = document.createElement('p');
  line.className = 'line' + (isPlaceholder(text) ? ' placeholder' : '');
  const words = String(text).split(/\s+/).filter(Boolean);
  words.forEach((w, i) => {
    const span = document.createElement('span');
    span.className = 'w';
    span.textContent = w;
    line.append(span);
    if (i < words.length - 1) line.append(document.createTextNode(' '));
  });
  versesEl.append(line);
  // FLIP: los versos anteriores suben suavemente y se atenúan
  const lines = [...versesEl.querySelectorAll('.line')];
  lines.forEach((l, i) => {
    const from = before.get(l);
    if (from != null) {
      const dy = from - l.getBoundingClientRect().top;
      l.style.transition = 'none';
      l.style.transform = `translate3d(0, ${dy}px, 0)`;
      requestAnimationFrame(() => {
        l.style.transition = '';
        l.style.transform = '';
      });
    }
    const age = lines.length - 1 - i;
    l.classList.toggle('old', age >= 1);
    l.classList.toggle('gone', age >= 4);
  });
  lines.slice(0, Math.max(0, lines.length - 6)).forEach((l) => l.remove());
  const spans = [...line.querySelectorAll('.w')];
  const gap = reduced ? 0 : Math.min(150, 1100 / Math.max(1, spans.length));
  requestAnimationFrame(() => requestAnimationFrame(() => {
    spans.forEach((s, i) => setTimeout(() => s.classList.add('on'), 250 + i * gap));
  }));
}

// ------------------------------------------------------------ layout
const probe = document.createElement('div');
probe.style.cssText = 'position:absolute;visibility:hidden;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)';
document.body.append(probe);

function layout() {
  const W = app.clientWidth, H = app.clientHeight;
  const cs = getComputedStyle(probe);
  const st = parseFloat(cs.paddingTop) || 0, sb = parseFloat(cs.paddingBottom) || 0;
  const col = Math.min(W, 460);
  const versesH = Math.round(Math.max(150, Math.min(250, H * 0.25)));
  app.style.setProperty('--verses-h', versesH + 'px');
  const top = st + 14 + versesH;
  area = { x: (W - col) / 2 + 4, y: top, w: col - 8, h: H - top - sb - 8 };
  stage.layout(W, H, area);
  const focus = stage.toScreen({ x: SCENE.W / 2, y: 280 });
  paintBackground(bg, W, H, { x: focus.x, y: focus.y, r: 150 * stage.scale });
  const h = stage.toScreen({ x: 200, y: 300 });
  hintEl.style.left = h.x + 'px';
  hintEl.style.top = h.y + 'px';
  const c = stage.toScreen({ x: 226, y: 470 });
  cardEl.style.left = c.x + 'px';
  cardEl.style.top = c.y + 'px';
  if (finalState) placeFinal(false);
}

// ------------------------------------------------------------ horneado
function ensure(k) {
  if (k < 0 || k >= plan.length) return Promise.resolve(null);
  if (!promised[k]) {
    const gen = generation;
    promised[k] = baker.item(plan[k], stage.px).then((d) => {
      const item = stage.assemble(plan[k], d);
      // si mientras tanto se reinició, este horneado ya no sirve
      if (gen !== generation) {
        stage.release(item, true);
        return null;
      }
      prepared[k] = item;
      return item;
    });
  }
  return promised[k];
}

let finalAssets = null;
function ensureFinal() {
  if (!finalAssets) finalAssets = baker.final(stage.px).then((d) => stage.setFinalAssets(d));
  return finalAssets;
}

// Con worker se hornea por adelantado sin trabar nada. Sin worker, se
// hornea solo en momentos quietos (sin flores creciendo).
let idleTimer = 0;
function bakeAhead() {
  clearTimeout(idleTimer);
  if (baker.worker) {
    for (let k = current; k <= current + 2; k++) ensure(k);
    if (current >= plan.length - 3) ensureFinal();
    return;
  }
  idleTimer = setTimeout(() => {
    if (stage.items.some((it) => !it.done)) return bakeAhead();
    const k = [current, current + 1].find((j) => j < plan.length && !promised[j]);
    if (k != null) return ensure(k).then(bakeAhead);
    if (current >= plan.length - 1) ensureFinal();
  }, 160);
}
stage.onSettled = () => {
  bakeAhead();
  if (current >= plan.length && !finished) setTimeout(finale, reduced ? 300 : 900);
};

// ------------------------------------------------------------ pasos
function step() {
  if (finished || current >= plan.length) return;
  const now = performance.now();
  if (now < cooldownUntil) {
    if (queued < 2) {
      queued++;
      setTimeout(() => { queued--; step(); }, cooldownUntil - now + 10 + (queued - 1) * 820);
    }
    return;
  }
  const i = current++;
  cooldownUntil = now + (reduced ? 500 : 820);
  if (i === 0) {
    titleEl.classList.add('out');
    hintEl.classList.add('out');
  }
  const go = (item) => {
    stage.show(item);
    chime.step(i);
    if (navigator.vibrate && !reduced) try { navigator.vibrate(10); } catch (e) { /* nada */ }
    addVerse(steps[i].verso || '');
    bakeAhead();
  };
  if (prepared[i]) go(prepared[i]);
  else ensure(i).then((it) => it && go(it));
}

// ------------------------------------------------------------ final
function placeFinal(animate = true) {
  const f = Math.min(0.82, (app.clientHeight * 0.58) / (area.h + 30));
  const topScene = stage.toScreen({ x: 0, y: 36 }).y;
  const botScene = stage.toScreen({ x: 0, y: 612 }).y;
  const cs = getComputedStyle(probe);
  const st = parseFloat(cs.paddingTop) || 0;
  const ty = st + 10 - topScene * f;
  finalState = { f, ty };
  wrapEl.style.transition = animate ? 'transform 1.8s cubic-bezier(.22,.8,.24,1)' : 'none';
  wrapEl.style.transform = `translate3d(0, ${ty - finalEl.scrollTop}px, 0) scale(${f})`;
  app.style.setProperty('--spacer', Math.round(botScene * f + ty - 6) + 'px');
}

async function finale() {
  if (finished) return;
  finished = true;
  await ensureFinal();
  stage.startFinal();
  setTimeout(() => chime.finale(), reduced ? 200 : 1700);
  const T = reduced ? 0.35 : 1;
  setTimeout(() => cardEl.classList.add('on'), 3000 * T);
  setTimeout(() => { versesEl.style.opacity = '0'; soundEl.classList.add('hide'); }, 2400 * T);
  setTimeout(() => placeFinal(true), 3600 * T);
  setTimeout(() => {
    finalEl.classList.add('on');
    finalEl.setAttribute('aria-hidden', 'false');
    app.style.cursor = 'default';
    wrapEl.addEventListener('transitionend', () => { wrapEl.style.transition = 'none'; }, { once: true });
  }, 4300 * T);
}

function fillFinal() {
  finalEl.querySelector('.poem-title').textContent = content.titulo || '';
  const poem = finalEl.querySelector('.poem');
  poem.innerHTML = '';
  for (const s of steps) {
    const p = document.createElement('p');
    p.textContent = s.verso || '';
    if (isPlaceholder(p.textContent)) p.className = 'placeholder';
    poem.append(p);
  }
  const msg = finalEl.querySelector('.message');
  msg.textContent = content.mensajeFinal || '';
  msg.classList.toggle('placeholder', isPlaceholder(msg.textContent));
  finalEl.querySelector('.sign').textContent = `— ${content.firma || ''}`;
  cardEl.querySelector('span').textContent = `Para ${content.destinataria}`;
}

finalEl.addEventListener('scroll', () => {
  if (!finalState) return;
  wrapEl.style.transition = 'none';
  wrapEl.style.transform = `translate3d(0, ${finalState.ty - finalEl.scrollTop}px, 0) scale(${finalState.f})`;
}, { passive: true });

function restart() {
  finalEl.classList.remove('on');
  finalEl.setAttribute('aria-hidden', 'true');
  cardEl.classList.remove('on');
  setTimeout(() => {
    finalEl.scrollTop = 0;
    finalState = null;
    wrapEl.style.transition = 'transform 1.2s cubic-bezier(.22,.8,.24,1)';
    wrapEl.style.transform = '';
    versesEl.querySelectorAll('.line').forEach((l) => l.remove());
    versesEl.style.opacity = '';
    soundEl.classList.remove('hide');
    // lo horneado por adelantado que no se llegó a mostrar también se libera
    prepared.forEach((it) => { if (it && it.t0 < 0) stage.release(it, true); });
    generation++;
    stage.reset();
    prepared.length = 0;
    promised.length = 0;
    current = 0;
    finished = false;
    titleEl.classList.remove('out');
    hintEl.classList.remove('out');
    app.style.cursor = '';
    bakeAhead();
  }, 900);
}

// ------------------------------------------------------------ eventos
app.addEventListener('pointerdown', (e) => {
  if (e.target.closest('button') || finished) return;
  if (!app.classList.contains('ready')) return;
  e.preventDefault();
  step();
});
window.addEventListener('keydown', (e) => {
  if ((e.key === ' ' || e.key === 'Enter') && !finished && !e.target.closest('button')) {
    e.preventDefault();
    step();
  }
});
soundEl.addEventListener('click', () => {
  chime.setMuted(!chime.muted);
  renderSound();
});
finalEl.querySelector('.again').addEventListener('click', restart);
document.addEventListener('gesturestart', (e) => e.preventDefault());
let resizeT = 0;
window.addEventListener('resize', () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(layout, 120);
});

// ------------------------------------------------------------ arranque
async function boot() {
  await Promise.race([
    Promise.all([
      document.fonts.load('italic 500 24px "Cormorant Garamond"', 'áéíóúñ'),
      document.fonts.load('500 24px Caveat', 'áéíóúñ'),
    ]).catch(() => null),
    new Promise((r) => setTimeout(r, 2500)),
  ]);
  await loadArt();
  fillFinal();
  layout();
  if (!params.has('sinluz')) $('#light').style.backgroundImage = `url(${paintWindowLight()})`;
  else $('#light').style.display = 'none';
  cardEl.style.backgroundImage = `url(${paintCard()})`;
  app.style.setProperty('--hint-stroke', `url(${paintStroke()})`);
  stage.bakeBase();
  await ensure(0);
  requestAnimationFrame(() => {
    app.classList.add('ready');
    if (!reduced) setTimeout(() => hintEl.classList.add('beat'), 1400);
  });
  bakeAhead();

  // Parámetros de control de calidad: ?n=5 muestra 5 pasos ya abiertos,
  // ?final muestra el final.
  const n = params.has('final') ? plan.length : parseInt(params.get('n') || '0', 10);
  if (n > 0) {
    titleEl.classList.add('out');
    hintEl.classList.add('out');
    await Promise.all(plan.slice(0, n).map((_, k) => ensure(k)));
    const past = performance.now() - 60000;
    for (let i = 0; i < n; i++) {
      stage.show(prepared[i], past);
      addVerse(steps[i].verso || '');
    }
    stage.particles = [];
    current = n;
  }
  window.__stage = stage;
  // MB de bitmaps: escena + fondo + temporales vivos del hilo principal
  window.__mb = () => stage.memoryMB() + (bg.width * bg.height * 4) / 1048576 + Math.max(0, canvasMB());
  window.__baker = baker.mode;
  const waitSettle = () => (stage.items.some((it) => !it.done) ? setTimeout(waitSettle, 100) : (window.__labDone = true));
  setTimeout(waitSettle, 300);
}
boot();
