// Pasillos de los backrooms: el cruce que hay tras la puerta izquierda de la habitación y los dos caminos
// (RUTAS de recorrido.js), cada uno con el pasillo que sigue recto tras la primera esquina. Papel amarillo,
// moqueta húmeda, fluorescentes débiles, grafiti rojo cada vez más denso y la puerta-meta iluminada al final.

import { THREE, materialPS1, materialBrillo, hornear } from './ps1.js';
import * as tex from './texturas.js';
import { CRUCE, RUTAS, crearRecorrido } from './recorrido.js';

const ANCHO = 1.6;
const ALTO = 2.5;
const PALABRAS = ['CORRE', 'ESCAPA', 'NO MIRES ATRÁS', 'QUIERO TU VIDA', 'SÍ'];
const GRAFITIS_POR_M = 0.8;
const FLUORESCENTE_CADA_M = 3;
// Puerta de la habitación al cruce (pared x = −2, entre z = −0,1 y 0,8, 2,1 m de alto).
const PUERTA = { z0: -0.1, z1: 0.8, alto: 2.1 };

const dirDe = (rumbo) => new THREE.Vector2(-Math.sin(rumbo), -Math.cos(rumbo));
// Derecha de quien mira en dirección d (x, z).
const derechaDe = (d) => new THREE.Vector2(-d.y, d.x);

export function crearPasillos(rng) {
  const grupo = new THREE.Group();
  const papel = materialPS1({ map: tex.papelBackrooms(rng, [1, 1]) });
  const suelo = materialPS1({ map: tex.moqueta(rng, '#6b5d36', [1, 1]) });
  const cielo = materialPS1({ map: tex.techo([1, 1]) });
  // Sin niebla: los fluorescentes se ven a lo lejos, como puntos de luz al fondo del pasillo.
  const tubo = materialBrillo({ color: 0xfff6d8, fog: false });
  const tuboApagado = materialBrillo({ color: 0x3a3626 });
  const tubos = [];

  // Pieza rectangular (suelo/techo) de largo × ancho centrada en (cx, cz) y girada al rumbo.
  const losa = (cx, cz, largo, rumbo, y, material, haciaArriba) => {
    const geo = new THREE.PlaneGeometry(ANCHO, largo, 2, Math.max(1, Math.round(largo / 0.8)));
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ANCHO / 1.6, uv.getY(i) * largo / 1.6);
    const m = new THREE.Mesh(geo, material);
    m.rotation.order = 'YXZ';
    m.rotation.y = rumbo;
    m.rotation.x = haciaArriba ? -Math.PI / 2 : Math.PI / 2;
    m.position.set(cx, y, cz);
    // Sombra horneada: más oscuro junto a las paredes (local x = ±ANCHO/2).
    m.userData.sombra = (l) => 1 - 0.4 * (Math.abs(l.x) / (ANCHO / 2)) ** 2;
    grupo.add(m);
  };
  // Pared vertical de largo × alto, centrada en (cx, y, cz), mirando hacia (nx, nz).
  const pared = (cx, cz, largo, nx, nz, alto = ALTO, y = ALTO / 2) => {
    const geo = new THREE.PlaneGeometry(largo, alto, Math.max(1, Math.round(largo / 0.8)), 5);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * largo / 1.25, uv.getY(i) * alto / 1.25);
    const m = new THREE.Mesh(geo, papel);
    m.position.set(cx, y, cz);
    m.rotation.y = Math.atan2(nx, nz);
    // Sombra horneada: más oscuro abajo (junto al suelo) y algo arriba (junto al techo).
    m.userData.sombra = (l, p) => 1 - 0.45 * (1 - Math.min(1, p.y / 0.9)) ** 2 - 0.25 * Math.max(0, (p.y - 1.8) / 0.7) ** 2;
    grupo.add(m);
    return m;
  };
  // Tramo recto de pasillo: suelo, techo y dos paredes, de «desde» a «hasta» metros por el eje (p0, d).
  const tramoRecto = (p0, d, desde, hasta, rumbo) => {
    const largo = hasta - desde;
    const cx = p0.x + d.x * (desde + largo / 2);
    const cz = p0.z + d.y * (desde + largo / 2);
    const r = derechaDe(d);
    losa(cx, cz, largo, rumbo, 0, suelo, true);
    losa(cx, cz, largo, rumbo, ALTO, cielo, false);
    pared(cx + r.x * ANCHO / 2, cz + r.y * ANCHO / 2, largo, -r.x, -r.y);
    pared(cx - r.x * ANCHO / 2, cz - r.y * ANCHO / 2, largo, r.x, r.y);
    for (let k = desde + 1.5; k < hasta; k += FLUORESCENTE_CADA_M) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.9), tubo);
      m.rotation.order = 'YXZ';
      m.rotation.y = rumbo;
      m.rotation.x = Math.PI / 2;
      m.position.set(p0.x + d.x * k, ALTO - 0.01, p0.z + d.y * k);
      grupo.add(m);
      tubos.push(m);
    }
  };

  // ---------- El cruce: un cuadrado de ANCHO × ANCHO abierto a +z y a −z ----------
  losa(CRUCE.x, CRUCE.z, ANCHO, 0, 0, suelo, true);
  losa(CRUCE.x, CRUCE.z, ANCHO, 0, ALTO, cielo, false);
  pared(CRUCE.x - ANCHO / 2, CRUCE.z, ANCHO, 1, 0); // frente a la puerta
  // Pared de la puerta, vista desde el cruce: dos trozos a los lados y el dintel.
  const xp = CRUCE.x + ANCHO / 2;
  const zA = CRUCE.z - ANCHO / 2, zB = CRUCE.z + ANCHO / 2;
  const paredCruce = [
    pared(xp, (zA + PUERTA.z0) / 2, PUERTA.z0 - zA, -1, 0),
    pared(xp, (PUERTA.z1 + zB) / 2, zB - PUERTA.z1, -1, 0),
    pared(xp, (PUERTA.z0 + PUERTA.z1) / 2, PUERTA.z1 - PUERTA.z0, -1, 0, ALTO - PUERTA.alto, (ALTO + PUERTA.alto) / 2),
  ];

  // ---------- Los dos caminos ----------
  const caminos = {};
  const texturas = PALABRAS.map((p) => tex.grafiti(p, rng));
  const mats = texturas.map((t) => materialPS1({ map: t, transparent: true, alphaTest: 0.3, depthWrite: false }));

  // En la pared del cruce, frente a la puerta, un CORRE enorme y un fluorescente encima.
  const corre = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8 * 112 / 256), mats[0]);
  corre.position.set(CRUCE.x - ANCHO / 2 + 0.01, 1.55, CRUCE.z);
  corre.rotation.y = Math.PI / 2;
  corre.rotation.z = 0.06;
  corre.renderOrder = 1;
  const tuboCruce = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.9), tubo);
  tuboCruce.rotation.x = Math.PI / 2;
  tuboCruce.position.set(CRUCE.x, ALTO - 0.01, CRUCE.z);
  grupo.add(corre, tuboCruce);
  tubos.push(tuboCruce);

  for (const [nombre, ruta] of Object.entries(RUTAS)) {
    const rec = crearRecorrido(ruta);
    rec.segmentos.forEach((s, i) => {
      const d = dirDe(s.rumbo);
      const ini = ANCHO / 2;
      const fin = i === rec.segmentos.length - 1 ? s.largo : s.largo - ANCHO / 2;
      tramoRecto(s, d, ini, fin, s.rumbo);
      if (i < rec.segmentos.length - 1) {
        // Esquina: suelo, techo y la pared de fuera del giro. La de enfrente solo si no sigue recto.
        const esq = { x: s.x + d.x * s.largo, z: s.z + d.y * s.largo };
        const dSig = dirDe(rec.segmentos[i + 1].rumbo);
        losa(esq.x, esq.z, ANCHO, s.rumbo, 0, suelo, true);
        losa(esq.x, esq.z, ANCHO, s.rumbo, ALTO, cielo, false);
        pared(esq.x - dSig.x * ANCHO / 2, esq.z - dSig.y * ANCHO / 2, ANCHO, dSig.x, dSig.y);
        if (i === rec.tramoRecto) {
          // Sigue recto: pasillo sin salida por donde viene el segundo monstruo.
          tramoRecto(s, d, s.largo + ANCHO / 2, s.largo + rec.sigueRecto, s.rumbo);
          const fondo = rec.recto(rec.sigueRecto);
          pared(fondo.x, fondo.z, ANCHO, -d.x, -d.y);
        } else {
          pared(esq.x + d.x * ANCHO / 2, esq.z + d.y * ANCHO / 2, ANCHO, -d.x, -d.y);
        }
      }
    });

    // Meta: puerta abierta con luz blanca al final del último tramo.
    const fin = rec.poseEn(rec.largo);
    const dFin = dirDe(fin.rumbo);
    pared(fin.x + dFin.x * 0.02, fin.z + dFin.y * 0.02, ANCHO, -dFin.x, -dFin.y);
    const hueco = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.1), materialBrillo({ color: 0xffffff, fog: false }));
    hueco.position.set(fin.x - dFin.x * 0.01, 1.05, fin.z - dFin.y * 0.01);
    hueco.rotation.y = Math.atan2(-dFin.x, -dFin.y);
    grupo.add(hueco);

    // Grafiti: más denso cuanto más cerca de la meta. En las esquinas un lado es hueco: ahí no se pinta.
    const n = Math.round(rec.largo * GRAFITIS_POR_M);
    for (let i = 0; i < n; i++) {
      const dd = 2 + (rec.largo - 2.5) * Math.sqrt(rng());
      if (rec.esquinas.some((e) => Math.abs(dd - e) < 1.1)) continue;
      const p = rec.poseEn(dd);
      const dir = dirDe(p.rumbo);
      const r = derechaDe(dir);
      const lado = rng() < 0.5 ? 1 : -1;
      const ancho = 0.9 + rng() * 0.8;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(ancho, ancho * 112 / 256), mats[Math.floor(rng() * mats.length)]);
      m.position.set(p.x + r.x * lado * (ANCHO / 2 - 0.01), 0.7 + rng() * 1.4, p.z + r.y * lado * (ANCHO / 2 - 0.01));
      m.rotation.y = Math.atan2(-r.x * lado, -r.y * lado);
      m.rotation.z = (rng() - 0.5) * 0.25;
      m.renderOrder = 1;
      grupo.add(m);
    }
    caminos[nombre] = { recorrido: rec, luzMeta: [fin.x - dFin.x * 1.2, 1.4, fin.z - dFin.y * 1.2] };
  }

  hornear(grupo, (p, n, l, malla) => malla.userData.sombra?.(l, p) ?? 1);

  return {
    grupo,
    caminos,
    // La pared de la puerta del cruce, vista desde el cruce (para romperla con glitch cuando el ente la revienta).
    paredCruce,
    // Un fluorescente al azar parpadea (lo llama el bucle, como mucho 2 veces por segundo).
    parpadeo(rng2) {
      const m = tubos[Math.floor(rng2() * tubos.length)];
      m.material = m.material === tubo ? tuboApagado : tubo;
    },
  };
}
