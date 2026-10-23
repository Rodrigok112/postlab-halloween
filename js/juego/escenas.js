// Cinemática de la habitación (7 × 3,3 m; puerta del ente en x = +3,5, salida al pasillo en x = −3,5).
// Común: QUIERO TU VIDA en el monitor → se apaga → silencio → mirando aún la pantalla se oye romperse la
// puerta → giras a la derecha: hay un boquete y una mano sacada → la mano se mete → se abren dos ojos rojos
// → «ahí estás, {nombre}» → la puerta estalla → un segundo sin nada → el ente sale despacio, de forma
// dramática y nada humana, con glitch, y suena un grave «te encontré» (sin grito).
// final2: una pausa y se lanza rápido a la cámara: susto y grito.
// pasillo: corres a la puerta izquierda oyendo sus pasos, la cruzas, te giras y la cierras; golpes contra la
// puerta mientras miras a los dos lados del cruce.

const SENTADO = { pos: [0, 1.15, 0.02], mira: [0, 1.08, -1.15] };
const PUERTA_D = [3.5, 1.45, 0.35];
const SENTADO_GIRADO = { pos: [0.05, 1.17, 0.05], mira: PUERTA_D };
const CARA_EN_MARCO = [2.65, 2.25, 0.35];
const CRUCE = [-4.3, 1.6, 0.35];
const ESTALLA = 13.6;
const SALE = 14.6;
const LANZA = 18.8;

const CAMARA_COMUN = [
  { t: 0, ...SENTADO },
  { t: 6.8, ...SENTADO },
  { t: 8.0, ...SENTADO_GIRADO },
  { t: SALE, ...SENTADO_GIRADO },
  { t: 16.4, pos: SENTADO_GIRADO.pos, mira: CARA_EN_MARCO },
];

export const CAMARA = {
  final2: [
    ...CAMARA_COMUN,
    { t: LANZA, pos: SENTADO_GIRADO.pos, mira: CARA_EN_MARCO },
    { t: LANZA + 0.35, pos: [0.05, 1.15, 0.06], mira: [0.5, 1.5, 0.1] },
  ],
  pasillo: [
    ...CAMARA_COMUN,
    { t: 18.2, pos: SENTADO_GIRADO.pos, mira: CARA_EN_MARCO },
    // Se levanta y se gira hacia la puerta izquierda pasando por el escritorio (los giros de 180° llevan una
    // clave en medio para que vayan por el lado que toca).
    { t: 18.55, pos: [-0.15, 1.45, 0.15], mira: [-0.6, 1.4, -1.5] },
    { t: 18.9, pos: [-0.3, 1.6, 0.25], mira: [-3.5, 1.45, 0.35] },
    { t: 20.3, pos: [-2.9, 1.6, 0.35], mira: [-5.1, 1.5, 0.35] },
    { t: 20.8, pos: CRUCE, mira: [-5.8, 1.55, 0.35] },
    // Se gira hacia la habitación (por la derecha) y cierra la puerta, con el ente viniendo al fondo.
    { t: 21.05, pos: CRUCE, mira: [-4.3, 1.55, -1.2] },
    { t: 21.3, pos: CRUCE, mira: [-2.0, 1.5, 0.35] },
    { t: 21.9, pos: CRUCE, mira: [-2.0, 1.5, 0.35] },
    // Vuelve al frente (la pared del CORRE) por el mismo lado.
    { t: 22.15, pos: CRUCE, mira: [-4.3, 1.55, -1.2] },
    { t: 22.4, pos: CRUCE, mira: [-5.8, 1.55, 0.35] },
    // Mira a la izquierda (+z), vuelve al frente, mira a la derecha (−z) y vuelve al frente: nunca a la puerta.
    { t: 23.0, pos: CRUCE, mira: [-4.3, 1.55, 2.4] },
    { t: 23.4, pos: CRUCE, mira: [-5.8, 1.55, 0.35] },
    { t: 24.0, pos: CRUCE, mira: [-4.3, 1.55, -1.7] },
    { t: 24.3, pos: CRUCE, mira: [-5.8, 1.55, 0.35] },
  ],
};

// Zoom (campo de visión vertical, grados): se cierra despacio sobre la puerta y se abre al estallar.
export const ZOOM = [
  { t: 0, v: 68 },
  { t: 8.0, v: 68 },
  { t: ESTALLA - 0.05, v: 44 },
  // Sale cerrado sobre el marco, para que se vea bien; luego se abre.
  { t: ESTALLA, v: 50 },
  { t: 17.5, v: 50 },
  { t: LANZA, v: 68 },
];

// Ente: pos = pies, mira = hacia dónde mira (solo x y z), agachado = inclinación (rad),
// abre = brazos abiertos agarrando el marco (0 a 1).
// Asomado: detrás de la puerta, inclinado para que los ojos queden justo detrás del boquete
// (ASOMADO_LEJOS: metros que los ojos quedan por delante de los pies con esa inclinación).
const ASOMADO_LEJOS = 1.46;
const ASOMADO = { pos: [3.62 + ASOMADO_LEJOS, 0, 0.35], mira: [0, 0, 0.35], agachado: 1.73, abre: 0 };
// Salida: primero los brazos, que se abren y agarran el marco; el cuerpo detrás, a tirones; al final, en el
// marco, encorvado bajo el dintel con la cabeza ya dentro.
const SALIDA = [
  { t: SALE, pos: [ASOMADO.pos[0] + 0.3, 0, 0.35], mira: [0, 0, 0.35], agachado: 1.5, abre: 0 },
  { t: 15.8, pos: [4.5, 0, 0.35], mira: [0, 0, 0.5], agachado: 1.15, abre: 1 },
  { t: 17.0, pos: [4.1, 0, 0.3], mira: [0, 0, 0.1], agachado: 1.05, abre: 0.7 },
  { t: 18.0, pos: [3.85, 0, 0.35], mira: [0, 0, 0.35], agachado: 0.95, abre: 0.2 },
];

export const ENTE = {
  final2: [
    { t: 0, ...ASOMADO },
    ...SALIDA,
    // Se lanza: en un tercio de segundo, de la puerta a tu cara.
    // Con 1,75 rad los ojos quedan a 1,49 m y 1,46 m por delante: a unos 40 cm de tu cara.
    { t: LANZA + 0.35, pos: [1.85, 0, 0.12], mira: [0, 0, 0.08], agachado: 1.75, abre: 0 },
  ],
  pasillo: [
    { t: 0, ...ASOMADO },
    ...SALIDA,
    // Te sigue mientras huyes: lo ves venir al cerrar la puerta.
    { t: 21.3, pos: [-0.2, 0, 0.35], mira: [-3.5, 0, 0.35], agachado: 0.95, abre: 0.3 },
  ],
};

export const DURACION = { final2: 19.9, pasillo: 24.3 };

// Al salir, el ente tiene muchos más fotogramas rotos durante este tiempo.
export const ENTRADA_GLITCH_S = 3.0;

// La mano: ya está fuera del boquete cuando giras (dentro de la habitación) y se retira despacio.
// x = posición de la muñeca.
export const MANO = { fuera: 4.1, dentro: 3.0, saleDesde: 9.0, saleHasta: 10.2 };

// Acciones puntuales: { t, que, valor }.
const ACCIONES_COMUNES = [
  { t: 0, que: 'pantalla', valor: 'QUIERO\nTU VIDA' },
  { t: 3.0, que: 'pantalla', valor: null },
  { t: 6.0, que: 'rompe' },
  { t: 10.6, que: 'ojos' },
  { t: 11.3, que: 'dialogo' },
  { t: 13.0, que: 'callar' },
  { t: ESTALLA, que: 'explota' },
  { t: SALE, que: 'sale' },
  { t: 15.2, que: 'encontrado' },
];

export const ACCIONES = {
  final2: [
    ...ACCIONES_COMUNES,
    { t: LANZA, que: 'lanza' },
    { t: LANZA + 0.15, que: 'grito' },
  ],
  pasillo: [
    ...ACCIONES_COMUNES,
    // La puerta izquierda se abre antes de girarte, para que la hoja no te tape el plano al abrirse.
    { t: 17.9, que: 'abrePuerta' },
    { t: 18.4, que: 'pasoEnte' },
    { t: 18.95, que: 'paso' },
    { t: 19.0, que: 'pasoEnte' },
    { t: 19.3, que: 'paso' },
    { t: 19.6, que: 'pasoEnte' },
    { t: 19.65, que: 'paso' },
    { t: 20.0, que: 'paso' },
    { t: 20.2, que: 'pasoEnte' },
    { t: 20.35, que: 'paso' },
    { t: 20.7, que: 'paso' },
    { t: 20.8, que: 'pasoEnte' },
    { t: 21.3, que: 'cierra' },
    { t: 21.9, que: 'golpes' },
  ],
};
