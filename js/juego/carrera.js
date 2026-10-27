// Carrera por el pasillo: cada toque avanza un paso. El ente empieza encerrado tras la puerta del cruce;
// cuando llevas PUERTA_M metros la revienta (soltar) y te persigue a ritmo constante. Funciones puras.
// Extremadamente difícil a propósito (28/10): con una mano no se puede; con dos pulgares hay que ir casi al
// máximo (unos 10 toques por segundo de media), porque el ente acelera según avanzas y, si aflojas, te pilla al
// final del recorrido.

export const PASO_M = 0.38; // metros por toque
export const LARGO_M = 76; // largo por defecto: el camino izquierdo (el derecho mide 95)
export const PUERTA_M = 6; // a esta distancia del cruce el ente revienta la puerta y sale
export const VEL_ENTE = 3.6; // m/s al salir: unos 9,5 toques por segundo
export const VEL_ENTE_FINAL = 4.4; // m/s al final del recorrido: unos 11,6 toques por segundo
export const ATRAPA_M = 0.8;
// Si un brazo de la pared te agarra, cada toque avanza la mitad hasta que das estos toques.
export const AGARRE_TOQUES = 22;
// Un fotograma nunca avanza más que esto: si la pestaña se congela, el ente no aparece encima de golpe.
export const DT_MAX_S = 0.1;

export function createCarrera(largo = LARGO_M) {
  return { jugador: 0, ente: 0, suelto: false, toques: 0, t: 0, estado: 'corriendo', largo, agarre: 0 };
}

// Un brazo de la pared te agarra.
export function agarrar(c) {
  return { ...c, agarre: AGARRE_TOQUES };
}

// El ente sale por la puerta reventada, en la posición enPos del recorrido.
export function soltar(c, enPos) {
  return { ...c, suelto: true, ente: enPos };
}

export function distancia(c) {
  return c.suelto ? c.jugador - c.ente : Infinity;
}

export function tap(c) {
  if (c.estado !== 'corriendo') return c;
  const paso = c.agarre > 0 ? PASO_M / 2 : PASO_M;
  const jugador = Math.min(c.jugador + paso, c.largo);
  return {
    ...c, jugador, toques: c.toques + 1, agarre: Math.max(0, c.agarre - 1),
    estado: jugador >= c.largo ? 'escapado' : 'corriendo',
  };
}

// Lo rápido que va el ente: acelera según avanzas por el recorrido.
export function velEnte(c) {
  return VEL_ENTE + (VEL_ENTE_FINAL - VEL_ENTE) * Math.min(1, Math.max(0, c.jugador / c.largo));
}

export function update(c, dtS) {
  if (c.estado !== 'corriendo') return c;
  const dt = Math.max(0, Math.min(dtS, DT_MAX_S));
  if (!c.suelto) return { ...c, t: c.t + dt };
  const ente = c.ente + velEnte(c) * dt;
  const atrapado = c.jugador - ente <= ATRAPA_M;
  return { ...c, t: c.t + dt, ente, estado: atrapado ? 'atrapado' : 'corriendo' };
}
