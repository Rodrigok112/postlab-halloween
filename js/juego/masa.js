// El segundo monstruo: la masa de manos (boceto B, 22/10). Una bola de cuerpos fundidos, de piel cosida y
// chapa, con tres caras de piel con LED rojos, y doce brazos que salen en todas direcciones y se agarran a
// paredes, suelo y techo: llena el pasillo de lado a lado. Avanza tirando de los brazos, a 12 fps (quien la
// anima marca el ritmo), con temblor de vértices y saltos de pose. No le afecta la niebla: se ve de lejos.
// Mira y avanza hacia +z local; el centro de la bola está a 1,25 m del suelo.

import { THREE, materialPS1, materialBrillo } from './ps1.js';
import * as tex from './texturas.js';
import { createRng } from '../glitch.js';

const REJILLA = 0.4; // < 1: temblor exagerado
const CENTRO_Y = 1.25;
const BRAZOS = 12;

export function crearMasa() {
  const rng = createRng(9012);
  const opciones = { fog: false, rejilla: REJILLA };
  const piel = materialPS1({ map: tex.pielHumana(rng), side: THREE.DoubleSide, ...opciones });
  const metal = materialPS1({ map: tex.chapa(rng), ...opciones });
  const oscuroM = materialPS1({ color: 0x232426, ...opciones });
  const cara = materialPS1({ map: tex.mascara(rng), side: THREE.DoubleSide, ...opciones });
  const diente = materialPS1({ color: 0xb8ad92, ...opciones });
  const ojo = materialBrillo({ color: 0xff1a1a, fog: false, rejilla: REJILLA });

  const grupo = new THREE.Group();
  const bola = new THREE.Group();
  bola.position.y = CENTRO_Y;
  grupo.add(bola);

  // La bola: varios bultos de piel y chapa pegados.
  for (const [x, y, z, r, m] of [[0, 0, 0, 0.42, piel], [0.18, 0.15, -0.12, 0.3, piel], [-0.2, -0.12, -0.1, 0.32, metal],
    [0.05, -0.22, 0.12, 0.26, piel], [-0.12, 0.2, 0.1, 0.24, metal]]) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), m);
    b.position.set(x, y, z);
    b.scale.set(1, 0.9 + rng() * 0.25, 1);
    bola.add(b);
  }

  // Tres caras de piel en la parte delantera, a distinta altura y ladeadas.
  const caras = [];
  for (const [x, y, giro, tam] of [[-0.14, 0.12, -0.3, 1], [0.17, 0.02, 0.4, 0.85], [0.0, -0.2, 0.1, 0.7]]) {
    const g = new THREE.Group();
    g.position.set(x, y, 0.34);
    g.rotation.z = giro;
    g.scale.setScalar(tam);
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8, Math.PI / 2 - 1.0, 2.0, 0.35, 1.85), cara);
    m.scale.set(1, 1.3, 1);
    g.add(m);
    for (const s of [-1, 1]) {
      const o = new THREE.Mesh(new THREE.SphereGeometry(0.017, 5, 4), ojo);
      o.position.set(s * 0.042, 0.085, 0.1);
      g.add(o);
    }
    for (let i = 0; i < 6; i++) {
      const d = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.03 + rng() * 0.03, 3), diente);
      d.position.set((i - 2.5) * 0.014, -0.1, 0.1);
      d.rotation.x = Math.PI;
      g.add(d);
    }
    bola.add(g);
    caras.push(g);
  }

  // Doce brazos en corona: brazo (sube desde la bola), codo doblado hacia delante, antebrazo y mano abierta.
  const brazos = [];
  for (let i = 0; i < BRAZOS; i++) {
    const angulo = (i / BRAZOS) * Math.PI * 2 + (rng() - 0.5) * 0.3;
    const raiz = new THREE.Group();
    raiz.rotation.z = angulo;
    bola.add(raiz);
    const hombro = new THREE.Group();
    hombro.rotation.x = 0.3;
    raiz.add(hombro);
    const largo1 = 0.5 + rng() * 0.15;
    const brazo = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, largo1, 5), i % 3 ? piel : metal);
    brazo.position.y = 0.38 + largo1 / 2;
    hombro.add(brazo);
    const codo = new THREE.Group();
    codo.position.y = 0.38 + largo1;
    hombro.add(codo);
    const anillo = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 4, 6), oscuroM);
    anillo.rotation.y = Math.PI / 2;
    codo.add(anillo);
    const largo2 = 0.45 + rng() * 0.15;
    const ante = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, largo2, 5), i % 2 ? metal : piel);
    ante.position.y = largo2 / 2;
    codo.add(ante);
    const mano = new THREE.Group();
    mano.position.y = largo2;
    codo.add(mano);
    const palma = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.025), piel);
    palma.position.y = 0.045;
    mano.add(palma);
    for (let f = 0; f < 4; f++) {
      const dedo = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.11, 0.012), f % 2 ? oscuroM : piel);
      dedo.position.set((f - 1.5) * 0.02, 0.14, 0);
      dedo.rotation.z = (f - 1.5) * 0.25;
      mano.add(dedo);
    }
    brazos.push({ hombro, codo, mano, fase: rng() * Math.PI * 2 });
  }

  let tiron = 0;
  return {
    grupo,
    // Avanza tirando de los brazos (fase en radianes, a 12 fps), las caras tiemblan y, a veces, salta de
    // pose un par de fotogramas. Devuelve true en esos fotogramas rotos.
    animar(fase, rnd) {
      for (const b of brazos) {
        const u = Math.sin(fase + b.fase);
        b.hombro.rotation.x = 0.3 + 0.45 * u;
        b.codo.rotation.x = 0.9 - 0.5 * u;
        b.mano.rotation.x = 0.4 * Math.max(0, -u);
      }
      for (const c of caras) c.rotation.y = (rnd() - 0.5) * 0.5;
      bola.rotation.z = Math.sin(fase * 0.5) * 0.15;
      if (tiron > 0) tiron--;
      else if (rnd() < 0.08) tiron = 2;
      bola.position.x = tiron > 0 ? (rnd() - 0.5) * 0.4 : 0;
      bola.scale.setScalar(tiron > 0 ? 0.85 + rnd() * 0.35 : 1);
      return tiron > 0;
    },
  };
}
