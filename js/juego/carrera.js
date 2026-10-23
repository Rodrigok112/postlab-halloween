// Carrera por el pasillo: cada toque avanza un paso. El ente empieza encerrado tras la puerta del cruce;
// cuando llevas PUERTA_M metros la revienta (soltar) y te persigue a ritmo constante. Funciones puras.
// Difícil a propósito: solo escapan los más rápidos (unos 6 toques por segundo sostenidos).

export const PASO_M = 0.38; // metros por toque
export const LARGO_M = 57; // largo por defecto: el camino izquierdo (el derecho mide 95)
export const PUERTA_M = 6; // a esta distancia del cruce el ente revienta la puerta y sale
export const VEL_ENTE = 2.35; // m/s: unos 6,2 toques por segundo
export const ATRAPA_M = 0.8;
// Si un brazo de la pared te agarra, cada toque avanza la mitad hasta que das estos toques.
export const AGARRE_TOQUES = 10;
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

export function update(c, dtS) {
  if (c.estado !== 'corriendo') return c;
  const dt = Math.max(0, Math.min(dtS, DT_MAX_S));
  if (!c.suelto) return { ...c, t: c.t + dt };
  const ente = c.ente + VEL_ENTE * dt;
  const atrapado = c.jugador - ente <= ATRAPA_M;
  return { ...c, t: c.t + dt, ente, estado: atrapado ? 'atrapado' : 'corriendo' };
}
