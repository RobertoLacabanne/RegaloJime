// Slot para arte propio: si existen PNG con transparencia en
// src/assets/petals/, se usan en lugar del horneado procedural.
//
//   <flor>.png          reemplaza la cabeza entera (p. ej. "rosa roja.png"
//                       o "rosa-roja.png"). Ancla: centro de la imagen.
//   <flor>-petalo.png   reemplaza cada pétalo de esa flor. Ancla: base
//                       (centro del borde inferior). Se estira al tamaño
//                       del pétalo horneado.
// El tamaño de referencia es 1 px de PNG = 0,5 unidades de escena (arte a 2x).
const files = import.meta.glob('../assets/petals/*.png', { eager: true, query: '?url', import: 'default' });

const images = new Map();

function keyOf(path) {
  const name = path.split('/').pop().replace(/\.png$/i, '');
  return name.toLowerCase().replace(/[-_]+/g, ' ').trim();
}

export async function loadArt() {
  const jobs = Object.entries(files).map(async ([path, url]) => {
    const img = new Image();
    img.src = url;
    try {
      await img.decode();
      images.set(keyOf(path), img);
    } catch (e) {
      console.warn('No pude cargar', path, e);
    }
  });
  await Promise.all(jobs);
  return images.size;
}

export function artFor(flor) {
  return images.get(flor) || null;
}

export function petalArtFor(flor) {
  return images.get(`${flor} petalo`) || images.get(`${flor} pétalo`) || null;
}

export function hasArt(flor) {
  return !!(artFor(flor) || petalArtFor(flor));
}

// Aplica el arte propio a una cabeza ya horneada (si hay).
export function applyArt(flor, head) {
  const whole = artFor(flor);
  if (whole) {
    const s = 2;
    return {
      ...head,
      parts: [{
        img: { canvas: whole, ax: whole.naturalWidth / 2, ay: whole.naturalHeight / 2, s },
        closed: null, x: 0, y: 0, rot: 0, sx: 1, sy: 1, x0: 0, y0: 0, rot0: 0, sx0: 0.2, sy0: 0.2,
        delay: 0, dur: 1, a0: 0, revealR: 0, ease: head.parts[0]?.ease,
      }],
    };
  }
  const pet = petalArtFor(flor);
  if (pet) {
    for (const p of head.parts) {
      if (p.revealR || !p.img.petal) continue;
      const o = p.img;
      const s = pet.naturalHeight / (o.petal.L / o.s);
      p.img = { canvas: pet, ax: pet.naturalWidth / 2, ay: pet.naturalHeight, s };
      p.closed = null;
    }
  }
  return head;
}
