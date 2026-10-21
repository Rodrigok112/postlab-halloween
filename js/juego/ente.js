// El ente: silueta low-poly de unos 2,9 m, muy delgada, brazos larguísimos, cabeza alargada y dos ojos rojos.
// Pivota en la cadera: agacharse (para pasar por la puerta de 2,1 m) es inclinar la parte de arriba.

import { THREE, materialPS1, materialBrillo } from './ps1.js';

const CADERA = 1.3;

export function crearEnte() {
  const piel = materialPS1({ color: 0x0b0909 });
  const ojo = materialBrillo({ color: 0xff1a1a, fog: false });
  const grupo = new THREE.Group();

  const pierna = (x) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.08, CADERA, 0.08), piel);
    m.position.set(x, CADERA / 2, 0);
    return m;
  };
  grupo.add(pierna(-0.07), pierna(0.07));

  const arriba = new THREE.Group();
  arriba.position.y = CADERA;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.9, 0.16), piel);
  torso.position.y = 0.45;
  const cuello = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.26, 0.06), piel);
  cuello.position.y = 1.03;
  const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 5), piel);
  cabeza.scale.set(1, 1.9, 1.05);
  cabeza.position.y = 1.38;
  cabeza.rotation.z = -0.1;
  const ojoIzq = new THREE.Mesh(new THREE.SphereGeometry(0.025, 5, 4), ojo);
  const ojoDer = ojoIzq.clone();
  ojoIzq.position.set(-0.05, 1.41, 0.125);
  ojoDer.position.set(0.05, 1.4, 0.125);
  const brazo = (x) => {
    const hombro = new THREE.Group();
    hombro.position.set(x, 0.86, 0);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.45, 0.05), piel);
    m.position.y = -0.72;
    hombro.add(m);
    hombro.rotation.z = x > 0 ? -0.06 : 0.06;
    return hombro;
  };
  const brazoIzq = brazo(-0.16);
  const brazoDer = brazo(0.16);
  arriba.add(torso, cuello, cabeza, ojoIzq, ojoDer, brazoIzq, brazoDer);
  grupo.add(arriba);

  // Un poco de luz roja propia para que los ojos «iluminen» lo que tienen delante.
  const brillo = new THREE.PointLight(0xff1010, 0.6, 1.6, 1);
  brillo.position.set(0, 1.4, 0.25);
  arriba.add(brillo);

  return {
    grupo,
    cabeza,
    // rad: 0 erguido; ~1,05 para pasar por la puerta; ~0,7 dentro de la habitación (techo de 2,6 m).
    agacharse(rad) { arriba.rotation.x = rad; },
    // Balanceo de brazos al andar (fase en radianes).
    andar(fase) {
      brazoIzq.rotation.x = Math.sin(fase) * 0.25;
      brazoDer.rotation.x = -Math.sin(fase) * 0.25;
    },
  };
}
