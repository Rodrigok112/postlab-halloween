// El segundo monstruo (rediseño del 23/10): cuatro IA fundidas, todas queriendo lo mismo. Cuatro maniquíes de
// chapa con cara de piel cosida y ojos LED, unidos por el pecho con una masa de piel; ocho brazos estirados
// hacia delante y ocho piernas que corren cada una a su ritmo. Al fondo del pasillo solo se ve su luz roja;
// cuando sale, corre a toda prisa. Se anima a 12 fps (lo marca quien la usa), con vértices que saltan más que
// el resto y saltos de pose. No le afecta la niebla. Mira y avanza hacia +z local.

import { THREE, materialPS1, materialBrillo } from './ps1.js';
import * as tex from './texturas.js';
import { createRng } from '../glitch.js';

const REJILLA = 0.4; // < 1: temblor exagerado
const CADERA = 0.9;

function barra(l, r0, r1, material) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, l, 5, 1), material);
  m.position.y = -l / 2;
  return m;
}

export function crearMasa() {
  const rng = createRng(9012);
  const op = { fog: false, rejilla: REJILLA };
  const piel = materialPS1({ map: tex.pielHumana(rng), side: THREE.DoubleSide, ...op });
  const metal = materialPS1({ map: tex.chapa(rng), ...op });
  const oscuroM = materialPS1({ color: 0x232426, ...op });
  const pecho = materialPS1({ map: tex.costillas(rng), ...op });
  const cara = materialPS1({ map: tex.mascara(rng), side: THREE.DoubleSide, ...op });
  const diente = materialPS1({ color: 0xb8ad92, ...op });
  const ojo = materialBrillo({ color: 0xff1a1a, fog: false, rejilla: REJILLA });

  const grupo = new THREE.Group();
  const cuerpo = new THREE.Group();
  grupo.add(cuerpo);

  // La masa de piel que las une por el pecho.
  const union = new THREE.Mesh(new THREE.SphereGeometry(0.5, 9, 6), piel);
  union.scale.set(1.5, 0.55, 0.6);
  union.position.set(0, CADERA + 0.42, 0);
  cuerpo.add(union);

  const ias = [];
  [[-0.5, 0.02, -0.25, 0.95], [-0.17, 0.08, -0.05, 1.08], [0.17, 0.04, 0.08, 1.0], [0.5, -0.02, 0.28, 0.9]].forEach(([x, z, giro, tam], i) => {
    const ia = new THREE.Group();
    ia.position.set(x, 0, z);
    ia.rotation.y = giro * 0.3;
    ia.scale.setScalar(tam);
    cuerpo.add(ia);

    // Torso inclinado hacia delante, como corriendo.
    const torso = new THREE.Group();
    torso.position.y = CADERA;
    ia.add(torso);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.09, 0.55, 6), pecho);
    t.position.y = 0.28;
    t.scale.z = 0.7;
    torso.add(t);
    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.09, 0.12), metal);
    torso.add(pelvis);

    // Cabeza alargada de chapa con la cara de piel y dos LED.
    const cuello = new THREE.Group();
    cuello.position.y = 0.58;
    torso.add(cuello);
    cuello.add(barra(0.12, 0.025, 0.03, oscuroM).translateY(0.12));
    const cabeza = new THREE.Group();
    cabeza.position.y = 0.2;
    cuello.add(cabeza);
    const craneo = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), metal);
    craneo.scale.set(0.9, 1.55, 1);
    const mascara = new THREE.Mesh(new THREE.SphereGeometry(0.104, 8, 6, Math.PI / 2 - 1.0, 2.0, 0.4, 1.8), cara);
    mascara.scale.set(0.9, 1.55, 1.02);
    cabeza.add(craneo, mascara);
    for (const s of [-1, 1]) {
      const o = new THREE.Mesh(new THREE.SphereGeometry(0.016, 4, 3), ojo);
      o.position.set(s * 0.032, 0.05, 0.09);
      cabeza.add(o);
    }
    for (let d = 0; d < 6; d++) {
      const dt = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.02 + rng() * 0.02, 3), diente);
      dt.position.set((d - 2.5) * 0.011, -0.09, 0.085);
      dt.rotation.x = Math.PI;
      cabeza.add(dt);
    }

    // Dos brazos que se estiran hacia delante, con dedos largos.
    const brazos = [-1, 1].map((s) => {
      const hombro = new THREE.Group();
      hombro.position.set(s * 0.16, 0.5, 0);
      torso.add(hombro);
      hombro.add(barra(0.38, 0.028, 0.022, i % 2 ? metal : piel));
      const codo = new THREE.Group();
      codo.position.y = -0.38;
      hombro.add(codo);
      codo.add(barra(0.35, 0.022, 0.016, metal));
      const mano = new THREE.Group();
      mano.position.y = -0.35;
      codo.add(mano);
      const palma = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.02), piel);
      palma.position.y = -0.035;
      mano.add(palma);
      for (let f = 0; f < 4; f++) {
        const dedo = barra(0.12, 0.007, 0.005, oscuroM);
        const g = new THREE.Group();
        g.position.set((f - 1.5) * 0.015, -0.07, 0);
        g.rotation.z = (f - 1.5) * 0.2;
        g.add(dedo);
        mano.add(g);
      }
      return { hombro, codo, s };
    });

    // Dos piernas.
    const piernas = [-1, 1].map((s) => {
      const muslo = new THREE.Group();
      muslo.position.set(s * 0.08, CADERA, 0);
      ia.add(muslo);
      muslo.add(barra(0.45, 0.032, 0.026, metal));
      const rodilla = new THREE.Group();
      rodilla.position.y = -0.45;
      muslo.add(rodilla);
      rodilla.add(barra(0.45, 0.026, 0.018, i % 2 ? piel : oscuroM));
      const pie = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.025, 0.16), metal);
      pie.position.set(0, -0.45, 0.05);
      rodilla.add(pie);
      return { muslo, rodilla, s };
    });

    ias.push({ torso, cuello, cabeza, brazos, piernas, fase: i * 1.7 + rng() });
  });

  let tiron = 0;
  const glitch = (rnd) => {
    if (tiron > 0) tiron--;
    else if (rnd() < 0.08) tiron = 2;
    cuerpo.position.x = tiron > 0 ? (rnd() - 0.5) * 0.4 : 0;
    cuerpo.scale.setScalar(tiron > 0 ? 0.85 + rnd() * 0.35 : 1);
    return tiron > 0;
  };

  return {
    grupo,
    // Corre: cada IA a su ritmo, inclinada hacia delante, con los brazos estirados hacia ti; las cabezas tiemblan.
    // Devuelve true en los fotogramas rotos.
    animar(fase, rnd) {
      for (const ia of ias) {
        const f = fase + ia.fase;
        ia.torso.rotation.x = 0.45 + Math.sin(f * 2) * 0.08;
        for (const p of ia.piernas) {
          const u = Math.sin(f + (p.s > 0 ? Math.PI : 0));
          p.muslo.rotation.x = -0.6 * u - 0.2;
          p.rodilla.rotation.x = 0.4 + Math.max(0, u) * 1.0;
        }
        for (const b of ia.brazos) {
          b.hombro.rotation.x = -1.5 + Math.sin(f * 1.3 + b.s) * 0.35 + (rnd() - 0.5) * 0.15;
          b.hombro.rotation.z = b.s * 0.25;
          b.codo.rotation.x = -0.2 + Math.max(0, Math.sin(f + b.s)) * 0.4;
        }
        ia.cabeza.rotation.set((rnd() - 0.5) * 0.3, (rnd() - 0.5) * 0.5, (rnd() - 0.5) * 0.6);
        ia.cuello.rotation.x = -0.5;
      }
      cuerpo.position.y = Math.abs(Math.sin(fase * 2)) * 0.05;
      return glitch(rnd);
    },
    // Una pose distinta para cada aparición de la escena de muerte (k = 0, 1, 2…; 'final' = encima de ti):
    // cada IA en una postura diferente, todas con los brazos hacia ti y las cabezas en ángulos imposibles.
    posar(k, rnd) {
      const r = createRng(500 + (k === 'final' ? 99 : k) * 13);
      const final = k === 'final';
      for (const ia of ias) {
        ia.torso.rotation.set(final ? 0.6 : 0.2 + r() * 0.7, (r() - 0.5) * 0.6, (r() - 0.5) * 0.5);
        for (const p of ia.piernas) {
          p.muslo.rotation.x = -0.3 - r() * 0.9;
          p.rodilla.rotation.x = 0.3 + r() * 1.4;
        }
        for (const b of ia.brazos) {
          b.hombro.rotation.set(final ? -1.7 : -0.8 - r() * 1.2, 0, b.s * (0.2 + r() * 0.8));
          b.codo.rotation.x = final ? -0.1 : -r() * 1.2;
        }
        ia.cuello.rotation.x = final ? -0.7 : -0.3 - r() * 0.6;
        ia.cabeza.rotation.set((r() - 0.5) * 0.6, (r() - 0.5) * 1.0, final ? (r() - 0.5) * 0.6 : (r() - 0.5) * 2.6);
      }
      cuerpo.position.y = 0;
      return glitch(rnd);
    },
  };
}
