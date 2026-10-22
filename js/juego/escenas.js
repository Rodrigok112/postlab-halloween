// Cinemática de la habitación (5 × 3,3 m): claves de cámara, zoom y ente, y acciones con tiempo.
// Común (como en la referencia del 22/10): QUIERO TU VIDA en el monitor → se apaga → silencio largo → un
// golpe fuerte → la cámara gira hacia la puerta derecha, que tiene un boquete negro, y se acerca despacio
// (zoom) → en el boquete, los dos ojos rojos, que parpadean, y «ahí estás, {nombre}» → entra una mano y se
// agarra al borde → la puerta estalla en pedazos y el ente queda de pie en el marco, con mucho glitch.
// final2: se te acerca y te grita en la cara.
// pasillo: te levantas, corres a la puerta izquierda, la cruzas y miras a los dos lados del cruce.

const SENTADO = { pos: [0, 1.15, 0.02], mira: [0, 1.08, -1.15] };
const PUERTA = [2.5, 1.45, 0.35];
const SENTADO_GIRADO = { pos: [0.05, 1.17, 0.05], mira: PUERTA };
const CARA_EN_MARCO = [1.9, 1.9, 0.35];
const CRUCE = [-3.3, 1.6, 0.35];
const ESTALLA = 14.2;

const CAMARA_COMUN = [
  { t: 0, ...SENTADO },
  { t: 7.25, ...SENTADO },
  { t: 8.4, ...SENTADO_GIRADO },
  { t: ESTALLA, ...SENTADO_GIRADO },
  { t: ESTALLA + 0.4, pos: SENTADO_GIRADO.pos, mira: CARA_EN_MARCO },
];

export const CAMARA = {
  final2: [
    ...CAMARA_COMUN,
    { t: 16.2, pos: SENTADO_GIRADO.pos, mira: CARA_EN_MARCO },
    { t: 17.0, pos: [0.1, 1.17, 0.08], mira: [1.6, 1.7, 0.25] },
    { t: 17.8, pos: [0.05, 1.15, 0.06], mira: [0.5, 1.5, 0.1] },
  ],
  pasillo: [
    ...CAMARA_COMUN,
    { t: 15.6, pos: SENTADO_GIRADO.pos, mira: CARA_EN_MARCO },
    { t: 16.3, pos: [-0.3, 1.6, 0.25], mira: [-2.5, 1.45, 0.35] },
    { t: 17.2, pos: [-1.9, 1.6, 0.35], mira: [-4.1, 1.5, 0.35] },
    { t: 17.9, pos: CRUCE, mira: [-4.5, 1.55, 0.35] },
    // Mira a la izquierda (+z) y a la derecha (−z) y vuelve al frente.
    { t: 18.7, pos: CRUCE, mira: [-3.3, 1.55, 3] },
    { t: 19.6, pos: CRUCE, mira: [-3.3, 1.55, -2.3] },
    { t: 20.2, pos: CRUCE, mira: [-4.5, 1.55, 0.35] },
  ],
};

// Zoom (campo de visión vertical, grados): se cierra despacio sobre la puerta y se abre de golpe al estallar.
export const ZOOM = [
  { t: 0, v: 68 },
  { t: 8.4, v: 68 },
  { t: ESTALLA - 0.05, v: 40 },
  { t: ESTALLA, v: 60 },
  { t: 16.4, v: 68 },
];

// Ente: pos = pies, mira = hacia dónde mira (solo se usa x y z), agachado = inclinación en radianes.
// Asomado: detrás de la puerta, inclinado para que los ojos queden justo detrás del boquete
// (ASOMADO_LEJOS: metros que los ojos quedan por delante de los pies con esa inclinación).
const ASOMADO_LEJOS = 1.27;
const ASOMADO = { pos: [2.62 + ASOMADO_LEJOS, 0, 0.35], mira: [0, 0, 0.35], agachado: 1.52 };
// En el marco, tras estallar la puerta: encorvado bajo el dintel, con la cabeza ya dentro.
const EN_MARCO = { pos: [2.95, 0, 0.35], mira: [0, 0, 0.35], agachado: 1.0 };

export const ENTE = {
  final2: [
    { t: 0, ...ASOMADO },
    { t: ESTALLA, ...ASOMADO },
    { t: ESTALLA, ...EN_MARCO },
    { t: 16.2, ...EN_MARCO },
    { t: 17.0, pos: [2.3, 0, 0.25], mira: [0, 0, 0.1], agachado: 1.2 },
    // Se dobla hasta tu cara: los ojos quedan a unos 45 cm de ti, algo por encima.
    { t: 17.7, pos: [1.7, 0, 0.12], mira: [0, 0, 0.08], agachado: 1.5 },
  ],
  pasillo: [
    { t: 0, ...ASOMADO },
    { t: ESTALLA, ...ASOMADO },
    { t: ESTALLA, ...EN_MARCO },
    { t: 16.3, ...EN_MARCO },
    // Mientras huyes, entra detrás de ti.
    { t: 18.5, pos: [1.6, 0, 0.3], mira: [-2.5, 0, 0.35], agachado: 0.7 },
  ],
};

export const DURACION = { final2: 18.6, pasillo: 20.3 };

// Tras estallar, el ente entra con muchos más fotogramas rotos durante este tiempo.
export const ENTRADA_GLITCH_S = 2.0;

// La mano: entra despacio por el boquete (posición de la muñeca, x) y se agarra al borde.
export const MANO = { fuera: 3.1, dentro: 2.0, entraDesde: 12.0, entraHasta: 13.6 };

// Acciones puntuales: { t, que, valor }.
const ACCIONES_COMUNES = [
  { t: 0, que: 'pantalla', valor: 'QUIERO\nTU VIDA' },
  { t: 3.0, que: 'pantalla', valor: null },
  { t: 7.0, que: 'boquete' },
  { t: 9.0, que: 'ojos' },
  { t: 9.8, que: 'parpadeo' },
  { t: 10.3, que: 'dialogo' },
  { t: 12.0, que: 'callar' },
  { t: MANO.entraDesde, que: 'mano' },
  { t: ESTALLA, que: 'explota' },
];

export const ACCIONES = {
  final2: [
    ...ACCIONES_COMUNES,
    { t: 17.4, que: 'boca' },
    { t: 17.6, que: 'grito' },
  ],
  pasillo: [
    ...ACCIONES_COMUNES,
    // La puerta izquierda se abre antes de girarte, para que la hoja no te tape el plano al abrirse.
    { t: 15.5, que: 'abrePuerta' },
    { t: 16.0, que: 'paso' },
    { t: 16.35, que: 'paso' },
    { t: 16.7, que: 'paso' },
    { t: 17.05, que: 'paso' },
    { t: 17.4, que: 'paso' },
    { t: 17.75, que: 'paso' },
  ],
};
