// La oficina del croquis: 4 × 3,3 m, techo de 2,6 m. x a la derecha, y arriba, z hacia la cámara.
// Pared del fondo en z = -1,65 (escritorio pegado), puerta del ente en x = +2, salida al pasillo en x = -2.

import { THREE, materialPS1, materialBrillo } from './ps1.js';
import * as tex from './texturas.js';

const ANCHO = 4;
const FONDO = 3.3;
const ALTO = 2.6;
const PUERTA = { z0: -0.1, z1: 0.8, alto: 2.1 };

export const POSES = {
  sentado: { pos: [0, 1.15, 0.02], mira: [0, 0.99, -1.15] },
  dePie: { pos: [0, 1.62, 0.1] },
  puertaDerecha: [2, 1.3, (PUERTA.z0 + PUERTA.z1) / 2],
  puertaIzquierda: [-2, 1.4, (PUERTA.z0 + PUERTA.z1) / 2],
};

function plano(w, h, material) {
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h, 2, 2), material);
}

function caja(w, h, d, material) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
}

// Pared lateral con el hueco de la puerta: dos tramos y el dintel.
function paredConPuerta(x, mirandoA, material) {
  const g = new THREE.Group();
  const tramo = (z0, z1, y0, y1) => {
    const m = plano(z1 - z0, y1 - y0, material);
    m.position.set(x, (y0 + y1) / 2, (z0 + z1) / 2);
    m.rotation.y = mirandoA;
    g.add(m);
  };
  tramo(-FONDO / 2, PUERTA.z0, 0, ALTO);
  tramo(PUERTA.z1, FONDO / 2, 0, ALTO);
  tramo(PUERTA.z0, PUERTA.z1, PUERTA.alto, ALTO);
  return g;
}

// Puerta con bisagra en z0: devuelve el pivote (rotar en y para abrir).
function puerta(x, signo, material) {
  const pivote = new THREE.Group();
  pivote.position.set(x, 0, PUERTA.z0);
  const hoja = caja(0.05, PUERTA.alto, PUERTA.z1 - PUERTA.z0, material);
  hoja.position.set(0, PUERTA.alto / 2, (PUERTA.z1 - PUERTA.z0) / 2);
  pivote.add(hoja);
  pivote.userData.signo = signo;
  return pivote;
}

export function crearHabitacion(rng) {
  const grupo = new THREE.Group();
  const papel = materialPS1({ map: tex.papelOficina(rng, [3, 2]) });
  const papelLado = materialPS1({ map: tex.papelOficina(rng, [2.5, 2]) });
  const suelo = materialPS1({ map: tex.moqueta(rng, '#5a4a2c', [4, 3]) });
  const techoM = materialPS1({ map: tex.techo([4, 3]) });
  const madera = materialPS1({ map: tex.madera(rng) });
  const mueble = materialPS1({ color: 0x6e5a3a });
  const plastico = materialPS1({ color: 0xcfc8b0 });
  const silla = materialPS1({ color: 0x38475a });

  // Paredes, suelo y techo.
  const fondo = plano(ANCHO, ALTO, papel);
  fondo.position.set(0, ALTO / 2, -FONDO / 2);
  const frente = plano(ANCHO, ALTO, papel);
  frente.position.set(0, ALTO / 2, FONDO / 2);
  frente.rotation.y = Math.PI;
  const piso = plano(ANCHO, FONDO, suelo);
  piso.rotation.x = -Math.PI / 2;
  const cielo = plano(ANCHO, FONDO, techoM);
  cielo.rotation.x = Math.PI / 2;
  cielo.position.y = ALTO;
  grupo.add(fondo, frente, piso, cielo,
    paredConPuerta(ANCHO / 2, -Math.PI / 2, papelLado),
    paredConPuerta(-ANCHO / 2, Math.PI / 2, papelLado));

  // Escritorio pegado a la pared, CRT y silla.
  const mesa = caja(1.6, 0.05, 0.75, mueble);
  mesa.position.set(0, 0.74, -FONDO / 2 + 0.375);
  grupo.add(mesa);
  for (const [px, pz] of [[-0.75, -1.6], [0.75, -1.6], [-0.75, -0.95], [0.75, -0.95]]) {
    const pata = caja(0.05, 0.72, 0.05, mueble);
    pata.position.set(px, 0.36, pz);
    grupo.add(pata);
  }
  const crt = caja(0.44, 0.4, 0.42, plastico);
  crt.position.set(0, 0.98, -1.37);
  const peana = caja(0.2, 0.04, 0.2, plastico);
  peana.position.set(0, 0.78, -1.37);
  const matPantalla = materialBrillo({ map: tex.pantalla('QUIERO\nTU VIDA') });
  const vidrio = plano(0.34, 0.26, matPantalla);
  vidrio.position.set(0, 0.99, -1.37 + 0.212);
  const asiento = caja(0.45, 0.06, 0.45, silla);
  asiento.position.set(0, 0.47, 0.1);
  const respaldo = caja(0.45, 0.5, 0.05, silla);
  respaldo.position.set(0, 0.75, 0.33);
  grupo.add(crt, peana, vidrio, asiento, respaldo);

  // Pared del fondo: corcho, reloj parado, ventana con persiana y papeles.
  const enPared = (w, h, material, x, y) => {
    const m = plano(w, h, material);
    m.position.set(x, y, -FONDO / 2 + 0.01);
    grupo.add(m);
    return m;
  };
  enPared(0.5, 0.62, materialPS1({ map: tex.corcho(rng) }), -1.1, 1.35);
  const reloj = new THREE.Mesh(new THREE.CircleGeometry(0.16, 10), materialPS1({ color: 0xd8d2bc }));
  reloj.position.set(-1.3, 2.05, -FONDO / 2 + 0.01);
  grupo.add(reloj);
  enPared(0.6, 0.8, materialBrillo({ map: tex.persiana(), color: 0x8899aa }), 1.15, 1.75);
  enPared(0.34, 0.22, materialPS1({ map: tex.papelEscrito('ESCAPA', '#9e0b12') }), 0.75, 1.32);
  enPared(0.3, 0.2, materialPS1({ map: tex.papelEscrito('no deberías\nseguir aquí') }), 1.3, 1.16);
  enPared(0.28, 0.16, materialPS1({ map: tex.papelEscrito('ya está\ndentro') }), -1.3, 1.78);
  enPared(0.22, 0.14, materialPS1({ map: tex.papelEscrito('no respondas') }), -0.7, 1.05);

  // Puertas: la derecha cerrada (por ella entra el ente); la izquierda entreabierta, con luz amarilla detrás.
  const puertaDerecha = puerta(ANCHO / 2 - 0.03, 1, madera);
  const puertaIzquierda = puerta(-ANCHO / 2 + 0.03, -1, madera);
  puertaIzquierda.rotation.y = -0.5;
  const resplandor = plano(1.2, 2.2, materialBrillo({ color: 0x4a4118 }));
  resplandor.position.set(-ANCHO / 2 - 1.2, 1.1, (PUERTA.z0 + PUERTA.z1) / 2);
  resplandor.rotation.y = Math.PI / 2;
  grupo.add(puertaDerecha, puertaIzquierda, resplandor);

  // Luz: fluorescente frío en el techo, poca luz ambiente y el brillo rojo de la pantalla.
  const tubo = caja(1.0, 0.04, 0.18, materialBrillo({ color: 0xf4f6ff }));
  tubo.position.set(0, ALTO - 0.03, -0.2);
  const fluorescente = new THREE.PointLight(0xe6eeff, 6, 9, 1);
  fluorescente.position.set(0, ALTO - 0.15, -0.2);
  const ambiente = new THREE.AmbientLight(0x404452, 0.6);
  const brilloPantalla = new THREE.PointLight(0xff2020, 1.2, 2.5, 1);
  brilloPantalla.position.set(0, 1.0, -0.9);
  grupo.add(tubo, fluorescente, ambiente, brilloPantalla);

  return {
    grupo,
    puertaDerecha,
    puertaIzquierda,
    // null = pantalla apagada.
    setPantalla(texto) {
      matPantalla.map.dispose();
      matPantalla.map = tex.pantalla(texto);
      matPantalla.needsUpdate = true;
      brilloPantalla.intensity = texto ? 1.2 : 0;
    },
    setLuz(encendida) {
      fluorescente.intensity = encendida ? 6 : 0;
      tubo.material.color.set(encendida ? 0xf4f6ff : 0x222428);
    },
  };
}
