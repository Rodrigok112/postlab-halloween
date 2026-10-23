// El jardín del final bueno, con el mismo estilo PS1: césped, árboles de pocos polígonos, una valla blanca,
// flores, un columpio, cielo azul y sol. Se construye lejos de todo (centro en (0, 0, 300)) y la cámara salta
// allí al cruzar la puerta del fondo.

import { THREE, materialPS1, materialBrillo, luces } from './ps1.js';
import * as tex from './texturas.js';

export const CENTRO = new THREE.Vector3(0, 0, 300);
const CIELO = 0xa9d4ee;

export function crearJardin(rng) {
  const grupo = new THREE.Group();
  grupo.position.copy(CENTRO);
  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(60, 60, 24, 24), materialPS1({ map: tex.cesped(rng, [14, 14]) }));
  suelo.rotation.x = -Math.PI / 2;
  grupo.add(suelo);

  const corteza = materialPS1({ map: tex.madera(rng), color: 0x8a6a48 });
  const copa = materialPS1({ map: tex.hojas(rng) });
  const arbol = (x, z, alto) => {
    const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, alto * 0.45, 6), corteza);
    tronco.position.set(x, alto * 0.22, z);
    const c1 = new THREE.Mesh(new THREE.IcosahedronGeometry(alto * 0.32, 0), copa);
    c1.position.set(x, alto * 0.6, z);
    const c2 = new THREE.Mesh(new THREE.IcosahedronGeometry(alto * 0.22, 0), copa);
    c2.position.set(x + 0.3, alto * 0.82, z - 0.2);
    grupo.add(tronco, c1, c2);
  };
  for (const [x, z, h] of [[-6, -8, 4.5], [5, -10, 5.5], [9, -4, 4], [-10, -3, 5], [-3, -14, 6], [12, -13, 5], [-14, -11, 4.5]]) arbol(x, z, h);

  // Valla blanca al fondo.
  const blanco = materialPS1({ color: 0xe8e4d8 });
  for (let x = -14; x <= 14; x += 0.6) {
    const tabla = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.04), blanco);
    tabla.position.set(x, 0.45, -16);
    grupo.add(tabla);
  }
  for (const y of [0.3, 0.7]) {
    const barra = new THREE.Mesh(new THREE.BoxGeometry(28.2, 0.06, 0.05), blanco);
    barra.position.set(0, y, -16.03);
    grupo.add(barra);
  }

  // Flores.
  const colores = [0xe0473a, 0xf2d24a, 0xf4f0f0, 0xd77ad0];
  for (let i = 0; i < 70; i++) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), materialBrillo({ color: colores[i % colores.length] }));
    const r = 2 + rng() * 12;
    const a = rng() * Math.PI - Math.PI; // delante de la cámara
    f.position.set(Math.cos(a) * r, 0.1 + rng() * 0.1, Math.sin(a) * r);
    grupo.add(f);
  }

  // Un columpio en un árbol, quieto.
  const cuerda = materialPS1({ color: 0x6b5a3a });
  for (const x of [-0.35, 0.35]) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.02, 2.2, 0.02), cuerda);
    c.position.set(5 + x, 1.6, -9.2);
    grupo.add(c);
  }
  const asiento = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.25), corteza);
  asiento.position.set(5, 0.5, -9.2);
  grupo.add(asiento);

  // Sol.
  const sol = new THREE.Mesh(new THREE.SphereGeometry(2.2, 8, 6), materialBrillo({ color: 0xfff6c8, fog: false }));
  sol.position.set(18, 22, -40);
  grupo.add(sol);

  return {
    grupo,
    // Luz de día: ambiente clara, el sol y el cielo de fondo.
    encender(escena) {
      luces.apagarTodas();
      luces.ambiente(0xd8e8ff, 0.9);
      luces.punto(0, [CENTRO.x + 10, 15, CENTRO.z - 10], 0xfff1d0, 1.6, 60);
      escena.fog.color.set(CIELO);
      escena.fog.near = 12;
      escena.fog.far = 45;
      escena.background.set(CIELO);
    },
  };
}
