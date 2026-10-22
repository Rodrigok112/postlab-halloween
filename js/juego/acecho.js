// El segundo monstruo: al final del primer tramo el pasillo sigue recto y desde el fondo viene corriendo.
// Si giras en la esquina antes de que llegue, se esfuma; si no, te atrapa. Funciones puras.
// pos = metros que le faltan para llegar a la esquina (por el pasillo que sigue recto).

export const ACECHO = {
  apareceM: 7, // sale cuando el jugador lleva estos metros
  distanciaM: 37, // empieza a esta distancia de la esquina (fuera de la niebla: primero se oye)
  vel: 6.5, // m/s: muy rápida, pero con margen: escapas por encima de unos 3,5 toques por segundo
  atrapaM: 0.8,
  giradoM: 0.3, // pasada la esquina por esto, ya has girado
};
const DT_MAX_S = 0.1;

export function crearAcecho(esquina) {
  return { esquina, estado: 'espera', pos: null };
}

export function actualizarAcecho(a, jugador, dtS) {
  const dt = Math.max(0, Math.min(dtS, DT_MAX_S));
  if (a.estado === 'espera') {
    return jugador >= ACECHO.apareceM ? { ...a, estado: 'corre', pos: ACECHO.distanciaM } : a;
  }
  if (a.estado !== 'corre' && a.estado !== 'esquivado') return a;
  const pos = a.pos - ACECHO.vel * dt;
  if (a.estado === 'esquivado') return { ...a, pos, estado: pos <= 0 ? 'fuera' : 'esquivado' };
  if (jugador >= a.esquina + ACECHO.giradoM) return { ...a, pos, estado: pos <= 0 ? 'fuera' : 'esquivado' };
  const hueco = (a.esquina - jugador) + pos;
  return { ...a, pos, estado: hueco <= ACECHO.atrapaM ? 'atrapa' : 'corre' };
}
