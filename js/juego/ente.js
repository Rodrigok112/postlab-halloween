// El ente (rediseño del 23/10): una máquina que intenta parecer humana. Casi 3 m, flaco y encorvado.
// Esqueleto de poses: cadera, cinco segmentos de columna con púas y costillas curvas sueltas, clavículas,
// brazos de tres tramos (dos codos) con dedos de tres falanges, piernas con las rodillas al revés, tres
// vértebras de cuello y una cabeza muy alargada esculpida en código (cejas, pómulos hundidos, cráneo de chapa
// con placas y tornillos, cara de piel cosida con sangre, mandíbula larga con dos filas de dientes).
// Tiras de piel cuelgan de hombros y costillas.
// La postura se compone en cada fotograma: pose base (POSES, o una mezcla) + agacharse + andar + alcanzar +
// abrir + glitch. Se anima a saltos (12 fps, lo marca quien lo usa). Mira hacia +z local. Unos 3.000 triángulos.

import { THREE, materialPS1, materialBrillo } from './ps1.js';
import * as tex from './texturas.js';
import { createRng } from '../glitch.js';

export const CADERA = 1.15;
const ESPINA = 5; // segmentos de columna
const CUELLO = 3;
const R_CABEZA = 0.11;
const ALARGADO = 1.9; // la cabeza es casi el doble de alta que de ancha

// ---------- Poses (radianes, relativas al esqueleto en reposo) ----------
// Convenciones: en una pieza que cuelga (pierna, brazo), x + la lleva hacia atrás y x − hacia delante; en una
// que sube (columna, cuello, cabeza), x + la inclina hacia delante. z abre hacia fuera con el signo del lado
// (I = izquierda, x < 0). dedos y boca: 0 a 1. altura: cuánto baja todo el cuerpo (m, negativo = más bajo).
const lado = (base, s) => base.map((v, i) => (i === 2 ? v * s : v));
function pose(p) {
  const out = {};
  for (const [k, v] of Object.entries(p)) {
    if (k.endsWith('$')) {
      const nombre = k.slice(0, -1);
      out[`${nombre}I`] = Array.isArray(v) ? lado(v, -1) : v;
      out[`${nombre}D`] = Array.isArray(v) ? lado(v, 1) : v;
    } else out[k] = v;
  }
  return out;
}
const columna = (x, y = 0, z = 0) => Object.fromEntries(Array.from({ length: ESPINA }, (_, i) => [`esp${i}`, [x, y, z]]));
const cuello = (x, y = 0, z = 0) => Object.fromEntries(Array.from({ length: CUELLO }, (_, i) => [`cue${i}`, [x, y, z]]));

const REPOSO = pose({
  cadera: [0, 0, 0],
  'muslo$': [-0.45, 0, 0], 'rodilla$': [1.0, 0, 0], 'tobillo$': [-0.75, 0, 0],
  ...columna(0.06),
  'clav$': [0, 0, 0], 'brazo$': [0, 0, 0.12], 'codo1$': [-0.2, 0, 0], 'codo2$': [-0.25, 0, 0], 'mano$': [0, 0, 0],
  'dedos$': 0.3,
  ...cuello(0.1),
  cabeza: [-0.25, 0, 0], boca: 0, altura: 0,
});

export const POSES = {
  reposo: REPOSO,
  // Encorvado, al acecho: la espalda hecha un arco, la cabeza estirada hacia delante, las garras listas.
  acecho: pose({
    ...REPOSO, ...columna(0.2), ...cuello(-0.15), cabeza: [-0.1, 0, 0],
    'brazo$': [-0.7, 0, 0.3], 'codo1$': [-0.9, 0, 0], 'codo2$': [-0.6, 0, 0], 'dedos$': 0.75,
    'muslo$': [-0.7, 0, 0.05], 'rodilla$': [1.5, 0, 0],
  }),
  // Entrada 1: escondido, solo un brazo sale, estirado de más, y los dedos se agarran al marco.
  dedos: pose({
    ...REPOSO, ...columna(0.25, 0, -0.1), ...cuello(0.2), cabeza: [0.2, 0, 0],
    brazoI: [-1.5, 0, -1.1], codo1I: [-0.2, 0, 0], codo2I: [0.3, 0, 0], manoI: [0, 0, 0.6], dedosI: 1,
    brazoD: [0.2, 0, 0.1], codo1D: [-0.6, 0, 0], dedosD: 0.6,
  }),
  // Entrada 2: la cabeza asoma del revés, el cuerpo doblado de lado.
  reves: pose({
    ...REPOSO, ...columna(0.1, 0, 0.3), ...cuello(0.1, 0, 0.45), cabeza: [0, 0, 2.6],
    brazoI: [-1.2, 0, -1.3], codo1I: [-0.5, 0, 0], dedosI: 1,
    brazoD: [0.3, 0, 1.4], codo1D: [-1.1, 0, 0], codo2D: [-0.4, 0, 0], dedosD: 0.8,
    'muslo$': [-0.6, 0, 0], 'rodilla$': [1.4, 0, 0],
  }),
  // Entrada 3: se retuerce: la columna girada sobre sí misma, un brazo apoyado en el suelo, el otro atrás.
  retuerce: pose({
    ...REPOSO, ...columna(0.22, 0.32, 0.08), ...cuello(0.15, 0.25, -0.2), cabeza: [0.1, 0.4, -0.9],
    brazoI: [-1.6, 0, -0.5], codo1I: [-0.9, 0, 0], codo2I: [0.4, 0, 0], dedosI: 0.2,
    brazoD: [1.4, 0, 0.9], codo1D: [-1.2, 0, 0], codo2D: [-0.8, 0, 0], dedosD: 0.9,
    musloI: [-0.9, 0, -0.2], rodillaI: [1.7, 0, 0],
  }),
  // Entrada 4: da un paso con la rodilla doblada hacia atrás, exagerada.
  rodilla: pose({
    ...REPOSO, altura: -0.12, ...columna(0.12, -0.1, 0), ...cuello(0.05), cabeza: [-0.3, 0.3, 0.5],
    musloI: [-1.5, 0, -0.15], rodillaI: [2.3, 0, 0], tobilloI: [-1.3, 0, 0],
    musloD: [-0.1, 0, 0.05], rodillaD: [0.8, 0, 0],
    brazoI: [-0.4, 0, -1.2], codo1I: [-1.0, 0, 0], brazoD: [-0.3, 0, 1.3], codo1D: [-0.9, 0, 0], 'dedos$': 0.85,
  }),
  // Entrada 5: se despliega: la espalda se arquea hacia atrás, los brazos arriba y la boca abierta.
  despliega: pose({
    ...REPOSO, ...columna(-0.16), ...cuello(-0.25), cabeza: [-0.7, 0, 0.2],
    'brazo$': [-2.6, 0, 0.6], 'codo1$': [-0.6, 0, 0], 'codo2$': [-0.4, 0, 0], 'dedos$': 0.2,
    'muslo$': [-0.2, 0, 0.1], 'rodilla$': [0.6, 0, 0], boca: 0.7,
  }),
  // Entrada 6: en pie, altísimo, la cabeza ladeada como estudiándote, los brazos colgando hasta las rodillas.
  enPie: pose({
    ...REPOSO, ...columna(0.04), ...cuello(0.05, 0, 0.12), cabeza: [-0.15, 0.2, 0.55],
    'brazo$': [-0.15, 0, 0.18], 'codo1$': [-0.1, 0, 0], 'codo2$': [-0.15, 0, 0], 'dedos$': 0.45,
  }),
  // A cuatro patas: la cadera baja, la columna casi horizontal y los brazos haciendo de patas delanteras.
  cuatroPatas: pose({
    ...REPOSO, altura: -0.42, cadera: [1.3, 0, 0], ...columna(0.04), ...cuello(-0.5), cabeza: [-0.55, 0, 0],
    'brazo$': [-1.05, 0, 0.3], 'codo1$': [0.5, 0, 0], 'codo2$': [0.35, 0, 0], 'mano$': [0.9, 0, 0], 'dedos$': 0.1,
    'muslo$': [-1.25, 0, 0.2], 'rodilla$': [2.1, 0, 0], 'tobillo$': [-0.6, 0, 0],
  }),
  // Grita: el cuello estirado hacia ti, los brazos abiertos atrás, la mandíbula desencajada.
  grito: pose({
    ...REPOSO, ...columna(0.18), ...cuello(0.2), cabeza: [0.1, 0, 0],
    'brazo$': [0.6, 0, 1.1], 'codo1$': [-0.8, 0, 0], 'codo2$': [-0.5, 0, 0], 'dedos$': 1, boca: 1,
  }),
  // Se lanza: todo hacia delante, los brazos estirados para agarrarte.
  lanza: pose({
    ...REPOSO, ...columna(0.25), ...cuello(0.0), cabeza: [-0.2, 0, 0],
    'brazo$': [-1.7, 0, 0.35], 'codo1$': [-0.2, 0, 0], 'codo2$': [-0.1, 0, 0], 'dedos$': 0.6, boca: 1,
    'muslo$': [-1.0, 0, 0], 'rodilla$': [1.6, 0, 0],
  }),
};

// Mezcla dos poses (u de 0 a 1).
export function mezclarPoses(a, b, u) {
  const out = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const va = a[k] ?? b[k];
    const vb = b[k] ?? a[k];
    out[k] = Array.isArray(va) ? va.map((v, i) => v + (vb[i] - v) * u) : va + (vb - va) * u;
  }
  return out;
}

// La entrada por la puerta: unas 30 poses (una por fotograma a 12 fps), entre las seis claves del boceto,
// cada una con su propio temblor para que no haya dos iguales.
export const CLAVES_ENTRADA = ['dedos', 'reves', 'retuerce', 'rodilla', 'despliega', 'enPie'];
export function poseEntrada(k, total = 30) {
  const u = Math.max(0, Math.min(1, k / (total - 1))) * (CLAVES_ENTRADA.length - 1);
  const i = Math.min(Math.floor(u), CLAVES_ENTRADA.length - 2);
  const f = u - i;
  const suave = f * f * (3 - 2 * f);
  const base = mezclarPoses(POSES[CLAVES_ENTRADA[i]], POSES[CLAVES_ENTRADA[i + 1]], suave);
  const rng = createRng(1000 + k * 37);
  const out = {};
  for (const [j, v] of Object.entries(base)) out[j] = Array.isArray(v) ? v.map((x) => x + (rng() - 0.5) * 0.16) : v;
  return out;
}

// ---------- Construcción ----------

// Barra de largo l que sale del origen de su grupo hacia +y (sube) o hacia −y (cuelga).
function barra(l, r0, r1, material, sube = false, lados = 5) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(sube ? r1 : r0, sube ? r0 : r1, l, lados, 1), material);
  m.position.y = sube ? l / 2 : -l / 2;
  return m;
}

function anillo(r, material) {
  const a = new THREE.Mesh(new THREE.TorusGeometry(r, 0.01, 4, 6), material);
  a.rotation.y = Math.PI / 2;
  return a;
}

// Manga de piel rasgada alrededor de una barra (cilindro abierto e incompleto), de y0 a y0 − l.
function manga(padre, l, r, y0, material, rng) {
  const geo = new THREE.CylinderGeometry(r, r * 0.9, l, 6, 1, true, rng() * 6, 3.2 + rng() * 2);
  const m = new THREE.Mesh(geo, material);
  m.position.y = y0 - l / 2;
  padre.add(m);
  return m;
}

// Deformación de la cabeza sobre una esfera unidad (dirección d): cejas salientes, cuencas y pómulos hundidos,
// nuca abultada y barbilla estrecha. Devuelve el punto ya estirado a lo alto.
function esculpir([x, y, z]) {
  let r = 1;
  if (z > 0.2 && y > 0.55 && y < 0.78) r += 0.12 * Math.sin(((y - 0.55) / 0.23) * Math.PI) * z; // arco de las cejas
  if (z > 0.3 && y > 0.32 && y < 0.6 && Math.abs(x) > 0.15 && Math.abs(x) < 0.55) r -= 0.1; // cuencas
  if (z > 0.1 && y > -0.1 && y < 0.3 && Math.abs(x) > 0.35) r -= 0.12; // pómulos hundidos
  if (z < -0.2 && y > 0.2) r += 0.1 * (y - 0.2); // nuca
  let sx = 1;
  if (y < -0.4) sx = 1 - 0.45 * ((-0.4 - y) / 0.6); // barbilla estrecha
  return [x * r * sx * R_CABEZA, y * r * R_CABEZA * ALARGADO, z * r * R_CABEZA];
}

function cabezaEsculpida(geo) {
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    p.setXYZ(i, ...esculpir([v.x, v.y, v.z]));
  }
  geo.computeVertexNormals();
  return geo;
}

export function crearEnte() {
  const rng = createRng(2610);
  const metal = materialPS1({ map: tex.chapa(rng) });
  const oscuroM = materialPS1({ color: 0x232426 });
  const piel = materialPS1({ map: tex.pielHumana(rng), side: THREE.DoubleSide });
  const cara = materialPS1({ map: tex.mascara(rng), side: THREE.DoubleSide });
  const diente = materialPS1({ color: 0xb8ad92 });
  const boca = materialBrillo({ color: 0x1a0204 });
  const ojo = materialBrillo({ color: 0xff1a1a, fog: false });
  const grupo = new THREE.Group();
  const cuerpo = new THREE.Group();
  cuerpo.scale.setScalar(1.15); // más alto que una persona: casi 3 m
  grupo.add(cuerpo);
  const J = {}; // articulaciones por nombre

  // ---------- Cadera y piernas con las rodillas al revés ----------
  const cadera = new THREE.Group();
  cadera.position.y = CADERA;
  cuerpo.add(cadera);
  J.cadera = cadera;
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.14), metal);
  cadera.add(pelvis);
  // Las piernas cuelgan de la cadera, pero no se inclinan con ella: van en un grupo aparte, a la misma altura.
  const caderaPiernas = new THREE.Group();
  caderaPiernas.position.y = CADERA;
  cuerpo.add(caderaPiernas);
  for (const [s, L] of [[-1, 'I'], [1, 'D']]) {
    const muslo = new THREE.Group();
    muslo.position.x = s * 0.11;
    muslo.add(barra(0.5, 0.035, 0.03, metal), anillo(0.045, oscuroM));
    manga(muslo, 0.3, 0.06, -0.05, piel, rng);
    caderaPiernas.add(muslo);
    const rodilla = new THREE.Group();
    rodilla.position.y = -0.5;
    rodilla.add(barra(0.5, 0.03, 0.022, metal), anillo(0.04, oscuroM));
    muslo.add(rodilla);
    const tobillo = new THREE.Group();
    tobillo.position.y = -0.5;
    tobillo.add(barra(0.3, 0.022, 0.018, oscuroM));
    rodilla.add(tobillo);
    const pie = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.025, 0.2), metal);
    pie.position.set(0, -0.3, 0.06);
    tobillo.add(pie);
    for (let d = 0; d < 3; d++) {
      const dedo = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.09, 3), oscuroM);
      dedo.rotation.x = Math.PI / 2;
      dedo.position.set((d - 1) * 0.022, -0.3, 0.2);
      tobillo.add(dedo);
    }
    Object.assign(J, { [`muslo${L}`]: muslo, [`rodilla${L}`]: rodilla, [`tobillo${L}`]: tobillo });
  }

  // ---------- Columna: cinco segmentos encadenados, con púas, costillas curvas y piel ----------
  let padre = cadera;
  const LARGO_SEG = 0.16;
  const tiras = [];
  for (let i = 0; i < ESPINA; i++) {
    const seg = new THREE.Group();
    seg.position.y = i === 0 ? 0.06 : LARGO_SEG;
    padre.add(seg);
    J[`esp${i}`] = seg;
    const disco = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.06, 6), i % 2 ? metal : oscuroM);
    disco.position.y = LARGO_SEG / 2;
    seg.add(disco, barra(LARGO_SEG, 0.018, 0.018, oscuroM, true, 4));
    const pua = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.09, 4), oscuroM);
    pua.rotation.x = -Math.PI / 2 - 0.5;
    pua.position.set(0, LARGO_SEG / 2, -0.07);
    seg.add(pua);
    // Costillas en los tres segmentos de arriba: dos por lado, curvas, de la espalda al pecho.
    if (i >= 2) {
      for (const k of [0, 1]) {
        for (const s of [-1, 1]) {
          const ancho = 0.17 - (i - 2) * 0.012 + k * 0.01;
          const y = 0.03 + k * 0.075;
          const curva = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, y, -0.03),
            new THREE.Vector3(s * ancho * 0.8, y - 0.02, -0.02),
            new THREE.Vector3(s * ancho, y - 0.05, 0.06),
            new THREE.Vector3(s * ancho * 0.55, y - 0.08, 0.13),
          ]);
          seg.add(new THREE.Mesh(new THREE.TubeGeometry(curva, 6, 0.009, 3), metal));
        }
      }
      const esternon = new THREE.Mesh(new THREE.BoxGeometry(0.03, LARGO_SEG, 0.015), metal);
      esternon.position.set(0, LARGO_SEG / 2 - 0.03, 0.13);
      seg.add(esternon);
    }
    // Tiras de piel colgando de las costillas.
    if (i === 3) {
      for (const x of [-0.12, -0.04, 0.07, 0.14]) {
        const g = new THREE.Group();
        g.position.set(x, 0.1, 0.1);
        const tira = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.3 + rng() * 0.15, 1, 3), piel);
        tira.position.y = -0.18;
        g.add(tira);
        seg.add(g);
        tiras.push(g);
      }
    }
    padre = seg;
  }
  const pecho = padre; // segmento de arriba

  // ---------- Hombros, brazos de tres tramos y manos con dedos de tres falanges ----------
  const dedosDe = { I: [], D: [] };
  for (const [s, L] of [[-1, 'I'], [1, 'D']]) {
    const clav = new THREE.Group();
    clav.position.set(s * 0.05, LARGO_SEG, 0.02);
    pecho.add(clav);
    const hueso = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.2, 4), metal);
    hueso.rotation.z = Math.PI / 2;
    hueso.position.x = s * 0.1;
    clav.add(hueso);
    const hombro = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 4), metal);
    hombro.position.x = s * 0.2;
    clav.add(hombro);
    // Tira de piel colgando del hombro.
    const gt = new THREE.Group();
    gt.position.set(s * 0.16, 0, 0.05);
    const tira = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.38, 1, 3), piel);
    tira.position.y = -0.2;
    gt.add(tira);
    clav.add(gt);
    tiras.push(gt);
    const brazo = new THREE.Group();
    brazo.position.x = s * 0.21;
    brazo.add(barra(0.42, 0.028, 0.024, metal), anillo(0.04, oscuroM));
    manga(brazo, 0.26, 0.05, -0.04, piel, rng);
    clav.add(brazo);
    const codo1 = new THREE.Group();
    codo1.position.y = -0.42;
    codo1.add(barra(0.38, 0.024, 0.02, metal), anillo(0.034, oscuroM));
    brazo.add(codo1);
    const codo2 = new THREE.Group();
    codo2.position.y = -0.38;
    codo2.add(barra(0.36, 0.02, 0.016, oscuroM), anillo(0.03, oscuroM));
    codo1.add(codo2);
    const mano = new THREE.Group();
    mano.position.y = -0.36;
    codo2.add(mano);
    const palma = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.09, 0.022), metal);
    palma.position.y = -0.045;
    mano.add(palma);
    for (let f = 0; f < 5; f++) {
      const pulgar = f === 4;
      let p0 = new THREE.Group();
      p0.position.set(pulgar ? s * 0.04 : (f - 1.5) * 0.017, pulgar ? -0.03 : -0.09, 0.005);
      p0.rotation.z = pulgar ? s * 0.7 : (f - 1.5) * 0.12 * s;
      mano.add(p0);
      const falanges = [p0];
      const largos = pulgar ? [0.08, 0.07] : [0.11, 0.1, 0.09];
      largos.forEach((l, n) => {
        const g = n === 0 ? p0 : new THREE.Group();
        if (n > 0) { g.position.y = -largos[n - 1]; falanges[n - 1].add(g); falanges.push(g); }
        g.add(barra(l, 0.008 - n * 0.001, 0.007 - n * 0.001, n % 2 ? metal : oscuroM, false, 4));
      });
      const una = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.05, 3), oscuroM);
      una.position.y = -largos.at(-1) - 0.02;
      una.rotation.x = Math.PI;
      falanges.at(-1).add(una);
      dedosDe[L].push(falanges);
    }
    Object.assign(J, { [`clav${L}`]: clav, [`brazo${L}`]: brazo, [`codo1${L}`]: codo1, [`codo2${L}`]: codo2, [`mano${L}`]: mano });
  }

  // ---------- Cuello de tres vértebras y cabeza alargada ----------
  padre = pecho;
  for (let i = 0; i < CUELLO; i++) {
    const seg = new THREE.Group();
    seg.position.y = i === 0 ? LARGO_SEG + 0.02 : 0.11;
    padre.add(seg);
    J[`cue${i}`] = seg;
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.05, 6), i % 2 ? metal : oscuroM);
    d.position.y = 0.055;
    seg.add(d, barra(0.11, 0.014, 0.014, oscuroM, true, 4));
    padre = seg;
  }
  const cabeza = new THREE.Group();
  cabeza.position.y = 0.11;
  padre.add(cabeza);
  J.cabeza = cabeza;
  const giro = new THREE.Group(); // los giros de 90° del glitch, aparte de la pose
  giro.scale.setScalar(1.4); // cabeza grande: se tiene que leer bien desde lejos
  cabeza.add(giro);
  const centro = new THREE.Group(); // la cabeza crece hacia arriba desde el cuello
  centro.position.y = R_CABEZA * ALARGADO * 0.75;
  giro.add(centro);
  centro.add(new THREE.Mesh(cabezaEsculpida(new THREE.SphereGeometry(1, 14, 12)), metal));
  // Cara: el trozo delantero de la misma forma, un pelo por fuera, con la máscara de piel.
  const caraGeo = cabezaEsculpida(new THREE.SphereGeometry(1, 12, 10, Math.PI / 2 - 1.0, 2.0, 0.35, 1.85));
  caraGeo.scale(1.03, 1.02, 1.04);
  centro.add(new THREE.Mesh(caraGeo, cara));
  // Placas y tornillos en el cráneo.
  for (const [x, y, z, w, h] of [[0, 0.17, -0.03, 0.09, 0.06], [-0.07, 0.11, -0.06, 0.05, 0.07], [0.07, 0.09, -0.07, 0.05, 0.06]]) {
    const pl = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.012), metal);
    pl.position.set(x, y, z);
    pl.lookAt(x * 3, y * 1.5, z * 3);
    centro.add(pl);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.012), oscuroM);
    t.position.set(x * 1.1, y * 1.05, z * 1.15);
    centro.add(t);
  }
  // Ojos: dos LED en las cuencas de la máscara (la misma dirección que los ojos de la textura).
  const ojos = [];
  for (const s of [-1, 1]) {
    const [x, y, z] = esculpir([s * 0.32, 0.506, 0.8]);
    const o = new THREE.Mesh(new THREE.SphereGeometry(0.017, 5, 4), ojo);
    o.position.set(x * 0.98, y, z * 0.98);
    centro.add(o);
    ojos.push(o);
  }
  const leds = [];
  for (let i = 0; i < 6; i++) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.012), ojo);
    const [x, y, z] = esculpir([((i % 3) - 1) * 0.25, 0.92, 0.25 - Math.floor(i / 3) * 0.35]);
    l.position.set(x, y + 0.006, z);
    centro.add(l);
    leds.push(l);
  }
  // Dos filas de dientes arriba, bajo la máscara.
  const [, yBoca, zBoca] = esculpir([0, -0.32, 0.92]);
  for (let fila = 0; fila < 2; fila++) {
    for (let i = 0; i < 8; i++) {
      const d = new THREE.Mesh(new THREE.ConeGeometry(0.007, 0.025 + rng() * 0.03, 3), diente);
      d.position.set((i - 3.5) * 0.012, yBoca - fila * 0.012, zBoca - 0.005 - fila * 0.012);
      d.rotation.x = Math.PI;
      d.rotation.z = (rng() - 0.5) * 0.5;
      centro.add(d);
    }
  }
  const garganta = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 1), boca);
  garganta.position.set(0, yBoca, zBoca - 0.015);
  garganta.visible = false;
  centro.add(garganta);
  // Mandíbula larga, de bisagra, con dos filas de dientes.
  const mandibula = new THREE.Group();
  mandibula.position.set(0, yBoca - 0.005, zBoca - 0.09);
  centro.add(mandibula);
  const quijada = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.02, 0.2, 6), metal);
  quijada.scale.z = 0.8;
  quijada.rotation.x = -1.35;
  quijada.position.set(0, -0.04, 0.07);
  mandibula.add(quijada);
  for (const s of [-1, 1]) {
    const bisagra = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 6), oscuroM);
    bisagra.rotation.z = Math.PI / 2;
    bisagra.position.set(s * 0.055, 0, 0);
    mandibula.add(bisagra);
  }
  for (let fila = 0; fila < 2; fila++) {
    for (let i = 0; i < 7; i++) {
      const d = new THREE.Mesh(new THREE.ConeGeometry(0.007, 0.025 + rng() * 0.03, 3), diente);
      d.position.set((i - 3) * 0.012, -0.015 + fila * 0.008, 0.13 - fila * 0.025);
      d.rotation.z = (rng() - 0.5) * 0.5;
      mandibula.add(d);
    }
  }
  // Pelo humano, largo y apelmazado, colgando de la nuca.
  const pelos = [];
  for (let i = 0; i < 16; i++) {
    const a = -1.4 + (i / 15) * 2.8 + Math.PI;
    const g = new THREE.Group();
    const [x, y, z] = esculpir([Math.sin(a) * 0.8, 0.55, Math.cos(a) * 0.8]);
    g.position.set(x, y, z);
    g.add(barra(0.22 + rng() * 0.25, 0.004, 0.003, oscuroM, false, 3));
    centro.add(g);
    pelos.push(g);
  }

  const colores = [metal, oscuroM, piel, cara, diente].map((m) => [m, m.color.getHex()]);

  // ---------- Composición de la postura ----------
  let base = POSES.reposo;
  let inclinacion = 0;
  let alcance = 0;
  let abierto = 0;
  let fase = null;
  let girarCabeza = 0;
  let boquita = 0;
  let roto = null; // desplazamientos al azar de un fotograma roto

  const sumar = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const componer = () => {
    const p = {};
    for (const [k, v] of Object.entries(base)) p[k] = Array.isArray(v) ? [...v] : v;
    // Agacharse: se reparte por la cadera y la columna; el cuello y la cabeza compensan para mirarte.
    p.cadera = sumar(p.cadera, [inclinacion * 0.3, 0, 0]);
    for (let i = 0; i < ESPINA; i++) p[`esp${i}`] = sumar(p[`esp${i}`], [inclinacion * 0.14, 0, 0]);
    for (let i = 0; i < CUELLO; i++) p[`cue${i}`] = sumar(p[`cue${i}`], [-inclinacion * 0.18, 0, 0]);
    p.cabeza = sumar(p.cabeza, [-inclinacion * 0.25, girarCabeza, 0]);
    for (const [s, L] of [[-1, 'I'], [1, 'D']]) {
      p[`brazo${L}`] = sumar(p[`brazo${L}`], [-1.1 * alcance - 0.5 * abierto, 0, s * 1.25 * abierto]);
      p[`codo1${L}`] = sumar(p[`codo1${L}`], [-0.4 * alcance - 0.9 * abierto, 0, 0]);
      p[`codo2${L}`] = sumar(p[`codo2${L}`], [-0.3 * alcance - 0.6 * abierto, 0, 0]);
    }
    // Andar: cojo y desigual; la pierna izquierda arrastra, los brazos van a destiempo.
    if (fase !== null) {
      const f = fase;
      p.musloI = sumar(p.musloI, [Math.sin(f) * 0.2, 0, 0]);
      p.musloD = sumar(p.musloD, [-Math.sin(f) * 0.45, 0, 0]);
      p.rodillaD = sumar(p.rodillaD, [Math.max(0, Math.cos(f)) * 0.7, 0, 0]);
      p.rodillaI = sumar(p.rodillaI, [Math.max(0, -Math.cos(f)) * 0.25, 0, 0]);
      p.brazoI = sumar(p.brazoI, [-Math.sin(f * 0.7) * 0.4, 0, 0]);
      p.brazoD = sumar(p.brazoD, [Math.sin(f * 1.3 + 1) * 0.3, 0, 0]);
      p.codo1I = sumar(p.codo1I, [-Math.max(0, Math.sin(f * 0.5)) * 0.9, 0, 0]); // el codo se dobla de más
      p.cadera = sumar(p.cadera, [0, 0, Math.sin(f) * 0.08]);
    }
    if (roto) for (const [k, d] of Object.entries(roto)) if (Array.isArray(p[k])) p[k] = sumar(p[k], d);
    for (const [k, v] of Object.entries(p)) {
      if (J[k] && Array.isArray(v)) J[k].rotation.set(v[0], v[1], v[2]);
    }
    cuerpo.position.y = (p.altura ?? 0) * 1.15;
    // Dedos: cada falange se cierra un poco más que la anterior.
    for (const L of ['I', 'D']) {
      const u = p[`dedos${L}`] ?? 0.3;
      for (const falanges of dedosDe[L]) falanges.forEach((g, n) => { g.rotation.x = u * (0.5 + n * 0.35); });
    }
    const k = Math.round(Math.max(boquita, p.boca ?? 0) * 4) / 4; // la boca, a saltos
    mandibula.rotation.x = 0.9 * k;
    garganta.visible = k > 0;
    garganta.scale.y = Math.max(0.01, 0.2 * k);
    garganta.position.y = yBoca - 0.1 * k;
  };
  componer();

  let rotoFotogramas = 0;
  let cabezaHasta = 0;

  return {
    grupo,
    cabeza,
    ojos,
    articulaciones: J,
    // Pose base: un nombre de POSES o una pose ya hecha (mezcla, fotograma de la entrada…).
    pose(p) { base = typeof p === 'string' ? POSES[p] : p; componer(); },
    // rad: 0 erguido; ~1,0 para pasar por la puerta; ~0,6 dentro de la habitación (techo de 2,6 m).
    agacharse(rad) { inclinacion = rad; componer(); },
    // Paso (fase en radianes; quien llama la avanza a 12 fps). 0 = quieto.
    andar(f) { fase = f ? f : null; componer(); },
    // Brazos hacia delante (para agarrar): 0 colgando, 1 extendidos.
    alcanzar(u) { alcance = u; componer(); },
    // Brazos abiertos agarrando el marco de la puerta: 0 a 1.
    abrir(u) { abierto = u; componer(); },
    // Gira la cabeza hacia un lado (rad).
    cabezaHacia(rad) { girarCabeza = rad; componer(); },
    // 0 cerrada; 1 desencajada.
    boca(u) { boquita = u; componer(); },
    // En la oscuridad (asomado tras la puerta) solo se le ven los ojos.
    oscuro(si) {
      for (const [m, c] of colores) m.color.setHex(si ? 0x050505 : c);
      for (const l of leds) l.visible = !si;
    },
    // 1 abiertos, 0 cerrados (parpadeo).
    parpadear(u) { for (const o of ojos) o.scale.y = Math.max(0.05, u); },
    // Un fotograma de 12 fps: las tiras de piel y el pelo se mueven, un brazo tiembla siempre, la cabeza gira
    // de golpe 90° a veces y, de vez en cuando, una pose rota de 1–2 fotogramas.
    // nivel: 0 sin glitch (asomado), 1 normal, 2 entrando (muchos fotogramas rotos). Devuelve true si está roto.
    tic(rnd, nivel = 1) {
      for (const t of tiras) t.rotation.x = (rnd() - 0.5) * 0.5;
      for (const p of pelos) p.rotation.x = (rnd() - 0.5) * 0.35;
      cabezaHasta--;
      if (cabezaHasta <= 0) giro.rotation.z = 0;
      if (nivel > 0 && rnd() < (nivel > 1 ? 0.15 : 0.03)) {
        giro.rotation.z = rnd() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
        cabezaHasta = 6 + Math.floor(rnd() * 14);
      }
      if (rotoFotogramas > 0) rotoFotogramas--;
      else if (nivel > 0 && rnd() < (nivel > 1 ? 0.4 : 0.06)) rotoFotogramas = 1 + Math.floor(rnd() * 2);
      if (rotoFotogramas > 0) {
        roto = {};
        for (const k of ['brazoI', 'brazoD', 'codo1I', 'codo1D', 'esp2', 'esp4', 'cue1', 'cabeza']) {
          roto[k] = [(rnd() - 0.5) * 2.2, (rnd() - 0.5) * 0.8, (rnd() - 0.5) * 1.2];
        }
        cuerpo.position.x = (rnd() - 0.5) * 0.25;
        cuerpo.scale.y = 1.15 * (0.85 + rnd() * 0.3);
      } else {
        // El brazo derecho tiembla siempre un poco.
        roto = { brazoD: [0, 0, (rnd() - 0.5) * 0.12], codo2D: [0, 0, (rnd() - 0.5) * 0.3] };
        cuerpo.position.x = 0;
        cuerpo.scale.y = 1.15;
      }
      componer();
      return rotoFotogramas > 0;
    },
  };
}

// La mano que sale por el boquete: antebrazo de barra con piel cosida, muñeca de anillo y dedos de pinza
// larguísimos. Apunta hacia +z local. agarrar(u): 0 abiertos, 1 cerrados.
export function crearMano() {
  const rng = createRng(731);
  const metal = materialPS1({ map: tex.chapa(rng) });
  const oscuroM = materialPS1({ color: 0x232426 });
  const piel = materialPS1({ map: tex.pielHumana(rng), side: THREE.DoubleSide });
  const grupo = new THREE.Group();
  // Todo se monta hacia −y y se tumba hacia +z.
  const eje = new THREE.Group();
  eje.rotation.x = -Math.PI / 2;
  grupo.add(eje);
  const antebrazo = new THREE.Group();
  antebrazo.position.y = 0.45;
  antebrazo.add(barra(0.45, 0.026, 0.02, metal), anillo(0.04, oscuroM));
  manga(antebrazo, 0.3, 0.045, -0.05, piel, rng);
  eje.add(antebrazo);
  const mano = new THREE.Group();
  mano.position.y = -0.45;
  antebrazo.add(mano);
  const palma = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.09, 0.025), metal);
  palma.position.y = -0.045;
  mano.add(palma);
  const dorso = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.1), piel);
  dorso.position.set(0, -0.045, 0.014);
  mano.add(dorso);
  const dedos = [];
  for (let f = 0; f < 4; f++) {
    const dedo = new THREE.Group();
    dedo.position.set((f - 1.5) * 0.02, -0.09, 0);
    dedo.rotation.z = (f - 1.5) * 0.1;
    dedo.add(barra(0.19, 0.008, 0.007, oscuroM), anillo(0.012, metal));
    mano.add(dedo);
    const medio = new THREE.Group();
    medio.position.y = -0.19;
    medio.add(barra(0.16, 0.007, 0.005, metal));
    dedo.add(medio);
    const una = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.05, 3), oscuroM);
    una.position.y = -0.18;
    una.rotation.x = Math.PI;
    medio.add(una);
    dedos.push({ dedo, medio });
  }
  const pulgar = new THREE.Group();
  pulgar.position.set(0.045, -0.03, 0);
  pulgar.rotation.z = -0.7;
  pulgar.add(barra(0.14, 0.008, 0.006, oscuroM));
  mano.add(pulgar);
  grupo.scale.setScalar(1.3); // algo más grande que la del ente: se tiene que ver desde la silla
  return {
    grupo,
    agarrar(u) {
      for (const d of dedos) { d.dedo.rotation.x = 0.9 * u; d.medio.rotation.x = 1.1 * u; }
      pulgar.rotation.x = 0.6 * u;
    },
  };
}
