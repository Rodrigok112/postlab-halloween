// La consulta del psicólogo (final del psicólogo, 23/10), con el mismo estilo PS1: paredes empapeladas con
// zócalo de madera, alfombra, sofá donde estás sentado, sillón a tu derecha, mesita con cenicero, lámpara de pie,
// librería, diploma, reloj, persiana y una planta. Se construye lejos de todo (centro en (0, 0, −300)).
// vestir() le pone al ente un sombrero y un cigarrillo con humo.

import { THREE, materialPS1, materialBrillo, luces } from './ps1.js';
import * as tex from './texturas.js';

export const CENTRO = new THREE.Vector3(0, 0, -300);
// Dónde estás sentado (cámara) y dónde está el sillón del ente, relativos al centro.
export const SOFA = new THREE.Vector3(0, 1.05, 0.6);
export const SILLON = new THREE.Vector3(1.55, 0, -0.95);

function caja(w, h, d, m) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
}

export function crearConsulta(rng) {
  const grupo = new THREE.Group();
  grupo.position.copy(CENTRO);
  const madera = materialPS1({ map: tex.madera(rng), color: 0xb08860 });
  const pared = materialPS1({ map: tex.papelOficina(rng, [3, 2]), color: 0xd8c0a0 });
  const alfombra = materialPS1({ map: tex.moqueta(rng, '#6a2a22', [3, 3]) });
  const techo = materialPS1({ map: tex.techoSucio(rng, [2, 2]) });
  const cuero = materialPS1({ map: tex.piel(rng, '#4a2a1c'), color: 0xb07a5a });
  const tela = materialPS1({ map: tex.moqueta(rng, '#4a5a3a', [1, 1]) });

  // Habitación de 5 × 5 × 2,7.
  const plano = (w, h, m) => new THREE.Mesh(new THREE.PlaneGeometry(w, h, Math.round(w / 0.5), Math.round(h / 0.5)), m);
  const suelo = plano(5, 5, alfombra);
  suelo.rotation.x = -Math.PI / 2;
  const cielo = plano(5, 5, techo);
  cielo.rotation.x = Math.PI / 2;
  cielo.position.y = 2.7;
  grupo.add(suelo, cielo);
  for (const [x, z, ry] of [[0, -2.5, 0], [0, 2.5, Math.PI], [-2.5, 0, Math.PI / 2], [2.5, 0, -Math.PI / 2]]) {
    const m = plano(5, 2.7, pared);
    m.position.set(x, 1.35, z);
    m.rotation.y = ry;
    grupo.add(m);
    const zocalo = caja(5, 0.7, 0.03, madera);
    zocalo.position.set(x * 0.994, 0.35, z * 0.994);
    zocalo.rotation.y = ry;
    grupo.add(zocalo);
  }

  // Sofá (tú) mirando al fondo.
  const asiento = caja(1.8, 0.4, 0.8, cuero);
  asiento.position.set(0, 0.2, SOFA.z + 0.1);
  const respaldo = caja(1.8, 0.6, 0.2, cuero);
  respaldo.position.set(0, 0.6, SOFA.z + 0.5);
  grupo.add(asiento, respaldo);
  for (const s of [-1, 1]) {
    const brazo = caja(0.2, 0.55, 0.8, cuero);
    brazo.position.set(s * 0.95, 0.35, SOFA.z + 0.1);
    grupo.add(brazo);
  }

  // Sillón del ente, a tu derecha, girado hacia ti.
  const sillon = new THREE.Group();
  sillon.position.copy(SILLON);
  sillon.rotation.y = Math.atan2(SOFA.x - SILLON.x, SOFA.z - SILLON.z); // mirando al sofá (su frente es +z)
  const sa = caja(0.9, 0.5, 0.9, tela);
  sa.position.y = 0.25;
  const sr = caja(0.9, 0.9, 0.2, tela);
  sr.position.set(0, 0.7, -0.45);
  sillon.add(sa, sr);
  for (const s of [-1, 1]) {
    const b = caja(0.15, 0.6, 0.9, tela);
    b.position.set(s * 0.52, 0.4, 0);
    sillon.add(b);
  }
  grupo.add(sillon);

  // Mesita con cenicero, entre los dos.
  const mesa = caja(0.6, 0.05, 0.6, madera);
  mesa.position.set(1.15, 0.5, 0.05);
  const pata = caja(0.05, 0.5, 0.05, madera);
  pata.position.set(1.15, 0.25, 0.05);
  const cenicero = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.03, 8), materialPS1({ color: 0x6a6a70 }));
  cenicero.position.set(1.15, 0.54, 0.05);
  grupo.add(mesa, pata, cenicero);

  // Lámpara de pie, cálida.
  const pie = caja(0.04, 1.6, 0.04, materialPS1({ color: 0x2a2620 }));
  pie.position.set(-1.6, 0.8, -1.6);
  const pantalla = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 0.35, 8, 1, true),
    materialBrillo({ color: 0xf0c890, side: THREE.DoubleSide }));
  pantalla.position.set(-1.6, 1.7, -1.6);
  grupo.add(pie, pantalla);

  // Librería en el fondo con libros de colores.
  const libreria = caja(1.6, 2.0, 0.35, madera);
  libreria.position.set(0.6, 1.0, -2.3);
  grupo.add(libreria);
  const colores = [0x6a2a22, 0x2a3a5a, 0x3a5a2a, 0x8a6a2a, 0x4a2a4a, 0x2a2a2a];
  for (let fila = 0; fila < 4; fila++) {
    let x = -0.15;
    while (x < 1.3) {
      const w = 0.04 + rng() * 0.05;
      const h = 0.25 + rng() * 0.15;
      const libro = caja(w, h, 0.25, materialPS1({ color: colores[Math.floor(rng() * colores.length)] }));
      libro.position.set(x + w / 2, 0.25 + fila * 0.48 + h / 2, -2.12);
      grupo.add(libro);
      x += w + 0.005;
    }
  }

  // Diploma, reloj, persiana y planta.
  const enPared = (w, h, m, x, y) => { const q = plano(w, h, m); q.position.set(x, y, -2.49); grupo.add(q); };
  enPared(0.5, 0.38, materialPS1({ map: tex.papelEscrito('DIPLOMA\npsicología') }), -1.0, 1.7);
  const reloj = new THREE.Mesh(new THREE.CircleGeometry(0.16, 10), materialPS1({ color: 0xe8e0c8 }));
  reloj.position.set(-1.0, 2.25, -2.48);
  grupo.add(reloj);
  const persiana = plano(0.8, 1.0, materialBrillo({ map: tex.persiana(), color: 0x8090a0 }));
  persiana.position.set(-2.48, 1.6, -0.6);
  persiana.rotation.y = Math.PI / 2;
  grupo.add(persiana);
  const maceta = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.3, 8), materialPS1({ color: 0x8a5a3a }));
  maceta.position.set(-2.0, 0.15, -2.0);
  const planta = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 0), materialPS1({ map: tex.hojas(rng) }));
  planta.position.set(-2.0, 0.65, -2.0);
  grupo.add(maceta, planta);

  return {
    grupo,
    // Luz de consulta: cálida y tenue, de la lámpara de pie.
    encender(escena) {
      luces.apagarTodas();
      luces.ambiente(0x3a2a20, 0.9);
      luces.punto(0, [CENTRO.x - 1.6, 1.8, CENTRO.z - 1.6], 0xffd8a0, 2.2, 7);
      luces.punto(1, [CENTRO.x + 1.0, 2.4, CENTRO.z + 0.5], 0xfff0d8, 0.8, 5);
      escena.fog.color.set(0x000000);
      escena.fog.near = 6;
      escena.fog.far = 14;
      escena.background.set(0x000000);
    },
  };
}

// Sombrero y cigarrillo para el ente. Devuelve tic(t, rnd) para que el humo suba y la brasa parpadee.
export function vestir(ente, camara, escena) {
  const negro = materialPS1({ color: 0x1a1816 });
  const sombrero = new THREE.Group();
  const copa = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.15, 8), negro);
  copa.position.y = 0.075;
  const ala = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.015, 10), negro);
  const cinta = new THREE.Mesh(new THREE.CylinderGeometry(0.142, 0.142, 0.03, 8), materialPS1({ color: 0x5a1a14 }));
  cinta.position.y = 0.025;
  sombrero.add(copa, ala, cinta);
  sombrero.position.set(0, 0.5, -0.02);
  sombrero.rotation.z = -0.15;
  ente.cabeza.add(sombrero);

  const cigarro = new THREE.Group();
  cigarro.position.set(0, -0.11, 0.03);
  cigarro.rotation.x = Math.PI / 2;
  const papel = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.09, 5), materialPS1({ color: 0xeae4d4 }));
  const brasa = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.012, 5), materialBrillo({ color: 0xff6a1a, fog: false }));
  brasa.position.y = 0.05;
  cigarro.add(papel, brasa);
  ente.articulaciones.manoD.add(cigarro);

  const humo = [];
  for (let i = 0; i < 6; i++) {
    const h = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.07),
      materialBrillo({ color: 0x9a9a9a, transparent: true, opacity: 0.4, depthWrite: false }));
    escena.add(h);
    humo.push({ h, fase: i / 6 });
  }
  const punta = new THREE.Vector3();
  return {
    tic(t, rnd) {
      brasa.material.color.setHex(rnd() < 0.3 ? 0xffa040 : 0xff5a10);
      brasa.getWorldPosition(punta);
      for (const p of humo) {
        const u = (t * 0.35 + p.fase) % 1;
        p.h.position.set(punta.x + Math.sin(u * 7 + p.fase * 9) * 0.05, punta.y + u * 0.6, punta.z);
        p.h.scale.setScalar(0.6 + u * 2.2);
        p.h.material.opacity = 0.45 * (1 - u);
        p.h.lookAt(camara.position);
      }
    },
  };
}
