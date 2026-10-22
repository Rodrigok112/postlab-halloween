// La oficina del croquis: 4 × 3,3 m, techo de 2,6 m. x a la derecha, y arriba, z hacia la cámara.
// Pared del fondo en z = -1,65 (escritorio pegado), puerta del ente en x = +2, salida al pasillo en x = -2.
// Estética sucia (referencia del 22/10): pared en dos tonos con moho, baldosas, una bombilla en el techo,
// sangre y cartas por el suelo que dicen que corras. La puerta del ente puede tener un boquete.

import { THREE, materialPS1, materialBrillo, luces } from './ps1.js';
import * as tex from './texturas.js';

const ANCHO = 4;
const FONDO = 3.3;
const ALTO = 2.6;
const PUERTA = { z0: -0.1, z1: 0.8, alto: 2.1 };
const ZP = (PUERTA.z0 + PUERTA.z1) / 2;

// Boquete de la puerta derecha (en la textura, centro en u = 0,5, v = 1 − 18/64) en coordenadas del mundo.
export const BOQUETE = [ANCHO / 2, PUERTA.alto * (1 - 18 / 64), ZP];

export const POSES = {
  sentado: { pos: [0, 1.15, 0.02], mira: [0, 0.99, -1.15] },
  dePie: { pos: [0, 1.62, 0.1] },
  puertaDerecha: [2, 1.3, ZP],
  puertaIzquierda: [-2, 1.4, ZP],
};

// Luces de la habitación (huecos de luces.punto).
const BOMBILLA = [0, 2.3, -0.45];
const L_BOMBILLA = 0, L_PANTALLA = 1, L_PASILLO = 2, L_OJOS = 3;

// Plano subdividido cada medio metro (la luz por vértice y las texturas afines lo necesitan).
function plano(w, h, material) {
  const sw = Math.max(1, Math.round(w / 0.5));
  const sh = Math.max(1, Math.round(h / 0.5));
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h, sw, sh), material);
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

// Puerta con bisagra en z0: devuelve el pivote (rotar en y para abrir; + hacia dentro de la habitación
// en la izquierda, − en la derecha). caras: material de las dos caras anchas.
function puerta(x, caras, canto) {
  const pivote = new THREE.Group();
  pivote.position.set(x, 0, PUERTA.z0);
  const hoja = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, PUERTA.alto, PUERTA.z1 - PUERTA.z0, 1, 4, 2),
    [caras, caras, canto, canto, canto, canto],
  );
  hoja.position.set(0, PUERTA.alto / 2, (PUERTA.z1 - PUERTA.z0) / 2);
  pivote.add(hoja);
  return pivote;
}

// Calcomanía (sangre, carta) pegada a una superficie, un pelo por delante para que no parpadee.
function calco(w, h, material) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  m.renderOrder = 1;
  return m;
}

export function crearHabitacion(rng) {
  const grupo = new THREE.Group();
  const pared = materialPS1({ map: tex.paredSucia(rng, [ANCHO / 1.3, 1]) });
  const paredLado = materialPS1({ map: tex.paredSucia(rng, [FONDO / 1.3, 1]) });
  const suelo = materialPS1({ map: tex.baldosas(rng, [ANCHO / 1.3, FONDO / 1.3]) });
  const techoM = materialPS1({ map: tex.techoSucio(rng, [2, 1.6]) });
  const madera = materialPS1({ map: tex.madera(rng) });
  const canto = materialPS1({ color: 0x2c2015 });
  const mueble = materialPS1({ color: 0x8d8778 });
  const metal = materialPS1({ color: 0x3e3c38 });
  const plastico = materialPS1({ color: 0xcfc8b0 });
  const silla = materialPS1({ color: 0x9a9483 });
  const mat = (map, extra = {}) => materialPS1({ map, transparent: true, alphaTest: 0.5, depthWrite: false, ...extra });

  // Paredes, suelo y techo.
  const fondo = plano(ANCHO, ALTO, pared);
  fondo.position.set(0, ALTO / 2, -FONDO / 2);
  const frente = plano(ANCHO, ALTO, pared);
  frente.position.set(0, ALTO / 2, FONDO / 2);
  frente.rotation.y = Math.PI;
  const piso = plano(ANCHO, FONDO, suelo);
  piso.rotation.x = -Math.PI / 2;
  const cielo = plano(ANCHO, FONDO, techoM);
  cielo.rotation.x = Math.PI / 2;
  cielo.position.y = ALTO;
  grupo.add(fondo, frente, piso, cielo,
    paredConPuerta(ANCHO / 2, -Math.PI / 2, paredLado),
    paredConPuerta(-ANCHO / 2, Math.PI / 2, paredLado));

  // Escritorio metálico pegado a la pared, CRT y silla.
  const mesa = caja(1.6, 0.05, 0.75, mueble);
  mesa.position.set(0, 0.74, -FONDO / 2 + 0.375);
  const faldon = caja(1.5, 0.45, 0.02, mueble);
  faldon.position.set(0, 0.5, -FONDO / 2 + 0.05);
  grupo.add(mesa, faldon);
  for (const [px, pz] of [[-0.75, -1.6], [0.75, -1.6], [-0.75, -0.95], [0.75, -0.95]]) {
    const pata = caja(0.04, 0.72, 0.04, metal);
    pata.position.set(px, 0.36, pz);
    grupo.add(pata);
  }
  const crt = caja(0.44, 0.4, 0.42, plastico);
  crt.position.set(0, 0.98, -1.37);
  const peana = caja(0.2, 0.04, 0.2, plastico);
  peana.position.set(0, 0.78, -1.37);
  const teclado = caja(0.42, 0.03, 0.14, plastico);
  teclado.position.set(0, 0.78, -1.02);
  const matPantalla = materialBrillo({ map: tex.pantalla('QUIERO\nTU VIDA') });
  const vidrio = plano(0.34, 0.26, matPantalla);
  vidrio.position.set(0, 0.99, -1.37 + 0.212);
  const asiento = caja(0.45, 0.05, 0.45, silla);
  asiento.position.set(0.15, 0.47, 0.25);
  asiento.rotation.y = 0.35;
  const respaldo = caja(0.45, 0.45, 0.04, silla);
  respaldo.position.set(0.22, 0.75, 0.46);
  respaldo.rotation.y = 0.35;
  grupo.add(crt, peana, teclado, vidrio, asiento, respaldo);
  for (const [px, pz] of [[-0.05, 0.08], [0.36, 0.2], [-0.07, 0.48], [0.33, 0.6]]) {
    const pata = caja(0.03, 0.46, 0.03, metal);
    pata.position.set(px, 0.23, pz);
    grupo.add(pata);
  }

  // Pared del fondo: corcho, reloj parado, persiana y papeles.
  const enPared = (w, h, material, x, y) => {
    const m = plano(w, h, material);
    m.position.set(x, y, -FONDO / 2 + 0.01);
    grupo.add(m);
    return m;
  };
  enPared(0.5, 0.62, materialPS1({ map: tex.corcho(rng) }), -1.1, 1.45);
  const reloj = new THREE.Mesh(new THREE.CircleGeometry(0.16, 10), materialPS1({ color: 0xbab4a0 }));
  reloj.position.set(-1.3, 2.15, -FONDO / 2 + 0.01);
  grupo.add(reloj);
  enPared(0.6, 0.7, materialPS1({ map: tex.persiana(), color: 0x667788 }), 1.15, 1.8);
  enPared(0.34, 0.22, materialPS1({ map: tex.papelEscrito('ESCAPA', '#9e0b12') }), 0.75, 1.32);
  enPared(0.3, 0.2, materialPS1({ map: tex.papelEscrito('no deberías\nseguir aquí') }), 1.3, 1.2);
  enPared(0.28, 0.16, materialPS1({ map: tex.papelEscrito('ya está\ndentro') }), -1.3, 1.9);
  enPared(0.22, 0.14, materialPS1({ map: tex.papelEscrito('no respondas') }), -0.7, 1.12);

  // Sangre: salpicaduras con chorreones en las paredes, charcos en el suelo, una mano arrastrada junto a
  // la puerta del ente y un rastro hacia ella.
  const sangreChorreo = mat(tex.sangre(rng, true));
  const sangreSuelo = mat(tex.sangre(rng));
  const enFondo = (w, x, y) => { const m = calco(w, w, sangreChorreo); m.position.set(x, y, -FONDO / 2 + 0.015); grupo.add(m); };
  enFondo(0.7, 0.55, 1.75);
  enFondo(0.5, -1.65, 0.7);
  const lado = calco(0.8, 0.8, sangreChorreo);
  lado.position.set(ANCHO / 2 - 0.015, 1.5, -0.7);
  lado.rotation.y = -Math.PI / 2;
  const mano = calco(0.22, 0.44, mat(tex.manoSangre(rng)));
  mano.position.set(ANCHO / 2 - 0.015, 1.25, 1.05);
  mano.rotation.y = -Math.PI / 2;
  grupo.add(lado, mano);
  for (const [x, z, w] of [[1.1, 0.35, 0.7], [1.5, 0.4, 0.5], [0.6, 0.9, 0.5], [-0.9, -0.6, 0.8], [0.35, -0.55, 0.4]]) {
    const m = calco(w, w, sangreSuelo);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = rng() * Math.PI * 2;
    m.position.set(x, 0.004, z);
    grupo.add(m);
  }

  // Cartas por el suelo.
  const cartas = [['CORRE', 0.55, 0.75], ['corre\ncorre', -0.45, 0.95], ['NO TE\nQUEDES', -1.2, 0.2],
    ['VETE\nYA', 1.0, -0.4], ['CORRE', -0.85, -0.35], ['no\nmires', 0.2, 1.3]];
  for (const [texto, x, z] of cartas) {
    const m = calco(0.21, 0.28, materialPS1({ map: tex.carta(texto, rng) }));
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = (rng() - 0.5) * 2.4;
    m.position.set(x, 0.006, z);
    grupo.add(m);
  }

  // Puertas. Derecha: la del ente, entera o con boquete. Izquierda: entreabierta hacia dentro, con el
  // pasillo amarillo detrás.
  const puertaDerecha = puerta(ANCHO / 2 - 0.03, madera, canto);
  const matRota = materialPS1({ map: tex.puertaRota(rng), alphaTest: 0.5, side: THREE.DoubleSide });
  const puertaRota = puerta(ANCHO / 2 - 0.03, matRota, canto);
  puertaRota.visible = false;
  const puertaIzquierda = puerta(-ANCHO / 2 + 0.03, madera, canto);
  puertaIzquierda.rotation.y = 0.35;
  grupo.add(puertaDerecha, puertaRota, puertaIzquierda);

  // Bombilla desnuda colgando del techo.
  const cable = caja(0.01, 0.3, 0.01, metal);
  cable.position.set(BOMBILLA[0], ALTO - 0.15, BOMBILLA[2]);
  const matBombilla = materialBrillo({ color: 0xfff1c8 });
  const bombilla = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), matBombilla);
  bombilla.position.set(...BOMBILLA);
  grupo.add(cable, bombilla);

  luces.ambiente(0x15161a);
  const encender = (si) => {
    if (si) luces.punto(L_BOMBILLA, BOMBILLA, 0xffe7c0, 1.7, 4.6); else luces.apagar(L_BOMBILLA);
    matBombilla.color.set(si ? 0xfff1c8 : 0x2a2622);
  };
  encender(true);
  luces.punto(L_PANTALLA, [0, 1.0, -0.95], 0xff2020, 0.9, 1.9);
  luces.punto(L_PASILLO, [-2.8, 2.1, ZP], 0xd8c070, 0.9, 3.2);

  return {
    grupo,
    puertaDerecha,
    puertaRota,
    puertaIzquierda,
    // null = pantalla apagada.
    setPantalla(texto) {
      matPantalla.map.dispose();
      matPantalla.map = tex.pantalla(texto);
      matPantalla.needsUpdate = true;
      if (texto) luces.punto(L_PANTALLA, [0, 1.0, -0.95], 0xff2020, 0.9, 1.9); else luces.apagar(L_PANTALLA);
    },
    setLuz: encender,
    // La puerta derecha pasa a tener el boquete.
    romper() {
      puertaDerecha.visible = false;
      puertaRota.visible = true;
    },
    // Brillo rojo de los ojos en el boquete (null = apagado).
    luzOjos(pos) {
      if (pos) luces.punto(L_OJOS, pos, 0xff1010, 0.8, 1.6); else luces.apagar(L_OJOS);
    },
  };
}
