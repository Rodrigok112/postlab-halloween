// La oficina del croquis, más ancha: 7 × 3,3 m, techo de 2,6 m (las puertas lejos, para que dé tiempo a correr). x a la derecha, y arriba, z hacia la cámara.
// Pared del fondo en z = -1,65 (escritorio pegado), puerta del ente en x = +3,5, salida al pasillo en x = -3,5.
// Estética sucia (referencia del 22/10): pared en dos tonos con moho, baldosas, una bombilla en el techo,
// sangre y cartas por el suelo que dicen que corras. La puerta del ente puede tener un boquete.
// 27/10 (concepto de la habitación): CRT grande de 21", mensajes escritos con sangre en la pared del fondo,
// dos estanterías (una caída), falso techo roto, fuente de agua, papeles por el suelo y la rendija roja bajo
// la puerta del ente.

import { THREE, materialPS1, materialBrillo, luces, hornear } from './ps1.js';
import * as tex from './texturas.js';
import { createRng } from '../glitch.js';

const ANCHO = 7;
const FONDO = 3.3;
const ALTO = 2.6;
const PUERTA = { z0: -0.1, z1: 0.8, alto: 2.1 };
const ZP = (PUERTA.z0 + PUERTA.z1) / 2;

// Boquete de la puerta derecha (en la textura, centro en u = 0,5, v = 1 − 18/64) en coordenadas del mundo.
export const BOQUETE = [ANCHO / 2, PUERTA.alto * (1 - 18 / 64), ZP];

export const POSES = {
  sentado: { pos: [0, 1.15, 0.02], mira: [0, 1.08, -1.15] },
  dePie: { pos: [0, 1.62, 0.1] },
  puertaDerecha: [ANCHO / 2, 1.3, ZP],
  puertaIzquierda: [-ANCHO / 2, 1.4, ZP],
};

// Luces de la habitación (huecos de luces.punto).
const BOMBILLA = [0, 2.3, -0.45];
const CRT_ESCALA = 1.3;
// Centro de la pantalla del CRT ya agrandado (para la luz que da).
const LUZ_PANTALLA = [0, 1.22, -0.95];
const L_BOMBILLA = 0, L_PANTALLA = 1, L_PASILLO = 2, L_OJOS = 3;

// Plano subdividido cada «paso» metros (la luz por vértice, las sombras horneadas y las texturas afines
// lo necesitan).
function plano(w, h, material, paso = 0.5) {
  const sw = Math.max(1, Math.round(w / paso));
  const sh = Math.max(1, Math.round(h / paso));
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h, sw, sh), material);
}

const smooth = (u) => { const k = Math.max(0, Math.min(1, u)); return k * k * (3 - 2 * k); };

// Sombras horneadas de la habitación: rincones y aristas más oscuros, y sombra bajo la mesa, la silla y
// lo que hay encima de la mesa.
function sombra(p, n) {
  let f = 1;
  const dist = [];
  if (Math.abs(n.x) < 0.5) dist.push(ANCHO / 2 - Math.abs(p.x));
  if (Math.abs(n.z) < 0.5) dist.push(FONDO / 2 - Math.abs(p.z));
  if (Math.abs(n.y) < 0.5) dist.push(p.y, ALTO - p.y);
  for (const d of dist) f *= 1 - 0.5 * (1 - smooth(d / 0.6));
  // Bajo la mesa (suelo, pared de detrás y patas), con el borde suave en el suelo.
  if (p.y < 0.72) {
    const dx = Math.max(Math.abs(p.x) - 0.8, 0);
    const dz = Math.max(p.z + 0.9, 0);
    f *= 1 - 0.55 * (1 - smooth(Math.hypot(dx, dz) / 0.35));
  }
  // Bajo la silla.
  if (p.y < 0.45) f *= 1 - 0.45 * (1 - smooth(Math.hypot(p.x - 0.18, p.z - 0.35) / 0.45));
  // Sobre la mesa: sombra de la caja del PC y del teclado.
  if (p.y > 0.74 && p.y < 0.8) {
    f *= 1 - 0.4 * (1 - smooth(Math.hypot(Math.max(Math.abs(p.x) - 0.23, 0), Math.max(Math.abs(p.z + 1.39) - 0.21, 0)) / 0.12));
    f *= 1 - 0.3 * (1 - smooth(Math.hypot(Math.max(Math.abs(p.x) - 0.22, 0), Math.max(Math.abs(p.z + 1.0) - 0.08, 0)) / 0.06));
  }
  return f;
}

function caja(w, h, d, material) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
}

// Pared lateral con el hueco de la puerta: dos tramos y el dintel.
function paredConPuerta(x, mirandoA, material) {
  const g = new THREE.Group();
  // Cada trozo toma su parte de la textura de la pared entera (si no, el dintel saldría con el zócalo).
  const tramo = (z0, z1, y0, y1) => {
    const m = plano(z1 - z0, y1 - y0, material);
    const uv = m.geometry.attributes.uv;
    const izq = mirandoA < 0 ? z0 : -z1; // la u crece con z en la pared derecha y con −z en la izquierda
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, (izq + uv.getX(i) * (z1 - z0) + FONDO / 2) / FONDO, (y0 + uv.getY(i) * (y1 - y0)) / ALTO);
    }
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
  const plasticoM = materialPS1({ map: tex.plastico(rng) });
  const techoM = materialPS1({ map: tex.techoSucio(rng, [2, 1.6]) });
  const madera = materialPS1({ map: tex.madera(rng) });
  const canto = materialPS1({ color: 0x2c2015 });
  const mueble = materialPS1({ map: tex.metalPintado(rng, '#6c7166') });
  const metal = materialPS1({ map: tex.metalPintado(rng, '#3e3c38') });
  const silla = materialPS1({ map: tex.metalPintado(rng, '#7d786a') });
  const mat = (map, extra = {}) => materialPS1({ map, transparent: true, alphaTest: 0.5, depthWrite: false, ...extra });

  // Paredes, suelo y techo.
  const fondo = plano(ANCHO, ALTO, pared);
  fondo.position.set(0, ALTO / 2, -FONDO / 2);
  const frente = plano(ANCHO, ALTO, pared);
  frente.position.set(0, ALTO / 2, FONDO / 2);
  frente.rotation.y = Math.PI;
  const piso = plano(ANCHO, FONDO, suelo, 0.25);
  piso.rotation.x = -Math.PI / 2;
  const cielo = plano(ANCHO, FONDO, techoM);
  cielo.rotation.x = Math.PI / 2;
  cielo.position.y = ALTO;
  const paredDerecha = paredConPuerta(ANCHO / 2, -Math.PI / 2, paredLado);
  grupo.add(fondo, frente, piso, cielo, paredDerecha, paredConPuerta(-ANCHO / 2, Math.PI / 2, paredLado));

  // Escritorio metálico pegado a la pared, con la pintura gastada.
  const mesa = caja(1.6, 0.04, 0.75, mueble);
  mesa.position.set(0, 0.745, -FONDO / 2 + 0.375);
  const cantoMesa = caja(1.62, 0.05, 0.02, metal);
  cantoMesa.position.set(0, 0.735, -FONDO / 2 + 0.755);
  const faldon = caja(1.5, 0.45, 0.02, mueble);
  faldon.position.set(0, 0.5, -FONDO / 2 + 0.05);
  grupo.add(mesa, cantoMesa, faldon);
  for (const [px, pz] of [[-0.76, -1.6], [0.76, -1.6], [-0.76, -0.95], [0.76, -0.95]]) {
    const pata = caja(0.04, 0.72, 0.04, metal);
    pata.position.set(px, 0.36, pz);
    grupo.add(pata);
  }

  // Ordenador viejo: caja horizontal con disquetera y CD, monitor CRT encima con su bisel y la parte de
  // atrás estrecha, teclado con teclas, ratón con su cable, una taza y unos papeles.
  const TAPA = 0.765;
  const beige = plasticoM;
  const cajaPC = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.13, 0.42),
    [beige, beige, beige, beige, materialPS1({ map: tex.frenteCaja(rng) }), beige]);
  cajaPC.position.set(0, TAPA + 0.065, -1.39);
  // El monitor (peana, carcasa y pantalla) se monta en un grupo con el pie sobre la caja y se agranda a un
  // CRT de 21": la pantalla tiene que llenar el plano del vídeo, visto desde la silla.
  const monitor = new THREE.Group();
  const PIE = [0, TAPA + 0.13, -1.36];
  monitor.position.set(...PIE);
  monitor.scale.setScalar(CRT_ESCALA);
  const enMonitor = (m, x, y, z) => { m.position.set(x - PIE[0], y - PIE[1], z - PIE[2]); monitor.add(m); };
  const peana = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.03, 8), plasticoM);
  enMonitor(peana, 0, TAPA + 0.145, -1.36);
  const crtFrente = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 0.12),
    [beige, beige, beige, beige, materialPS1({ map: tex.frenteCRT(rng) }), beige]);
  enMonitor(crtFrente, 0, TAPA + 0.35, -1.24);
  const crtAtras = caja(0.34, 0.3, 0.2, plasticoM);
  enMonitor(crtAtras, 0, TAPA + 0.35, -1.4);
  const crtCola = caja(0.22, 0.2, 0.1, plasticoM);
  enMonitor(crtCola, 0, TAPA + 0.35, -1.52);
  const matPantalla = materialBrillo({ map: tex.pantalla('QUIERO\nTU VIDA') });
  // La pantalla ocupa el hueco negro del bisel (48 × 39 de 64 × 64 en la textura del frente).
  const vidrio = plano(0.42 * 48 / 64, 0.38 * 39 / 64, matPantalla);
  // Unos milímetros por delante del bisel: si no, con el temblor de vértices el bisel se le come los bordes.
  enMonitor(vidrio, 0, TAPA + 0.35 + 0.38 * (0.5 - 26.5 / 64), -1.24 + 0.065);
  const teclado = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.025, 0.15),
    [beige, beige, materialPS1({ map: tex.teclas(rng) }), beige, beige, beige]);
  teclado.position.set(0, TAPA + 0.016, -1.0);
  teclado.rotation.x = 0.06;
  const raton = caja(0.055, 0.03, 0.09, plasticoM);
  raton.position.set(0.34, TAPA + 0.015, -0.98);
  raton.rotation.y = -0.15;
  const cableRaton = caja(0.006, 0.006, 0.32, metal);
  cableRaton.position.set(0.3, TAPA + 0.004, -1.17);
  cableRaton.rotation.y = 0.2;
  const taza = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.09, 7), materialPS1({ color: 0x8e8a7c }));
  taza.position.set(-0.55, TAPA + 0.045, -1.05);
  const papeles = plano(0.21, 0.28, materialPS1({ map: tex.papelEscrito('no\nrespondas\nnada') }));
  papeles.rotation.x = -Math.PI / 2;
  papeles.rotation.z = 0.4;
  papeles.position.set(-0.45, TAPA + 0.002, -1.35);
  grupo.add(cajaPC, monitor, teclado, raton, cableRaton, taza, papeles);
  // El ordenador también está sucio: salpicaduras en el bisel (por debajo de la pantalla, que es donde va el
  // QR) y una mano de sangre en la caja.
  const manchaPC = mat(tex.sangre(rng));
  const enCarcasa = (m, x, y, z, rz) => { m.position.set(x, y, z); m.rotation.z = rz; m.renderOrder = 2; grupo.add(m); };
  enCarcasa(calco(0.14, 0.14, manchaPC), -0.2, 0.99, -1.122, 0.7);
  enCarcasa(calco(0.1, 0.1, manchaPC), 0.24, 1.2, -1.122, 2.4);
  enCarcasa(calco(0.08, 0.15, mat(tex.manoSangre(rng))), -0.12, 0.83, -1.177, 1.5);
  enCarcasa(calco(0.16, 0.16, manchaPC), 0.14, 0.84, -1.177, 2.1);

  // Silla de oficina metálica, un poco apartada.
  const asiento = caja(0.45, 0.05, 0.45, silla);
  asiento.position.set(0.15, 0.47, 0.25);
  asiento.rotation.y = 0.35;
  const respaldo = caja(0.45, 0.45, 0.04, silla);
  respaldo.position.set(0.22, 0.75, 0.46);
  respaldo.rotation.y = 0.35;
  grupo.add(asiento, respaldo);
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

  // Mensajes escritos con sangre en la pared del fondo, alrededor del monitor (dentro del plano del vídeo), y
  // alguno más en las paredes de los lados.
  const pintada = (texto, w, x, y, giro, z = -FONDO / 2 + 0.017, ry = 0) => {
    const m = calco(w, w * 112 / 256, mat(tex.grafiti(texto, rng)));
    m.position.set(x, y, z);
    m.rotation.set(0, ry, giro);
    m.renderOrder = 2;
    grupo.add(m);
  };
  // Desde la silla, el monitor tapa la pared de x = ±0,4 hasta y = 1,56: los mensajes van encima y a los lados.
  pintada('VETE', 0.52, -0.33, 1.74, 0.07);
  pintada('CORRE', 0.56, 0.32, 1.71, -0.08);
  pintada('NO', 0.24, -0.53, 1.4, 0.1);
  pintada('ENTRES', 0.26, -0.53, 1.22, -0.06);
  pintada('SAL DE', 0.26, 0.53, 1.4, -0.05);
  pintada('AQUÍ', 0.24, 0.53, 1.22, 0.08);
  pintada('CORRE', 1.1, -2.2, 1.5, 0.05);
  pintada('NO ENTRES', 1.0, ANCHO / 2 - 0.017, 1.75, -0.04, 1.35, -Math.PI / 2);
  pintada('VETE YA', 1.0, -ANCHO / 2 + 0.017, 1.6, 0.05, -0.9, Math.PI / 2);

  // Dos estanterías metálicas en la pared del fondo, a los lados del escritorio: la izquierda en pie, con
  // archivadores y cajas; la derecha, caída hacia delante contra la pared.
  const estanteria = (x, caida) => {
    const g = new THREE.Group();
    for (const sx of [-0.45, 0.45]) {
      for (const sz of [-0.15, 0.15]) {
        const poste = caja(0.03, 1.9, 0.03, metal);
        poste.position.set(sx, 0.95, sz);
        g.add(poste);
      }
    }
    for (const y of [0.1, 0.55, 1.0, 1.45, 1.88]) {
      const balda = caja(0.93, 0.025, 0.33, mueble);
      balda.position.set(0, y, 0);
      g.add(balda);
      if (y > 1.8) continue;
      let px = -0.42;
      while (px < 0.38) {
        const w = 0.06 + rng() * 0.12;
        const h = 0.18 + rng() * 0.2;
        const cosa = caja(w, h, 0.22 + rng() * 0.08, rng() < 0.5 ? carton : archivador);
        cosa.position.set(px + w / 2, y + 0.0125 + h / 2, (rng() - 0.5) * 0.04);
        cosa.rotation.z = rng() < 0.15 ? 0.25 : 0;
        g.add(cosa);
        px += w + 0.01 + (rng() < 0.2 ? 0.12 : 0);
      }
    }
    if (caida) {
      // Vencida hacia delante y apoyada en una esquina: las cosas se han caído al suelo.
      g.position.set(x, 0, -FONDO / 2 + 0.75);
      g.rotation.set(-0.42, 0.25, -0.08);
    } else g.position.set(x, 0, -FONDO / 2 + 0.18);
    grupo.add(g);
  };
  const carton = materialPS1({ color: 0x8a6c48 });
  const archivador = materialPS1({ color: 0x40505a });
  estanteria(-2.05, false);
  estanteria(2.0, true);
  for (let i = 0; i < 6; i++) {
    const w = 0.15 + rng() * 0.15;
    const suelto = caja(w, 0.08 + rng() * 0.12, 0.25, rng() < 0.5 ? carton : archivador);
    suelto.position.set(1.4 + rng() * 1.2, 0.06, -0.6 + rng() * 0.9);
    suelto.rotation.set(0, rng() * 3, rng() < 0.5 ? Math.PI / 2 : 0);
    grupo.add(suelto);
  }

  // Fuente de agua en la esquina derecha del fondo, con la garrafa sucia.
  const fuente = caja(0.32, 0.95, 0.32, plasticoM);
  fuente.position.set(ANCHO / 2 - 0.35, 0.475, -FONDO / 2 + 0.3);
  const garrafa = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.42, 8),
    materialPS1({ color: 0x6f8a86, transparent: true, opacity: 0.75 }));
  garrafa.position.set(ANCHO / 2 - 0.35, 1.16, -FONDO / 2 + 0.3);
  grupo.add(fuente, garrafa);

  // Falso techo roto: una placa abierta colgando de un lado y un par de cables, con el negro de encima.
  const TECHO_ROTO = [1.05, -0.2];
  const negroTecho = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), materialBrillo({ color: 0x050505 }));
  negroTecho.rotation.x = Math.PI / 2;
  negroTecho.position.set(TECHO_ROTO[0], ALTO - 0.004, TECHO_ROTO[1]);
  const bisagra = new THREE.Group();
  bisagra.position.set(TECHO_ROTO[0] - 0.3, ALTO - 0.01, TECHO_ROTO[1]);
  bisagra.rotation.z = -1.1;
  const placa = caja(0.6, 0.015, 0.6, techoM);
  placa.position.set(0.3, 0, 0);
  bisagra.add(placa);
  grupo.add(negroTecho, bisagra);
  for (const [dx, largo] of [[0.12, 0.7], [-0.05, 0.45]]) {
    const hilo = caja(0.008, largo, 0.008, metal);
    hilo.position.set(TECHO_ROTO[0] + dx, ALTO - largo / 2, TECHO_ROTO[1] + dx);
    hilo.rotation.z = dx;
    grupo.add(hilo);
  }

  // Más papeles sueltos por el suelo.
  const folio = materialPS1({ color: 0xd2ccb8 });
  for (let i = 0; i < 12; i++) {
    const m = calco(0.21, 0.28, folio);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = rng() * Math.PI * 2;
    m.position.set((rng() - 0.5) * 6, 0.005, (rng() - 0.5) * 2.8);
    grupo.add(m);
  }

  // Rendija roja bajo la puerta del ente: una línea de luz en el hueco y el resplandor en el suelo. Solo se
  // enciende cuando el ente abre los ojos (y en el fotograma rojo del vídeo).
  const rendija = new THREE.Group();
  const linea = new THREE.Mesh(new THREE.PlaneGeometry(PUERTA.z1 - PUERTA.z0, 0.025), materialBrillo({ color: 0xff2010, fog: false }));
  linea.position.set(ANCHO / 2 - 0.06, 0.012, ZP);
  linea.rotation.y = -Math.PI / 2;
  const resplandor = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.3), materialBrillo({
    map: tex.halo(), color: 0xff2a1a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  }));
  resplandor.rotation.x = -Math.PI / 2;
  resplandor.position.set(ANCHO / 2 - 0.4, 0.01, ZP);
  resplandor.renderOrder = 3;
  rendija.add(linea, resplandor);
  rendija.visible = false;
  grupo.add(rendija);

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

  hornear(grupo, sombra);

  luces.ambiente(0x15161a);
  const encender = (si) => {
    if (si) luces.punto(L_BOMBILLA, BOMBILLA, 0xffe7c0, 1.9, 6.0); else luces.apagar(L_BOMBILLA);
    matBombilla.color.set(si ? 0xfff1c8 : 0x2a2622);
  };
  encender(true);
  luces.punto(L_PANTALLA, LUZ_PANTALLA, 0xff2020, 0.9, 1.9);
  luces.punto(L_PASILLO, [-ANCHO / 2 - 0.8, 2.1, ZP], 0xd8c070, 0.9, 3.2);

  // Trozos de una puerta cuando estalla: salen hacia −x (dentro de la habitación desde la derecha; hacia el
  // cruce desde la izquierda), giran, caen y se quedan en el suelo.
  const trozos = [];
  const estallar = (lado = 'derecha') => {
    const x0 = lado === 'derecha' ? ANCHO / 2 - 0.05 : -ANCHO / 2 - 0.05;
    const xMin = lado === 'derecha' ? -ANCHO / 2 + 0.1 : -ANCHO / 2 - 1.5;
    if (lado === 'derecha') { puertaRota.visible = false; puertaDerecha.visible = false; } else puertaIzquierda.visible = false;
    const azar = createRng(lado === 'derecha' ? 4242 : 4343 + trozos.length);
    for (let i = 0; i < 16; i++) {
      const alto = 0.15 + azar() * 0.55;
      const ancho = 0.08 + azar() * 0.22;
      const geo = new THREE.BoxGeometry(0.05, alto, ancho);
      // Sus materiales ya tienen sombras horneadas (color de vértice): sin este atributo saldrían negros.
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 3).fill(1), 3));
      const m = new THREE.Mesh(geo, i % 5 ? madera : canto);
      m.position.set(x0, 0.2 + azar() * 1.8, PUERTA.z0 + azar() * (PUERTA.z1 - PUERTA.z0));
      m.rotation.set(azar() * 3, azar() * 3, azar() * 3);
      m.userData.lado = lado;
      Object.assign(m.userData, {
        v: new THREE.Vector3(-(2.2 + azar() * 3.5), 0.8 + azar() * 2.8, (azar() - 0.5) * 3),
        w: new THREE.Vector3((azar() - 0.5) * 14, (azar() - 0.5) * 14, (azar() - 0.5) * 14),
        suelo: Math.min(alto, ancho) / 2,
        xMin,
      });
      grupo.add(m);
      trozos.push(m);
    }
  };
  const actualizarTrozos = (dt) => {
    for (const m of trozos) {
      const d = m.userData;
      if (!d.v) continue;
      d.v.y -= 9.8 * dt;
      m.position.addScaledVector(d.v, dt);
      m.rotation.x += d.w.x * dt;
      m.rotation.y += d.w.y * dt;
      m.rotation.z += d.w.z * dt;
      // Contra las paredes de la habitación rebota; en el suelo se queda tumbado.
      if (Math.abs(m.position.z) > FONDO / 2 - 0.1) d.v.z *= -0.4;
      if (m.position.x < d.xMin) { m.position.x = d.xMin; d.v.x *= -0.4; }
      if (m.position.y <= d.suelo) {
        m.position.y = d.suelo;
        m.rotation.x = Math.PI / 2;
        m.rotation.z = 0;
        d.v = null;
      }
    }
  };

  return {
    grupo,
    puertaDerecha,
    puertaRota,
    estallar,
    actualizarTrozos,
    // Trozos de la pared de la puerta del ente (para romperlos con glitch cuando sale).
    paredDerecha: paredDerecha.children,
    izquierdaRota: () => !puertaIzquierda.visible,
    // Vuelve a poner la puerta izquierda, cerrada y entera, y quita sus trozos (para «repetir»).
    rehacerIzquierda() {
      for (let i = trozos.length - 1; i >= 0; i--) {
        if (trozos[i].userData.lado !== 'izquierda') continue;
        grupo.remove(trozos[i]);
        trozos[i].geometry.dispose();
        trozos.splice(i, 1);
      }
      puertaIzquierda.visible = true;
      puertaIzquierda.rotation.y = 0;
    },
    // La puerta izquierda (cerrada) tiembla con un golpe: k de 0 a 1.
    temblarIzquierda(k) { puertaIzquierda.rotation.y = (Math.random() - 0.5) * 0.06 * k; },
    puertaIzquierda,
    // null = pantalla apagada.
    setPantalla(texto) {
      matPantalla.map?.dispose();
      matPantalla.map = tex.pantalla(texto);
      matPantalla.needsUpdate = true;
      matPantalla.color.set(0xffffff);
      if (texto) luces.punto(L_PANTALLA, LUZ_PANTALLA, 0xff2020, 0.9, 1.9); else luces.apagar(L_PANTALLA);
    },
    setLuz: encender,
    // La puerta derecha pasa a tener el boquete.
    romper() {
      puertaDerecha.visible = false;
      puertaRota.visible = true;
    },
    // La rendija roja bajo la puerta del ente.
    rendija(si) { rendija.visible = si; },
    // Pantalla de un color liso (para el vídeo: blanca o gris azulado), con la luz que da.
    pantallaLisa(color, luz, intensidad) {
      matPantalla.map = null;
      matPantalla.color.set(color);
      matPantalla.needsUpdate = true;
      luces.punto(L_PANTALLA, LUZ_PANTALLA, luz, intensidad, 2.6);
    },
    pantalla: vidrio,
    // Brillo rojo de los ojos en el boquete (null = apagado).
    luzOjos(pos) {
      if (pos) luces.punto(L_OJOS, pos, 0xff1010, 0.8, 1.6); else luces.apagar(L_OJOS);
    },
  };
}
