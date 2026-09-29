// Todo lo editable del regalo vive acá. Cambiar el poema o el orden de las
// flores no requiere tocar ningún otro archivo.
//
// Flores disponibles para "flor":
//   'helecho', 'eucalipto', 'rosa roja', 'rosa amarilla', 'gerbera',
//   'crisantemo', 'fresia', 'alstroemeria', 'paniculata'
// Funciona con 6 a 16 pasos. Sugerencia de orden: verdes, flores grandes,
// medianas y al final paniculata.

export default {
  destinataria: 'Jimena',
  firma: 'Rober',
  titulo: 'Incluso en estos días',
  pista: 'tocá',
  mensajeFinal: `No hace falta que me arregles los días.
Quería regalarte algo lindo
y recordarte que, entre tantas cosas que me pasan,
también me pasa esto:
te miro y me dan ganas de acercarme.

Con amor,`,
  pasos: [
    { flor: 'helecho', verso: 'Jime, estos días vengo durmiendo poco,' },
    { flor: 'eucalipto', verso: 'y a veces el día me queda grande.' },
    { flor: 'helecho', verso: 'Se me amontonan las preocupaciones' },
    { flor: 'rosa roja', verso: 'y me cuesta encontrar las palabras.' },
    { flor: 'gerbera', verso: 'Pero aun así, quiero que sepas:' },
    { flor: 'rosa amarilla', verso: 'si alguna vez me notás lejos,' },
    { flor: 'rosa roja', verso: 'no es que tenga menos ganas de estar con vos.' },
    { flor: 'crisantemo', verso: 'Es que a veces el cansancio' },
    { flor: 'rosa amarilla', verso: 'me deja más callado de lo que quisiera.' },
    { flor: 'fresia', verso: 'Por eso hoy te lo digo con estas flores,' },
    { flor: 'alstroemeria', verso: 'una por cada cosa que me cuesta decir:' },
    { flor: 'crisantemo', verso: 'te quiero también en mis días difíciles,' },
    { flor: 'paniculata', verso: 'aunque no siempre me salga demostrarlo.' },
  ],
};
