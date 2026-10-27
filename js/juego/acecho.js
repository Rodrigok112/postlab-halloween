// El segundo monstruo (la masa: varias IA fundidas): al fondo del pasillo que sigue recto tras su esquina
// solo se ve una luz roja; cuando te faltan antesM metros para la esquina, sale corriendo a toda prisa. Si
// giras antes de que llegue, se esfuma; si no, te atrapa. Funciones puras.
// pos = metros que le faltan para llegar a la esquina (por el pasillo que sigue recto).

export const ACECHO = {
  antesM: 2.5, // sale cuando te faltan estos metros para su esquina
  distanciaM: 38, // empieza a esta distancia de la esquina, donde está la luz roja
  vel: 67, // m/s: llega en algo más de medio segundo; solo escapas yendo casi al máximo (unos 13 toques por segundo)
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
    return jugador >= a.esquina - ACECHO.antesM ? { ...a, estado: 'corre', pos: ACECHO.distanciaM } : a;
  }
  if (a.estado !== 'corre' && a.estado !== 'esquivado') return a;
  const pos = a.pos - ACECHO.vel * dt;
  if (a.estado === 'esquivado') return { ...a, pos, estado: pos <= 0 ? 'fuera' : 'esquivado' };
  if (jugador >= a.esquina + ACECHO.giradoM) return { ...a, pos, estado: pos <= 0 ? 'fuera' : 'esquivado' };
  const hueco = (a.esquina - jugador) + pos;
  return { ...a, pos, estado: hueco <= ACECHO.atrapaM ? 'atrapa' : 'corre' };
}
