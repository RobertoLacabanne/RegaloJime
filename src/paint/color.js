// Color en HSL para poder "derivar" el matiz entre capas de glaseado.
export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

export function hsl(hex) {
  return rgbToHsl(hexToRgb(hex));
}

export function hslStr({ h, s, l }, a = 1) {
  return `hsla(${h.toFixed(1)},${Math.max(0, Math.min(100, s)).toFixed(1)}%,${Math.max(0, Math.min(100, l)).toFixed(1)}%,${a})`;
}

// Devuelve un color HSL desplazado (dh en grados, ds y dl en puntos).
export function shift(c, dh = 0, ds = 0, dl = 0) {
  const col = typeof c === 'string' ? hsl(c) : c;
  return { h: (col.h + dh + 360) % 360, s: col.s + ds, l: col.l + dl };
}

export function mix(a, b, t) {
  const A = typeof a === 'string' ? hsl(a) : a;
  const B = typeof b === 'string' ? hsl(b) : b;
  let dh = B.h - A.h;
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  return { h: (A.h + dh * t + 360) % 360, s: A.s + (B.s - A.s) * t, l: A.l + (B.l - A.l) * t };
}

export const PALETTE = {
  cream: '#FBF3E4',
  butter: '#F6D86B',
  yellow: '#F2B705',
  freesia: '#F08A24',
  peach: '#F3C89A',
  carmine: '#A3122B',
  sage: '#7A8F6A',
  fern: '#3F5B3A',
  kraft: '#C9A57B',
  // Sombras con color: nunca negro ni gris.
  shadowViolet: '#4A2A4F',
  shadowSienna: '#7A3E1F',
  deepCarmine: '#5E0A22',
  eucalyptus: '#8FA6A0',
  ink: '#3B2A2E',
};
