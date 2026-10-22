// Recorridos del pasillo: salen del cruce que hay tras la puerta izquierda de la habitación.
// Izquierda: corto (57 m, unos 30 s). Derecha: largo y con más curvas (95 m, unos 50 s). Funciones puras.
// rumbo = giro de cámara alrededor de y (convención de Three.js): mira hacia (-sin r, 0, -cos r).
// giro en grados: + a la derecha, − a la izquierda, respecto al tramo anterior.
// Tras la primera esquina el pasillo sigue recto (sigueRecto m): de ahí sale el segundo monstruo.

// Centro del cruce, justo al otro lado de la puerta izquierda (x = −2,5) de la habitación.
export const CRUCE = { x: -3.3, z: 0.35 };

export const RUTAS = {
  izquierda: {
    rumbo: Math.PI, // hacia +z
    sigueRecto: 40,
    tramos: [
      { largo: 14, giro: 0 },
      { largo: 12, giro: 90 },
      { largo: 14, giro: -90 },
      { largo: 17, giro: 90 },
    ],
  },
  derecha: {
    rumbo: 0, // hacia −z
    sigueRecto: 40,
    tramos: [
      { largo: 14, giro: 0 },
      { largo: 10, giro: 90 },
      { largo: 8, giro: -90 },
      { largo: 8, giro: 90 },
      { largo: 10, giro: -90 },
      { largo: 9, giro: 90 },
      { largo: 12, giro: -90 },
      { largo: 24, giro: -90 },
    ],
  },
};

const MEDIO_GIRO_M = 1; // el giro se reparte en el metro antes y el metro después de la esquina
const smooth = (u) => u * u * (3 - 2 * u);

export function crearRecorrido(ruta, origen = CRUCE) {
  const segmentos = [];
  let rumbo = ruta.rumbo;
  let x = origen.x, z = origen.z, desde = 0;
  for (const t of ruta.tramos) {
    rumbo -= (t.giro * Math.PI) / 180;
    segmentos.push({ desde, largo: t.largo, rumbo, x, z });
    x += -Math.sin(rumbo) * t.largo;
    z += -Math.cos(rumbo) * t.largo;
    desde += t.largo;
  }
  const largo = desde;
  const esquinas = segmentos.slice(1).map((s) => s.desde);

  function poseEn(dIn) {
    const d = Math.max(0, Math.min(dIn, largo));
    let i = segmentos.findIndex((s) => d < s.desde + s.largo);
    if (i < 0) i = segmentos.length - 1;
    const s = segmentos[i];
    const k = d - s.desde;
    const px = s.x + -Math.sin(s.rumbo) * k;
    const pz = s.z + -Math.cos(s.rumbo) * k;
    let r = s.rumbo;
    const ant = segmentos[i - 1];
    const sig = segmentos[i + 1];
    if (ant && k < MEDIO_GIRO_M) {
      r = ant.rumbo + (s.rumbo - ant.rumbo) * smooth((k + MEDIO_GIRO_M) / (2 * MEDIO_GIRO_M));
    } else if (sig && s.largo - k < MEDIO_GIRO_M) {
      r = s.rumbo + (sig.rumbo - s.rumbo) * smooth((k - (s.largo - MEDIO_GIRO_M)) / (2 * MEDIO_GIRO_M));
    }
    return { x: px, z: pz, rumbo: r };
  }

  // Punto a d m pasada la primera esquina, siguiendo recto (el pasillo sin salida del segundo monstruo).
  const s0 = segmentos[0];
  function recto(d) {
    const k = s0.largo + Math.max(0, Math.min(d, ruta.sigueRecto));
    return { x: s0.x + -Math.sin(s0.rumbo) * k, z: s0.z + -Math.cos(s0.rumbo) * k, rumbo: s0.rumbo };
  }

  return { segmentos, largo, esquinas, sigueRecto: ruta.sigueRecto, poseEn, recto };
}
