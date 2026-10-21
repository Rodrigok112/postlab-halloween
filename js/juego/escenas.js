// Cinemática de la habitación: claves de cámara y del ente, y acciones con tiempo, para los dos caminos.
// Común: QUIERO TU VIDA en el monitor → se apaga → 3 golpes en la puerta derecha → te levantas y miras
// → la puerta revienta → entra el ente agachado.
// final2: se inclina hasta tu cara y grita. pasillo: te das la vuelta hacia la puerta izquierda.

import { POSES } from './habitacion.js';

const SENTADO = POSES.sentado;
const PUERTA_D = POSES.puertaDerecha;
const PUERTA_I = POSES.puertaIzquierda;
const DE_PIE = POSES.dePie.pos;

const CAMARA_COMUN = [
  { t: 0, ...SENTADO },
  { t: 5.8, ...SENTADO },
  { t: 7.3, pos: DE_PIE, mira: PUERTA_D },
  { t: 8.2, pos: DE_PIE, mira: [1.7, 2.0, 0.35] },
  { t: 10.0, pos: DE_PIE, mira: [1.1, 2.1, 0.3] },
];

export const CAMARA = {
  final2: [
    ...CAMARA_COMUN,
    { t: 11.2, pos: [0, 1.6, 0.15], mira: [0.6, 1.95, 0.2] },
    { t: 12.4, pos: [-0.05, 1.55, 0.2], mira: [0.4, 2.05, 0.2] },
  ],
  pasillo: [
    ...CAMARA_COMUN,
    { t: 10.3, pos: DE_PIE, mira: [1.1, 2.1, 0.3] },
    { t: 11.1, pos: [-0.2, 1.62, 0.2], mira: PUERTA_I },
    { t: 11.8, pos: [-1.3, 1.62, 0.35], mira: [-3, 1.5, 0.35] },
  ],
};

// Ente: pos = pies, mira = hacia dónde mira (solo se usa x y z), agachado = inclinación en radianes.
const ENTE_COMUN = [
  { t: 0, pos: [3.2, 0, 0.35], mira: [0, 0, 0.35], agachado: 1.05 },
  { t: 7.6, pos: [3.2, 0, 0.35], mira: [0, 0, 0.35], agachado: 1.05 },
  { t: 9.2, pos: [1.9, 0, 0.35], mira: [0, 0, 0.35], agachado: 1.05 },
  { t: 10.0, pos: [1.5, 0, 0.3], mira: [0, 0, 0.2], agachado: 0.7 },
];

export const ENTE = {
  final2: [
    ...ENTE_COMUN,
    // La cabeza está a 1,38 m de la cadera: con 1,0 rad de inclinación queda 1,16 m por delante y a 2,05 m
    // de altura, unos 40 cm delante de tu cara y por encima.
    { t: 11.0, pos: [1.45, 0, 0.25], mira: [0, 0, 0.2], agachado: 0.8 },
    { t: 12.0, pos: [1.55, 0, 0.22], mira: [0, 0, 0.2], agachado: 1.0 },
  ],
  pasillo: [
    ...ENTE_COMUN,
    { t: 11.8, pos: [1.1, 0, 0.3], mira: [0, 0, 0.3], agachado: 0.75 },
  ],
};

export const DURACION = { final2: 12.6, pasillo: 11.8 };

// Acciones puntuales: { t, que, valor }.
const ACCIONES_COMUNES = [
  { t: 0, que: 'pantalla', valor: 'QUIERO\nTU VIDA' },
  { t: 3.0, que: 'pantalla', valor: null },
  { t: 3.5, que: 'golpe', valor: 0.5 },
  { t: 4.5, que: 'golpe', valor: 0.7 },
  { t: 5.3, que: 'golpe', valor: 0.9 },
  { t: 7.5, que: 'revienta' },
];

export const ACCIONES = {
  final2: [...ACCIONES_COMUNES, { t: 11.7, que: 'grito' }],
  pasillo: [...ACCIONES_COMUNES],
};
