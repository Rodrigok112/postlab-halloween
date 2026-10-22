// El segundo monstruo, en dos variantes (máquina que imita algo vivo, con piel cosida y glitch):
// - 'a' (agujas): espina de radiador tumbada y seis patas larguísimas de tres tramos, con las rodillas muy
//   por encima del cuerpo y puntas de aguja.
// - 'b' (brazos): costillar del revés y seis patas que son brazos humanos (chapa y piel) con las manos
//   apoyadas en el suelo; la cabeza cuelga debajo.
// Las dos: cabeza del revés con cara de piel, LED rojos y dientes. Sus vértices saltan más que los del resto
// (rejilla gruesa) y a veces salta de pose. Mira y avanza hacia +z local. animar() se llama a 12 fps.

import { THREE, materialPS1, materialBrillo } from './ps1.js';
import * as tex from './texturas.js';
import { createRng } from '../glitch.js';

const REJILLA = 0.3; // < 1: temblor exagerado

export function crearArana(variante = 'a') {
  const rng = createRng(variante === 'a' ? 6006 : 6116);
  const metal = materialPS1({ map: tex.chapa(rng), rejilla: REJILLA });
  const oscuroM = materialPS1({ color: 0x232426, rejilla: REJILLA });
  const piel = materialPS1({ map: tex.pielHumana(rng), side: THREE.DoubleSide, rejilla: REJILLA });
  const cara = materialPS1({ map: tex.mascara(rng), side: THREE.DoubleSide, rejilla: REJILLA });
  const pecho = materialPS1({ map: tex.costillas(rng), rejilla: REJILLA });
  const diente = materialPS1({ color: 0xb8ad92, rejilla: REJILLA });
  const ojo = materialBrillo({ color: 0xff1a1a, fog: false, rejilla: REJILLA });
  const grupo = new THREE.Group();
  const cuerpo = new THREE.Group();
  grupo.add(cuerpo);
  grupo.scale.setScalar(1.2); // que llene el pasillo

  // Barra de largo l que sale hacia +y (sube) o hacia −y (cuelga) desde el origen del grupo.
  const tramo = (padre, l, r0, r1, material, sube) => {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, l, 5, 1), material);
    m.position.y = sube ? l / 2 : -l / 2;
    g.add(m);
    padre.add(g);
    return g;
  };

  const patas = [];
  // Pata de tres tramos: sube y se abre (L1), baja abierta (L2) y casi vertical hasta el suelo (L3).
  // giro: hacia delante (+) o hacia atrás (−). Ángulos totales elegidos para que la punta toque el suelo.
  const pata = (z, s, giro, L, conPiel, final) => {
    const raiz = new THREE.Group();
    raiz.position.set(s * 0.12, 0, z);
    raiz.rotation.y = -s * giro;
    cuerpo.add(raiz);
    const alto = tramo(raiz, L[0], 0.035, 0.028, metal, true);
    alto.rotation.z = -s * 0.7;
    if (conPiel) {
      const manga = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, L[0] * 0.6, 6, 1, true, rng() * 6, 3.5), piel);
      manga.position.y = L[0] * 0.4;
      alto.add(manga);
    }
    const rodilla = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 4, 6), oscuroM);
    rodilla.position.y = L[0];
    alto.add(rodilla);
    const medio = tramo(alto, L[1], 0.028, 0.02, conPiel ? metal : oscuroM, false);
    medio.position.y = L[0];
    medio.rotation.z = s * 1.11;
    const bajo = tramo(medio, L[2], 0.02, 0.008, metal, false);
    bajo.position.y = -L[1];
    bajo.rotation.z = -s * 0.51;
    final(bajo, L[2], s);
    patas.push({ alto, medio, bajo, s, fase: patas.length % 2 ? Math.PI : 0 });
  };

  // Cabeza del revés con cara de piel, LED y dientes.
  const cabeza = new THREE.Group();
  cuerpo.add(cabeza);
  const craneo = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), metal);
  craneo.scale.set(1, 1.2, 1.05);
  const mascara = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.14, 0.26, 8, 2, true, -0.95, 1.9), cara);
  cabeza.add(craneo, mascara);
  for (const [x, y] of [[-0.05, -0.03], [0.05, -0.03], [-0.09, 0.02], [0.09, 0.02], [-0.03, 0.06], [0.03, 0.06]]) {
    const o = new THREE.Mesh(new THREE.SphereGeometry(0.015, 4, 3), ojo);
    o.position.set(x, y, 0.145);
    cabeza.add(o);
  }
  for (let i = 0; i < 8; i++) {
    for (const lado of [-1, 1]) {
      const d = new THREE.Mesh(new THREE.ConeGeometry(0.009, 0.03 + rng() * 0.03, 3), diente);
      d.position.set((i - 3.5) * 0.019, -0.13 + lado * 0.03, 0.13);
      d.rotation.x = lado > 0 ? Math.PI : 0;
      cabeza.add(d);
    }
  }
  cabeza.rotation.z = Math.PI; // del revés

  if (variante === 'a') {
    cuerpo.position.y = 0.55;
    // Espina de radiador: barra central con costillas de chapa y un parche de piel cosido encima.
    const eje = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 1.5, 6), oscuroM);
    eje.rotation.x = Math.PI / 2;
    cuerpo.add(eje);
    for (let i = 0; i < 11; i++) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.32 - Math.abs(i - 5) * 0.02, 0.02, 0.04), metal);
      c.position.set(0, 0.03, -0.65 + i * 0.13);
      cuerpo.add(c);
    }
    const parche = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.6, 6, 1, true, -1.2, 2.4), piel);
    parche.rotation.x = Math.PI / 2;
    parche.rotation.y = Math.PI;
    parche.position.set(0, 0.04, -0.1);
    cuerpo.add(parche);
    cabeza.position.set(0, 0.0, 0.85);
    const aguja = (bajo, L) => {
      const p = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.16, 3), oscuroM);
      p.position.y = -L - 0.06;
      p.rotation.x = Math.PI;
      bajo.add(p);
    };
    for (const [z, giro] of [[0.5, 0.75], [0, -0.9], [-0.5, -0.75]]) {
      for (const s of [-1, 1]) pata(z, s, giro, [0.75, 0.7, 0.5], false, aguja);
    }
  } else {
    cuerpo.position.y = 0.7;
    // Costillar del revés (las costillas abajo, la columna arriba) y piel colgando.
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 1.3, 7, 3), pecho);
    torso.rotation.x = Math.PI / 2;
    torso.rotation.y = Math.PI;
    torso.scale.x = 1.1;
    cuerpo.add(torso);
    const colgajo = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.2, 0.7, 6, 1, true, 2.2, 2.2), piel);
    colgajo.rotation.x = Math.PI / 2;
    colgajo.position.set(0, -0.02, 0.15);
    cuerpo.add(colgajo);
    // La cabeza cuelga por debajo de la parte delantera.
    cabeza.position.set(0, -0.32, 0.6);
    const cuello = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 5), oscuroM);
    cuello.position.set(0, -0.15, 0.6);
    cuerpo.add(cuello);
    // Mano apoyada al final de cada pata, con los dedos abiertos.
    const manoFinal = (bajo, L, s) => {
      const mano = new THREE.Group();
      mano.position.y = -L;
      mano.rotation.z = s * 0.1;
      bajo.add(mano);
      const palma = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.09), metal);
      mano.add(palma);
      for (let f = 0; f < 4; f++) {
        const d = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.13), f % 2 ? piel : oscuroM);
        d.position.set((f - 1.5) * 0.022, 0, 0.1);
        d.rotation.y = (f - 1.5) * 0.25;
        mano.add(d);
      }
    };
    for (const [z, giro] of [[0.45, 0.7], [0, -0.9], [-0.45, -0.7]]) {
      for (const s of [-1, 1]) pata(z, s, giro, [0.85, 0.8, 0.6], true, manoFinal);
    }
  }

  let tiron = 0;
  return {
    grupo,
    cabeza,
    // Gateo (fase en radianes, avanzada a 12 fps por quien llama) y glitch: temblor de patas y, a veces,
    // un salto de pose de un par de fotogramas.
    animar(fase, rnd) {
      for (const p of patas) {
        const u = Math.sin(fase + p.fase);
        p.alto.rotation.x = 0.35 * u + (rnd() - 0.5) * 0.12;
        p.alto.rotation.z = -p.s * (0.7 + 0.18 * Math.max(0, u));
        p.medio.rotation.z = p.s * (1.11 - 0.15 * Math.max(0, u));
      }
      cabeza.rotation.y = (rnd() - 0.5) * 0.4;
      if (tiron > 0) tiron--;
      else if (rnd() < 0.08) tiron = 2;
      cuerpo.position.x = tiron > 0 ? (rnd() - 0.5) * 0.5 : 0;
      cuerpo.scale.setScalar(tiron > 0 ? 0.85 + rnd() * 0.4 : 1);
      cuerpo.rotation.z = tiron > 0 ? (rnd() - 0.5) * 0.8 : 0;
      return tiron > 0;
    },
  };
}
