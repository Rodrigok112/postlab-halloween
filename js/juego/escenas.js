// Cinemática de la habitación (5 × 3,3 m): claves de cámara y del ente, y acciones con tiempo, para los dos caminos.
// Común: QUIERO TU VIDA en el monitor → se apaga → silencio largo → un golpe fuerte → la cámara gira hacia
// la puerta derecha, que tiene un boquete negro, y mientras giras entra despacio una mano por el boquete
// → aparecen los ojos rojos, parpadean → «ahí estás, {nombre}».
// final2: la puerta revienta, entra el ente agachado y te grita en la cara.
// pasillo: te levantas, corres a la puerta izquierda, la cruzas y miras a los dos lados del cruce.

const SENTADO = { pos: [0, 1.15, 0.02], mira: [0, 1.08, -1.15] };
const BOQUETE = [2.5, 1.51, 0.35];
const SENTADO_GIRADO = { pos: [0.05, 1.17, 0.05], mira: [2.5, 1.45, 0.35] };
const CRUCE = [-3.3, 1.6, 0.35];

const CAMARA_COMUN = [
  { t: 0, ...SENTADO },
  { t: 7.25, ...SENTADO },
  { t: 8.4, ...SENTADO_GIRADO },
  // Se acerca un poco, sin querer, al boquete.
  { t: 13.4, pos: [0.2, 1.18, 0.08], mira: BOQUETE },
];

export const CAMARA = {
  final2: [
    ...CAMARA_COMUN,
    { t: 14.3, pos: [0.2, 1.18, 0.08], mira: [2.4, 1.6, 0.32] },
    { t: 15.6, pos: [0.12, 1.17, 0.08], mira: [1.6, 1.7, 0.25] },
    { t: 16.8, pos: [0.05, 1.15, 0.06], mira: [0.5, 1.4, 0.1] },
  ],
  pasillo: [
    ...CAMARA_COMUN,
    { t: 14.1, pos: [-0.3, 1.6, 0.25], mira: [-2.5, 1.45, 0.35] },
    { t: 15.0, pos: [-1.9, 1.6, 0.35], mira: [-4.1, 1.5, 0.35] },
    { t: 15.7, pos: CRUCE, mira: [-4.5, 1.55, 0.35] },
    // Mira a la izquierda (+z) y a la derecha (−z) y vuelve al frente.
    { t: 16.5, pos: CRUCE, mira: [-3.3, 1.55, 3] },
    { t: 17.4, pos: CRUCE, mira: [-3.3, 1.55, -2.3] },
    { t: 18.0, pos: CRUCE, mira: [-4.5, 1.55, 0.35] },
  ],
};

// Ente: pos = pies, mira = hacia dónde mira (solo se usa x y z), agachado = inclinación en radianes.
// Detrás de la puerta derecha, inclinado para que los ojos queden justo detrás del boquete
// (ASOMADO_LEJOS: metros que los ojos quedan por delante de los pies con esa inclinación).
const ASOMADO_LEJOS = 1.19;
const ASOMADO = { pos: [2.62 + ASOMADO_LEJOS, 0, 0.35], mira: [0, 0, 0.35], agachado: 1.42 };
const ENTE_COMUN = [
  { t: 0, ...ASOMADO },
  { t: 13.4, ...ASOMADO },
];

export const ENTE = {
  final2: [
    ...ENTE_COMUN,
    { t: 14.2, ...ASOMADO },
    { t: 15.1, pos: [2.8, 0, 0.35], mira: [0, 0, 0.3], agachado: 1.0 },
    { t: 15.9, pos: [2.2, 0, 0.25], mira: [0, 0, 0.1], agachado: 1.2 },
    // Se dobla hasta tu cara: los ojos quedan a unos 45 cm de ti, algo por encima.
    { t: 16.6, pos: [1.7, 0, 0.12], mira: [0, 0, 0.08], agachado: 1.5 },
  ],
  pasillo: [...ENTE_COMUN],
};

export const DURACION = { final2: 17.6, pasillo: 18.1 };

// La mano: entra despacio por el boquete (posición de la muñeca, x) y se agarra al borde.
export const MANO = { fuera: 3.1, dentro: 2.0, entraDesde: 7.4, entraHasta: 9.6 };

// Acciones puntuales: { t, que, valor }.
const ACCIONES_COMUNES = [
  { t: 0, que: 'pantalla', valor: 'QUIERO\nTU VIDA' },
  { t: 3.0, que: 'pantalla', valor: null },
  { t: 7.0, que: 'boquete' },
  { t: MANO.entraDesde, que: 'mano' },
  { t: 9.8, que: 'ojos' },
  { t: 10.6, que: 'parpadeo' },
  { t: 11.1, que: 'dialogo' },
  { t: 13.4, que: 'callar' },
];

export const ACCIONES = {
  final2: [
    ...ACCIONES_COMUNES,
    { t: 14.0, que: 'revienta' },
    { t: 16.3, que: 'boca' },
    { t: 16.5, que: 'grito' },
  ],
  pasillo: [
    ...ACCIONES_COMUNES,
    // La puerta izquierda se abre antes de girarte, para que la hoja no te tape el plano al abrirse.
    { t: 13.45, que: 'abrePuerta' },
    { t: 13.5, que: 'manoFuera' },
    { t: 13.8, que: 'paso' },
    { t: 14.15, que: 'paso' },
    { t: 14.5, que: 'paso' },
    { t: 14.85, que: 'paso' },
    { t: 15.2, que: 'paso' },
    { t: 15.55, que: 'paso' },
  ],
};
