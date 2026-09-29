// Generador determinista (mulberry32) con utilidades de azar "pictórico".
export function makeRng(seed) {
  let s = (typeof seed === 'string' ? hashStr(seed) : seed) >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let spare = null;
  const gauss = (mu = 0, sd = 1) => {
    if (spare !== null) { const v = spare; spare = null; return mu + sd * v; }
    let u = 0, v = 0;
    while (u === 0) u = next();
    v = next();
    const m = Math.sqrt(-2 * Math.log(u));
    spare = m * Math.sin(2 * Math.PI * v);
    return mu + sd * m * Math.cos(2 * Math.PI * v);
  };
  return {
    next,
    gauss,
    range: (a, b) => a + (b - a) * next(),
    int: (a, b) => Math.floor(a + (b - a + 1) * next()),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    fork: (tag = '') => makeRng((Math.floor(next() * 4294967296) ^ hashStr(String(tag))) >>> 0),
  };
}

export function hashStr(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
