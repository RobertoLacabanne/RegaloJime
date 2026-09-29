export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeOutCubic = (t) => 1 - (1 - t) ** 3;
export const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
// Apertura suave con un rebote mínimo (como un pétalo que se asienta).
export const easeBloom = (t) => {
  const c1 = 1.1, c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};
export const easeOutQuint = (t) => 1 - (1 - t) ** 5;
