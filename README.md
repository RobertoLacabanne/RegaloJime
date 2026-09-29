# Un ramo para vos

Regalo para Jimena: un cono de papel casi vacío que se llena con un ramo
pintado en acuarela, una flor por toque, mientras aparece un poema verso a
verso. Al último toque, el papel sube, se ata un moño y queda el poema
completo.

## Editar el poema

Todo lo editable está en **`src/content.js`**: destinataria, firma, título,
texto de la pista, mensaje final y la lista de pasos `{ flor, verso }`.

- Flores disponibles: `helecho`, `eucalipto`, `rosa roja`, `rosa amarilla`,
  `gerbera`, `crisantemo`, `fresia`, `alstroemeria`, `paniculata`.
- Funciona con **6 a 16 pasos**. La composición se recalcula sola para
  cualquier orden y cantidad, y cada paso intermedio queda equilibrado.
- Orden sugerido: verdes, flores grandes, medianas y al final paniculata.
- Los versos entre corchetes (`[VERSO 1 – reemplazar]`) se muestran en
  carmín para que no se escape ninguno sin reemplazar.

## Correrlo y publicarlo

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # genera dist/
npm run preview    # prueba el build
```

**Netlify:** conectá el repo (o arrastrá la carpeta `dist/` a
app.netlify.com/drop). `netlify.toml` ya define `npm run build` y `dist`.
El sitio sale con `noindex` (meta y cabecera `X-Robots-Tag`).

Parámetros útiles para revisar sin tocar todo: `?n=5` (muestra 5 pasos ya
abiertos), `?final` (va directo al final), `?calma` (versión con movimiento
reducido). `lab.html` es el laboratorio de estudios de cada flor.

## Arte propio (opcional)

Si ponés PNG con transparencia en `src/assets/petals/`, se usan en lugar del
horneado procedural, sin tocar código:

- `rosa-roja.png` reemplaza la cabeza entera (ancla en el centro; 1 px = 0,5
  unidades de escena, o sea pintado a 2x).
- `rosa-roja-petalo.png` reemplaza cada pétalo de esa flor (ancla en el
  centro del borde inferior; se escala al largo del pétalo horneado).

## Cómo está hecho

- **Pintar una vez, animar sprites.** Cada pétalo se hornea a bitmap con
  Canvas 2D usando el pincel de Tyler Hobbs (polígono con deformación
  gaussiana recursiva y 30–60 capas translúcidas intercaladas), con borde
  oscurecido, granulación en el mismo grano de papel del fondo, luces que
  son papel reservado y sombras de color. Después solo se anima transform y
  opacidad.
- **Horneado en un Web Worker** con OffscreenCanvas: la flor siguiente se
  pinta mientras ella lee, sin trabar la animación. Si el navegador no lo
  soporta, se hornea en el hilo principal en momentos quietos.
- Cada flor terminada se **aplana** a un solo bitmap (horneado de antemano
  en el worker) y se liberan sus pétalos.
- **Dirty flag:** si nada se mueve, no se redibuja. El balanceo permanente es
  de subpíxel y se dibuja a 20 fps; las floraciones, a 60.
- Sin filtros SVG, sin blur ni sombras CSS animadas. Tipografías servidas
  desde el propio sitio (Cormorant Garamond itálica y Caveat), sin llamadas
  externas.

## Memoria (estimación medida)

Bitmaps vivos con el ramo completo de 13 pasos en un teléfono de 390×844 a
DPR 2 (tope de horneado 2x), incluyendo el envoltorio final: **≈ 28 MB**
(medido con `stage.memoryMB()`), de los cuales ~5 MB son el canvas de la
escena y ~5 MB el fondo. Durante una floración se suman los pétalos sueltos
de esa flor (unos pocos MB) hasta que se aplana y se liberan.

Referencia: Safari en iOS tiene un tope de memoria total de canvas
(reportado en 224 MB en iOS 12 y 384 MB en iOS 15; no encontré el valor
oficial actual) y un área máxima por canvas de 16.777.216 px. Este proyecto
queda muy por debajo: ningún canvas pasa de 1.000×1.800 px, los temporales
se reducen a 1×1 al terminar y los del worker se transfieren como
ImageBitmap y se cierran al liberarse.

## Rendimiento (medido)

Chromium headless **sin GPU** (raster por software, peor caso), 390×844 a
DPR 2:

| Momento | Sin estrangular | CPU 4x |
|---|---|---|
| Floración de verdes y gerbera | 60 fps | 37–42 fps |
| Floración de una rosa (≈30 pétalos a la vez) | 60 fps | ~26 fps |
| Reposo (solo balanceo, dibujado a 20 fps) | 60 fps | ~48 fps |

El JavaScript de cada frame es < 1 ms (máx. ~6 ms); lo que falta hasta 60 con
4x es el raster por software del navegador de prueba. Antes de mover el
horneado al worker, los pasos 3–4 caían a 5–11 fps con 4x.

En un teléfono real Canvas 2D va por GPU y estos números son pesimistas;
conviene probarlo en el iPhone de destino antes de mandarlo.
