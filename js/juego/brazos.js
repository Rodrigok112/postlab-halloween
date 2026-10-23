// Brazos del pasillo (la B, 23/10): salen de un boquete en la pared, el suelo o el techo, se estiran hacia ti y
// te agarran. Chapa y piel cosida, codo de anillo y dedos larguísimos de tres falanges.
// El brazo sale hacia +z local desde el plano de la pared (z = 0); quien lo coloca lo orienta.
// salir(u): 0 metido en la pared, 1 estirado del todo. agarrar(u): 0 abierta, 1 cerrada.

import { THREE, materialPS1, materialBrillo } from './ps1.js';
import * as tex from './texturas.js';
import { createRng } from '../glitch.js';

const LARGO_BRAZO = 0.55;
const LARGO_ANTE = 0.5;

function barra(l, r0, r1, material) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, l, 5, 1), material);
  m.position.y = -l / 2;
  return m;
}

// Materiales compartidos por todos los brazos (salen muchos a la vez en la salida del camino izquierdo).
let comunes = null;
function materiales() {
  if (comunes) return comunes;
  const rng = createRng(77);
  comunes = {
    metal: materialPS1({ map: tex.chapa(rng) }),
    oscuroM: materialPS1({ color: 0x232426 }),
    piel: materialPS1({ map: tex.pielHumana(rng), side: THREE.DoubleSide }),
    boquete: materialPS1({ map: tex.agujeroPared(rng), transparent: true, alphaTest: 0.5, depthWrite: false }),
    negro: materialBrillo({ color: 0x000000 }),
  };
  return comunes;
}

export function crearBrazoPared(semilla = 77) {
  const rng = createRng(semilla);
  const { metal, oscuroM, piel, boquete, negro } = materiales();
  const grupo = new THREE.Group();

  // El boquete, pegado a la superficie.
  const hueco = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), boquete);
  hueco.position.z = 0.012;
  hueco.renderOrder = 1;
  grupo.add(hueco);
  // Negro detrás del boquete, para que no se vea la pared por dentro.
  const fondo = new THREE.Mesh(new THREE.CircleGeometry(0.17, 8), negro);
  fondo.position.z = 0.006;
  grupo.add(fondo);

  // El brazo: todo se monta colgando hacia −y y se tumba hacia +z.
  const raiz = new THREE.Group();
  grupo.add(raiz);
  const eje = new THREE.Group();
  eje.rotation.x = -Math.PI / 2;
  raiz.add(eje);
  const brazo = new THREE.Group();
  brazo.add(barra(LARGO_BRAZO, 0.04, 0.034, metal));
  const manga = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.35, 6, 1, true, rng() * 6, 4), piel);
  manga.position.y = -0.22;
  brazo.add(manga);
  eje.add(brazo);
  const codo = new THREE.Group();
  codo.position.y = -LARGO_BRAZO;
  const anilloCodo = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.013, 4, 6), oscuroM);
  anilloCodo.rotation.y = Math.PI / 2;
  codo.add(anilloCodo, barra(LARGO_ANTE, 0.032, 0.024, rng() < 0.5 ? metal : piel));
  brazo.add(codo);
  const mano = new THREE.Group();
  mano.position.y = -LARGO_ANTE;
  codo.add(mano);
  const palma = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, 0.028), piel);
  palma.position.y = -0.05;
  mano.add(palma);
  const dedos = [];
  for (let f = 0; f < 5; f++) {
    const pulgar = f === 4;
    const largos = pulgar ? [0.08, 0.07] : [0.13, 0.12, 0.1];
    const falanges = [];
    let padre = mano;
    largos.forEach((l, n) => {
      const g = new THREE.Group();
      if (n === 0) {
        g.position.set(pulgar ? 0.05 : (f - 1.5) * 0.022, pulgar ? -0.03 : -0.1, 0);
        g.rotation.z = pulgar ? -0.8 : (f - 1.5) * 0.15;
      } else g.position.y = -largos[n - 1];
      g.add(barra(l, 0.009, 0.007, n % 2 ? metal : oscuroM));
      padre.add(g);
      falanges.push(g);
      padre = g;
    });
    const una = new THREE.Mesh(new THREE.ConeGeometry(0.007, 0.05, 3), oscuroM);
    una.position.y = -largos.at(-1) - 0.02;
    una.rotation.x = Math.PI;
    padre.add(una);
    dedos.push(falanges);
  }

  const agarrar = (u) => {
    for (const falanges of dedos) falanges.forEach((g, n) => { g.rotation.x = u * (0.5 + n * 0.4); });
  };
  agarrar(0.2);
  return {
    grupo,
    // Sale de la pared y se despliega: el hombro empuja, el codo se abre y la mano se tiende hacia ti.
    salir(u) {
      const k = Math.max(0, Math.min(1, u));
      raiz.position.z = -(LARGO_BRAZO + LARGO_ANTE + 0.25) * (1 - k);
      brazo.rotation.x = 0.6 * (1 - k) - 0.2;
      codo.rotation.x = -1.4 * (1 - k) + 0.3 * Math.sin(k * Math.PI);
    },
    agarrar,
    // Temblor de 12 fps.
    tic(rnd) { mano.rotation.z = (rnd() - 0.5) * 0.4; brazo.rotation.z = (rnd() - 0.5) * 0.15; },
  };
}
