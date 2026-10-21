// Pasillo de los backrooms: tres tramos rectos (TRAMOS) unidos por esquinas cuadradas, papel amarillo,
// moqueta húmeda, fluorescentes débiles, grafiti rojo cada vez más denso y la puerta-meta iluminada al final.

import { THREE, materialPS1, materialBrillo } from './ps1.js';
import * as tex from './texturas.js';
import { TRAMOS, poseEn } from './recorrido.js';

const ANCHO = 1.6;
const ALTO = 2.5;
const PALABRAS = ['CORRE', 'ESCAPA', 'NO MIRES ATRÁS', 'QUIERO TU VIDA', 'SÍ'];
const GRAFITIS = 46;
const FLUORESCENTE_CADA_M = 3;

const dirDe = (rumbo) => new THREE.Vector2(-Math.sin(rumbo), -Math.cos(rumbo));
// Derecha de quien mira en dirección d (x, z).
const derechaDe = (d) => new THREE.Vector2(-d.y, d.x);

export function crearPasillo(rng) {
  const grupo = new THREE.Group();
  const papel = materialPS1({ map: tex.papelBackrooms(rng, [1, 1]) });
  const suelo = materialPS1({ map: tex.moqueta(rng, '#6b5d36', [1, 1]) });
  const cielo = materialPS1({ map: tex.techo([1, 1]) });
  const tubo = materialBrillo({ color: 0xfff6d8 });
  const tuboApagado = materialBrillo({ color: 0x3a3626 });
  const tubos = [];

  // Pieza rectangular (suelo/techo) de largo × ancho centrada en (cx, cz) y girada al rumbo.
  const losa = (cx, cz, largo, rumbo, y, material, haciaArriba) => {
    const geo = new THREE.PlaneGeometry(ANCHO, largo, 1, Math.max(1, Math.round(largo)));
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ANCHO / 1.6, uv.getY(i) * largo / 1.6);
    const m = new THREE.Mesh(geo, material);
    m.rotation.order = 'YXZ';
    m.rotation.y = rumbo;
    m.rotation.x = haciaArriba ? -Math.PI / 2 : Math.PI / 2;
    m.position.set(cx, y, cz);
    grupo.add(m);
  };
  // Pared vertical de largo m, centrada en (cx, cz), mirando hacia (nx, nz).
  const pared = (cx, cz, largo, nx, nz) => {
    const geo = new THREE.PlaneGeometry(largo, ALTO, Math.max(1, Math.round(largo)), 2);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * largo / 1.25, uv.getY(i) * ALTO / 1.25);
    const m = new THREE.Mesh(geo, papel);
    m.position.set(cx, ALTO / 2, cz);
    m.rotation.y = Math.atan2(nx, nz);
    grupo.add(m);
    return m;
  };

  // Tramos rectos entre esquinas (cada esquina es un cuadrado de ANCHO × ANCHO).
  let desde = 0;
  TRAMOS.forEach((t, i) => {
    const ini = poseEn(desde + 0.001);
    const rumbo = poseEn(desde + t.largo / 2).rumbo;
    const d = dirDe(rumbo);
    const r = derechaDe(d);
    const recorteIni = i === 0 ? -0.6 : ANCHO / 2;
    const recorteFin = i === TRAMOS.length - 1 ? 0 : ANCHO / 2;
    const largo = t.largo - recorteIni - recorteFin;
    const cx = ini.x + d.x * (recorteIni + largo / 2);
    const cz = ini.z + d.y * (recorteIni + largo / 2);
    losa(cx, cz, largo, rumbo, 0, suelo, true);
    losa(cx, cz, largo, rumbo, ALTO, cielo, false);
    pared(cx + r.x * ANCHO / 2, cz + r.y * ANCHO / 2, largo, -r.x, -r.y);
    pared(cx - r.x * ANCHO / 2, cz - r.y * ANCHO / 2, largo, r.x, r.y);
    // Fluorescentes en el techo.
    for (let k = 1.5; k < t.largo; k += FLUORESCENTE_CADA_M) {
      const p = poseEn(desde + k);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.9), tubo);
      m.rotation.order = 'YXZ';
      m.rotation.y = rumbo;
      m.rotation.x = Math.PI / 2;
      m.position.set(p.x, ALTO - 0.01, p.z);
      grupo.add(m);
      tubos.push(m);
    }
    // Esquina al final del tramo: suelo, techo y las dos paredes de fuera.
    if (i < TRAMOS.length - 1) {
      const esq = poseEn(desde + t.largo);
      const dSig = dirDe(poseEn(desde + t.largo + 2).rumbo);
      losa(esq.x, esq.z, ANCHO, rumbo, 0, suelo, true);
      losa(esq.x, esq.z, ANCHO, rumbo, ALTO, cielo, false);
      pared(esq.x + d.x * ANCHO / 2, esq.z + d.y * ANCHO / 2, ANCHO, -d.x, -d.y);
      pared(esq.x - dSig.x * ANCHO / 2, esq.z - dSig.y * ANCHO / 2, ANCHO, dSig.x, dSig.y);
    }
    desde += t.largo;
  });

  // Pared oscura detrás del inicio (de donde vienes).
  const p0 = poseEn(0);
  const d0 = dirDe(p0.rumbo);
  pared(p0.x - d0.x * 0.6, p0.z - d0.y * 0.6, ANCHO, d0.x, d0.y);

  // Meta: puerta abierta con luz blanca al final del último tramo.
  const fin = poseEn(34);
  const dFin = dirDe(fin.rumbo);
  pared(fin.x + dFin.x * 0.02, fin.z + dFin.y * 0.02, ANCHO, -dFin.x, -dFin.y);
  const hueco = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.1), materialBrillo({ color: 0xffffff, fog: false }));
  hueco.position.set(fin.x - dFin.x * 0.01, 1.05, fin.z - dFin.y * 0.01);
  hueco.rotation.y = Math.atan2(-dFin.x, -dFin.y);
  grupo.add(hueco);
  const luzMeta = new THREE.PointLight(0xffffff, 10, 9, 1);
  luzMeta.position.set(fin.x - dFin.x * 1.2, 1.4, fin.z - dFin.y * 1.2);
  grupo.add(luzMeta);

  // Grafiti: más denso cuanto más cerca de la meta (densidad proporcional a la distancia).
  const texturas = PALABRAS.map((p) => tex.grafiti(p, rng));
  const mats = texturas.map((t) => new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.3, fog: true }));
  const esquinas = [];
  TRAMOS.reduce((acc, t) => { esquinas.push(acc + t.largo); return acc + t.largo; }, 0);
  for (let i = 0; i < GRAFITIS; i++) {
    const d = 2 + 31.5 * Math.sqrt(rng());
    // En las esquinas un lado es hueco: ahí no se pinta.
    if (esquinas.some((e) => Math.abs(d - e) < 1.1)) continue;
    const p = poseEn(d);
    const dir = dirDe(p.rumbo);
    const r = derechaDe(dir);
    const lado = rng() < 0.5 ? 1 : -1;
    const ancho = 0.9 + rng() * 0.8;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(ancho, ancho * 112 / 256), mats[Math.floor(rng() * mats.length)]);
    m.position.set(p.x + r.x * lado * (ANCHO / 2 - 0.01), 0.7 + rng() * 1.4, p.z + r.y * lado * (ANCHO / 2 - 0.01));
    m.rotation.y = Math.atan2(-r.x * lado, -r.y * lado);
    m.rotation.z = (rng() - 0.5) * 0.25;
    grupo.add(m);
  }

  // Luz: ambiente amarillenta y una lámpara que va con la cámara (barata y suficiente).
  const ambiente = new THREE.AmbientLight(0x6a5f3a, 0.9);
  const linterna = new THREE.PointLight(0xfff0c0, 3, 7, 1);
  grupo.add(ambiente, linterna);

  return {
    grupo,
    linterna,
    // Un fluorescente al azar parpadea (lo llama el bucle, como mucho 2 veces por segundo).
    parpadeo(rng2) {
      const m = tubos[Math.floor(rng2() * tubos.length)];
      m.material = m.material === tubo ? tuboApagado : tubo;
    },
  };
}
