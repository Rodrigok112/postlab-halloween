// Recorrido del pasillo: tres tramos rectos con dos giros automáticos. Funciones puras.
// rumbo = giro de cámara alrededor de y (convención de Three.js): mira hacia (-sin r, 0, -cos r).
// giro en grados: + a la derecha, − a la izquierda, respecto al tramo anterior.

export const TRAMOS = [
  { largo: 12, giro: 0 },
  { largo: 10, giro: 90 },
  { largo: 12, giro: -90 },
];

const RUMBO_INICIAL = Math.PI / 2; // hacia −x
const MEDIO_GIRO_M = 1; // el giro se reparte en el metro antes y el metro después de la esquina

// Rumbo y punto de inicio de cada tramo.
const SEGMENTOS = (() => {
  const out = [];
  let rumbo = RUMBO_INICIAL;
  let x = 0, z = 0, desde = 0;
  for (const t of TRAMOS) {
    rumbo -= (t.giro * Math.PI) / 180;
    out.push({ desde, largo: t.largo, rumbo, x, z });
    x += -Math.sin(rumbo) * t.largo;
    z += -Math.cos(rumbo) * t.largo;
    desde += t.largo;
  }
  return out;
})();

export function largoTotal() {
  return TRAMOS.reduce((a, t) => a + t.largo, 0);
}

const smooth = (u) => u * u * (3 - 2 * u);

export function poseEn(dIn) {
  const d = Math.max(0, Math.min(dIn, largoTotal()));
  let i = SEGMENTOS.findIndex((s) => d < s.desde + s.largo);
  if (i < 0) i = SEGMENTOS.length - 1;
  const s = SEGMENTOS[i];
  const k = d - s.desde;
  const x = s.x + -Math.sin(s.rumbo) * k;
  const z = s.z + -Math.cos(s.rumbo) * k;

  let rumbo = s.rumbo;
  const ant = SEGMENTOS[i - 1];
  const sig = SEGMENTOS[i + 1];
  if (ant && k < MEDIO_GIRO_M) {
    rumbo = ant.rumbo + (s.rumbo - ant.rumbo) * smooth((k + MEDIO_GIRO_M) / (2 * MEDIO_GIRO_M));
  } else if (sig && s.largo - k < MEDIO_GIRO_M) {
    rumbo = s.rumbo + (sig.rumbo - s.rumbo) * smooth((k - (s.largo - MEDIO_GIRO_M)) / (2 * MEDIO_GIRO_M));
  }
  return { x, z, rumbo };
}
