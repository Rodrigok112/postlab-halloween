// El ente: unos 2,6 m, muy flaco y encorvado. Brazos hasta las rodillas con dedos largos como garras,
// costillas y columna marcadas, cabeza alargada sin nariz con una boca que se abre en vertical hasta el
// pecho, piel gris oscura con venas y ojos rojos que brillan. Unos 1.300 triángulos.
// Pivota en la cadera: agacharse (para pasar por puertas de 2,1 m) es inclinar la parte de arriba.
// La animación va a saltos (pocas poses por ciclo), como en PS1. Mira hacia +z local.

import { THREE, materialPS1, materialBrillo } from './ps1.js';
import * as tex from './texturas.js';
import { createRng } from '../glitch.js';

export const CADERA = 1.15;
export const CABEZA_Y = 1.2; // altura de la cabeza sobre la cadera, erguido
const POSES_POR_CICLO = 6;

// Hueso: cilindro de largo l que cuelga hacia −y desde el origen de su grupo.
function hueso(l, r0, r1, material, lados = 5) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, l, lados, 1), material);
  m.position.y = -l / 2;
  return m;
}

// Articulación: grupo colocado en (x, y, z) con un hueso colgando y un punto final para encadenar.
function segmento(padre, [x, y, z], l, r0, r1, material) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.add(hueso(l, r0, r1, material));
  padre.add(g);
  return g;
}

export function crearEnte() {
  const rng = createRng(2610);
  const piel = materialPS1({ map: tex.piel(rng) });
  const pecho = materialPS1({ map: tex.costillas(rng) });
  const hueso_ = materialPS1({ color: 0x5a524a });
  const garra = materialPS1({ color: 0x14100e });
  const diente = materialPS1({ color: 0xb8ad92 });
  const boca = materialBrillo({ color: 0x1a0204 });
  const ojo = materialBrillo({ color: 0xff1a1a, fog: false });
  const grupo = new THREE.Group();

  // ---------- Piernas: muslo, espinilla y pie largo ----------
  const piernas = [-0.11, 0.11].map((x) => {
    const muslo = segmento(grupo, [x, CADERA, 0], 0.6, 0.06, 0.04, piel);
    const rodilla = segmento(muslo, [0, -0.6, 0], 0.58, 0.04, 0.025, piel);
    const pie = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, 0.26), piel);
    pie.position.set(0, -0.58, 0.09);
    rodilla.add(pie);
    muslo.rotation.x = -0.12;
    rodilla.rotation.x = 0.2;
    return { muslo, rodilla };
  });
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.14), piel);
  pelvis.position.y = CADERA;
  grupo.add(pelvis);

  // ---------- Parte de arriba (pivota en la cadera) ----------
  const arriba = new THREE.Group();
  arriba.position.y = CADERA;
  grupo.add(arriba);

  const cintura = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.2, 6), piel);
  cintura.position.y = 0.12;
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.11, 0.52, 7, 3), pecho);
  torso.scale.z = 0.62;
  torso.position.y = 0.48;
  arriba.add(cintura, torso);
  // Columna: vértebras que asoman por la espalda, y la joroba.
  for (let i = 0; i < 9; i++) {
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.04, 0.05), hueso_);
    v.position.set(0, 0.1 + i * 0.075, -0.1 - Math.sin((i / 8) * Math.PI) * 0.05);
    arriba.add(v);
  }
  // Clavículas y hombros huesudos.
  for (const s of [-1, 1]) {
    const clav = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.22, 4), hueso_);
    clav.rotation.z = Math.PI / 2 - s * 0.25;
    clav.position.set(s * 0.12, 0.74, 0.03);
    const hombro = new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 4), piel);
    hombro.position.set(s * 0.23, 0.72, 0);
    arriba.add(clav, hombro);
  }

  // ---------- Brazos: brazo, antebrazo, mano y cuatro dedos con garra ----------
  const brazos = [-1, 1].map((s) => {
    const brazo = segmento(arriba, [s * 0.24, 0.72, 0], 0.56, 0.035, 0.028, piel);
    const codo = segmento(brazo, [0, -0.56, 0], 0.56, 0.028, 0.02, piel);
    const mano = new THREE.Group();
    mano.position.y = -0.56;
    codo.add(mano);
    const palma = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.03), piel);
    palma.position.y = -0.05;
    mano.add(palma);
    for (let f = 0; f < 4; f++) {
      const dedo = segmento(mano, [(f - 1.5) * 0.02, -0.1, 0], 0.17, 0.01, 0.008, piel);
      dedo.rotation.z = (f - 1.5) * 0.12 * s;
      dedo.rotation.x = 0.2;
      const punta = segmento(dedo, [0, -0.17, 0], 0.14, 0.008, 0.006, piel);
      punta.rotation.x = 0.45;
      const una = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.06, 3), garra);
      una.position.y = -0.17;
      una.rotation.x = Math.PI;
      punta.add(una);
    }
    brazo.rotation.z = s * 0.1;
    codo.rotation.x = -0.25;
    return { brazo, codo };
  });

  // ---------- Cuello y cabeza ----------
  const cuello = new THREE.Group();
  cuello.position.set(0, 0.76, 0.02);
  cuello.rotation.x = 0.35;
  arriba.add(cuello);
  const cuelloM = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.3, 5), piel);
  cuelloM.position.y = 0.15;
  cuello.add(cuelloM);
  const cabeza = new THREE.Group();
  cabeza.position.y = 0.36;
  cabeza.rotation.x = -0.35;
  cuello.add(cabeza);
  const craneo = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), piel);
  craneo.scale.set(0.95, 1.7, 1.05);
  craneo.position.y = 0.07;
  cabeza.add(craneo);
  // Cuencas hundidas y ojos.
  const ojos = [];
  for (const s of [-1, 1]) {
    const cuenca = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 4), boca);
    cuenca.position.set(s * 0.045, 0.1, 0.1);
    cuenca.scale.set(1.2, 0.8, 0.5);
    const o = new THREE.Mesh(new THREE.SphereGeometry(0.017, 5, 4), ojo);
    o.position.set(s * 0.045, 0.1, 0.112);
    cabeza.add(cuenca, o);
    ojos.push(o);
  }
  // Boca: hueco oscuro detrás de una fila de dientes arriba, y una mandíbula que se desencaja hacia abajo.
  const fauces = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.06), boca);
  fauces.position.set(0, -0.06, 0.09);
  cabeza.add(fauces);
  for (let i = 0; i < 7; i++) {
    const d = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.025 + rng() * 0.035, 3), diente);
    d.position.set((i - 3) * 0.013, -0.045, 0.1);
    d.rotation.x = Math.PI;
    d.rotation.z = (rng() - 0.5) * 0.5;
    cabeza.add(d);
  }
  const mandibula = new THREE.Group();
  mandibula.position.set(0, -0.06, 0.02);
  cabeza.add(mandibula);
  // Mandíbula estrecha y alargada, acabada en punta.
  const quijada = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.025, 0.13, 6), piel);
  quijada.scale.z = 0.9;
  quijada.position.set(0, -0.05, 0.04);
  mandibula.add(quijada);
  for (let i = 0; i < 7; i++) {
    const d = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.025 + rng() * 0.03, 3), diente);
    d.position.set((i - 3) * 0.013, 0.012, 0.085);
    d.rotation.z = (rng() - 0.5) * 0.5;
    mandibula.add(d);
  }
  // Garganta: hueco oscuro entre los dientes de arriba y la mandíbula, que crece al abrir.
  const garganta = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 1), boca);
  garganta.position.set(0, -0.05, 0.085);
  garganta.visible = false;
  cabeza.add(garganta);

  const colores = [piel, pecho, hueso_, garra, diente].map((m) => [m, m.color.getHex()]);
  const paso = (fase) => Math.floor((fase * POSES_POR_CICLO) / (Math.PI * 2)) * ((Math.PI * 2) / POSES_POR_CICLO);

  return {
    grupo,
    cabeza,
    ojos,
    // rad: 0 erguido; ~1,0 para pasar por la puerta; ~0,6 dentro de la habitación (techo de 2,6 m).
    agacharse(rad) { arriba.rotation.x = rad; cuello.rotation.x = 0.35 - rad * 0.55; cabeza.rotation.x = -0.35 - rad * 0.25; },
    // Paso a saltos: piernas y brazos alternos.
    andar(fase) {
      const f = paso(fase);
      piernas[0].muslo.rotation.x = -0.12 + Math.sin(f) * 0.35;
      piernas[1].muslo.rotation.x = -0.12 - Math.sin(f) * 0.35;
      piernas[0].rodilla.rotation.x = 0.2 + Math.max(0, Math.cos(f)) * 0.5;
      piernas[1].rodilla.rotation.x = 0.2 + Math.max(0, -Math.cos(f)) * 0.5;
      brazos[0].brazo.rotation.x = -Math.sin(f) * 0.25;
      brazos[1].brazo.rotation.x = Math.sin(f) * 0.25;
    },
    // Quieto, con los brazos un poco levantados hacia delante (para agarrar).
    alcanzar(u) {
      for (const b of brazos) { b.brazo.rotation.x = -1.1 * u; b.codo.rotation.x = -0.25 - 0.5 * u; }
    },
    // 0 cerrada; 1 desencajada hasta el pecho.
    boca(u) {
      const k = Math.round(u * 4) / 4; // a saltos
      mandibula.rotation.x = 0.4 * k;
      mandibula.position.y = -0.06 - 0.22 * k;
      garganta.visible = k > 0;
      garganta.scale.y = Math.max(0.01, 0.24 * k);
      garganta.position.y = -0.05 - 0.12 * k;
    },
    // En la oscuridad (asomado tras la puerta) solo se le ven los ojos.
    oscuro(si) {
      for (const [m, c] of colores) m.color.setHex(si ? 0x050505 : c);
    },
    // 1 abiertos, 0 cerrados (parpadeo).
    parpadear(u) { for (const o of ojos) o.scale.y = Math.max(0.05, u); },
  };
}
