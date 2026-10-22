// El segundo monstruo: se arrastra con seis extremidades como una araña, torso largo y cabeza del revés
// con varios ojos rojos. Glitch: sus vértices saltan mucho más que los del resto (rejilla gruesa) y de vez
// en cuando salta de pose de golpe. Mira y avanza hacia +z local.

import { THREE, materialPS1, materialBrillo } from './ps1.js';
import * as tex from './texturas.js';
import { createRng } from '../glitch.js';

const REJILLA = 0.3; // < 1: temblor exagerado
const POSES_POR_CICLO = 4;

export function crearArana() {
  const rng = createRng(6006);
  const piel = materialPS1({ map: tex.piel(rng, '#24201f'), rejilla: REJILLA });
  const pecho = materialPS1({ map: tex.costillas(rng), rejilla: REJILLA });
  const diente = materialPS1({ color: 0xb8ad92, rejilla: REJILLA });
  const negro = materialBrillo({ color: 0x120103, rejilla: REJILLA });
  const ojo = materialBrillo({ color: 0xff1a1a, fog: false, rejilla: REJILLA });
  const grupo = new THREE.Group();
  const cuerpo = new THREE.Group();
  cuerpo.position.y = 0.45;
  grupo.add(cuerpo);

  // Torso largo, tumbado a lo largo de z, con la espalda arqueada.
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.13, 1.4, 7, 4), pecho);
  torso.rotation.x = Math.PI / 2;
  torso.scale.x = 1.15;
  cuerpo.add(torso);
  for (let i = 0; i < 12; i++) {
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.05), piel);
    v.position.set(0, 0.15 + Math.sin((i / 11) * Math.PI) * 0.04, -0.62 + i * 0.11);
    cuerpo.add(v);
  }

  // Seis extremidades: hombro alto, codo arriba y la punta clavada en el suelo.
  const patas = [];
  for (const z of [0.5, 0, -0.5]) {
    for (const s of [-1, 1]) {
      const raiz = new THREE.Group();
      raiz.position.set(s * 0.15, 0, z);
      cuerpo.add(raiz);
      const alto = new THREE.Group();
      raiz.add(alto);
      const a = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.7, 5), piel);
      a.position.y = 0.35;
      alto.add(a);
      alto.rotation.z = -s * 0.75;
      const bajo = new THREE.Group();
      bajo.position.y = 0.7;
      alto.add(bajo);
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.012, 1.0, 5), piel);
      b.position.y = -0.5;
      bajo.add(b);
      bajo.rotation.z = s * 1.15;
      const una = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.08, 3), negro);
      una.position.y = -1.02;
      una.rotation.x = Math.PI;
      bajo.add(una);
      patas.push({ alto, bajo, s, fase: (z === 0 ? 0 : Math.PI) + (s > 0 ? Math.PI : 0) });
    }
  }

  // Cabeza del revés al frente: la boca arriba, los ojos abajo.
  const cabeza = new THREE.Group();
  cabeza.position.set(0, 0.05, 0.85);
  cabeza.rotation.z = Math.PI;
  cuerpo.add(cabeza);
  const craneo = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), piel);
  craneo.scale.set(1, 1.3, 1.1);
  cabeza.add(craneo);
  const fauces = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.1), negro);
  fauces.position.set(0, -0.1, 0.15);
  cabeza.add(fauces);
  for (let i = 0; i < 8; i++) {
    for (const lado of [-1, 1]) {
      const d = new THREE.Mesh(new THREE.ConeGeometry(0.009, 0.045, 3), diente);
      d.position.set((i - 3.5) * 0.019, -0.1 + lado * 0.045, 0.155);
      d.rotation.x = lado > 0 ? Math.PI : 0;
      cabeza.add(d);
    }
  }
  const ojos = [];
  for (const [x, y] of [[-0.06, 0.07], [0.06, 0.07], [-0.1, 0.12], [0.1, 0.12], [-0.03, 0.15], [0.03, 0.15]]) {
    const o = new THREE.Mesh(new THREE.SphereGeometry(0.016, 4, 3), ojo);
    o.position.set(x, y, 0.15);
    cabeza.add(o);
    ojos.push(o);
  }

  const paso = (fase) => Math.floor((fase * POSES_POR_CICLO) / (Math.PI * 2)) * ((Math.PI * 2) / POSES_POR_CICLO);
  let tiron = 0;

  return {
    grupo,
    cabeza,
    // Gateo a saltos más el glitch: temblor de patas y, a veces, un salto de pose de un fotograma.
    animar(fase, rnd) {
      const f = paso(fase);
      for (const p of patas) {
        const u = Math.sin(f + p.fase);
        p.alto.rotation.z = -p.s * (0.75 + 0.25 * Math.max(0, u)) + (rnd() - 0.5) * 0.15;
        p.alto.rotation.x = 0.35 * u;
        p.bajo.rotation.z = p.s * (1.15 - 0.2 * Math.max(0, u));
      }
      cabeza.rotation.y = (rnd() - 0.5) * 0.3;
      if (tiron > 0) tiron--;
      else if (rnd() < 0.06) tiron = 2;
      cuerpo.position.x = tiron > 0 ? (rnd() - 0.5) * 0.5 : 0;
      cuerpo.scale.setScalar(tiron > 0 ? 0.85 + rnd() * 0.4 : 1);
      cuerpo.rotation.z = tiron > 0 ? (rnd() - 0.5) * 0.8 : 0;
    },
  };
}
