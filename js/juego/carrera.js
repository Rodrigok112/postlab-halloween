// Carrera por el pasillo: cada toque avanza un paso; el ente avanza a ritmo constante detrás.
// Funciones puras. Las constantes se ajustan tras probar en móvil (objetivo: gana entre 1/3 y la mitad).

export const PASO_M = 0.38; // metros por toque
export const LARGO_M = 57; // largo por defecto: el camino izquierdo (el derecho mide 95)
export const VENTAJA_M = 4; // distancia inicial al ente
export const RETRASO_S = 0.8; // el ente tarda en arrancar
export const VEL_ENTE = 4 * PASO_M; // m/s: te alcanza si bajas de unos 4 toques por segundo
export const ATRAPA_M = 0.8;
// Un fotograma nunca avanza más que esto: si la pestaña se congela, el ente no aparece encima de golpe.
export const DT_MAX_S = 0.1;

export function createCarrera(largo = LARGO_M) {
  return { jugador: 0, ente: -VENTAJA_M, toques: 0, t: 0, estado: 'corriendo', largo };
}

export function distancia(c) {
  return c.jugador - c.ente;
}

export function tap(c) {
  if (c.estado !== 'corriendo') return c;
  const jugador = Math.min(c.jugador + PASO_M, c.largo);
  return { ...c, jugador, toques: c.toques + 1, estado: jugador >= c.largo ? 'escapado' : 'corriendo' };
}

export function update(c, dtS) {
  if (c.estado !== 'corriendo') return c;
  const dt = Math.max(0, Math.min(dtS, DT_MAX_S));
  const t = c.t + dt;
  const activo = Math.max(0, Math.min(dt, t - RETRASO_S));
  const ente = c.ente + VEL_ENTE * activo;
  const atrapado = c.jugador - ente <= ATRAPA_M;
  return { ...c, t, ente, estado: atrapado ? 'atrapado' : 'corriendo' };
}
