// Línea de tiempo de cámara: interpola posición y punto al que mira entre claves, con suavizado. Pura.
// claves: [{ t, pos: [x, y, z], mira: [x, y, z] }] ordenadas por t. Dos claves con el mismo t = corte seco.
// La mirada gira como una cabeza (por ángulos: rumbo y cabeceo, por el camino más corto), no moviendo el
// punto en línea recta: así un giro grande nunca pasa la mirada por la propia cámara.

const smooth = (u) => u * u * (3 - 2 * u);
const mezcla = (a, b, u) => a.map((v, i) => v + (b[i] - v) * u);
const copia = (k) => ({ pos: [...k.pos], mira: [...k.mira] });

const direccion = (k) => {
  const d = k.mira.map((v, i) => v - k.pos[i]);
  const h = Math.hypot(d[0], d[2]);
  return { rumbo: Math.atan2(d[0], d[2]), cabeceo: Math.atan2(d[1], h), largo: Math.hypot(h, d[1]) };
};

export function muestrear(claves, t) {
  const primera = claves[0];
  const ultima = claves[claves.length - 1];
  if (t <= primera.t) return copia(primera);
  if (t >= ultima.t) return copia(ultima);
  let i = 0;
  while (i < claves.length - 2 && claves[i + 1].t <= t) i++;
  const a = claves[i];
  const b = claves[i + 1];
  const tramo = b.t - a.t;
  if (tramo <= 0) return copia(b);
  const u = smooth((t - a.t) / tramo);
  const pos = mezcla(a.pos, b.pos, u);
  const da = direccion(a);
  const db = direccion(b);
  let giro = db.rumbo - da.rumbo;
  giro = Math.atan2(Math.sin(giro), Math.cos(giro)); // camino más corto
  const rumbo = da.rumbo + giro * u;
  const cabeceo = da.cabeceo + (db.cabeceo - da.cabeceo) * u;
  const largo = da.largo + (db.largo - da.largo) * u;
  const h = Math.cos(cabeceo) * largo;
  return {
    pos,
    mira: [pos[0] + Math.sin(rumbo) * h, pos[1] + Math.sin(cabeceo) * largo, pos[2] + Math.cos(rumbo) * h],
  };
}

// Un número (zoom de la cámara, por ejemplo) interpolado en línea recta entre claves { t, v }.
// Dos claves con el mismo t = corte seco: a partir de ese instante manda la segunda.
export function valorEn(claves, t) {
  let i = -1;
  for (let k = 0; k < claves.length; k++) if (claves[k].t <= t) i = k;
  if (i < 0) return claves[0].v;
  if (i === claves.length - 1) return claves[i].v;
  const a = claves[i];
  const b = claves[i + 1];
  return a.v + (b.v - a.v) * ((t - a.t) / (b.t - a.t));
}
