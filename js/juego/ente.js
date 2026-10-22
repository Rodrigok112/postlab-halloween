// El ente: una máquina que intenta parecer humana. Unos 2,6 m, flaco y encorvado.
// Armazón de barras con articulaciones de anillo, columna de discos y costillas como un radiador; piernas
// con las rodillas al revés; brazos con tres codos hasta las rodillas y dedos de pinza; trozos de piel
// humana cosida encima (muslos, brazos, pecho) y una cara de piel puesta como máscara, con sangre, sobre un
// cráneo de chapa. Debajo, una mandíbula de bisagra con dientes que se desencaja hasta el pecho.
// Pivota en la cadera: agacharse (para pasar por puertas de 2,1 m) es inclinar la parte de arriba.
// Se anima a saltos (12 fps, lo marca quien lo usa) y con glitch: tic() decide tirones, giros de cabeza de
// 90° y fotogramas rotos. Mira hacia +z local. Unos 1.500 triángulos.

import { THREE, materialPS1, materialBrillo } from './ps1.js';
import * as tex from './texturas.js';
import { createRng } from '../glitch.js';

export const CADERA = 1.15;

// Barra de largo l que cuelga hacia −y desde el origen de su grupo.
function barra(l, r0, r1, material, lados = 5) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, l, lados, 1), material);
  m.position.y = -l / 2;
  return m;
}

// Articulación: grupo en (x, y, z) con una barra colgando y un anillo en el origen.
function segmento(padre, [x, y, z], l, r0, r1, material, anillo) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.add(barra(l, r0, r1, material));
  if (anillo) {
    const a = new THREE.Mesh(new THREE.TorusGeometry(r0 + 0.012, 0.01, 4, 6), anillo);
    a.rotation.y = Math.PI / 2;
    g.add(a);
  }
  padre.add(g);
  return g;
}

// Manga de piel rasgada alrededor de una barra (cilindro abierto e incompleto), de y0 a y0 − l.
function manga(padre, l, r, y0, material, rng) {
  const geo = new THREE.CylinderGeometry(r, r * 0.9, l, 6, 1, true, rng() * 6, 3.2 + rng() * 2);
  const m = new THREE.Mesh(geo, material);
  m.position.y = y0 - l / 2;
  padre.add(m);
  return m;
}

export function crearEnte() {
  const rng = createRng(2610);
  const metal = materialPS1({ map: tex.chapa(rng) });
  const oscuroM = materialPS1({ color: 0x232426 });
  const piel = materialPS1({ map: tex.pielHumana(rng), side: THREE.DoubleSide });
  const cara = materialPS1({ map: tex.mascara(rng), side: THREE.DoubleSide });
  const diente = materialPS1({ color: 0xb8ad92 });
  const boca = materialBrillo({ color: 0x1a0204 });
  const ojo = materialBrillo({ color: 0xff1a1a, fog: false });
  const grupo = new THREE.Group();

  // ---------- Piernas con las rodillas al revés: muslo, espinilla, empeine y pie ----------
  const piernas = [-0.11, 0.11].map((x) => {
    const muslo = segmento(grupo, [x, CADERA, 0], 0.5, 0.035, 0.03, metal, oscuroM);
    manga(muslo, 0.3, 0.06, -0.05, piel, rng);
    const rodilla = segmento(muslo, [0, -0.5, 0], 0.5, 0.03, 0.022, metal, oscuroM);
    const tobillo = segmento(rodilla, [0, -0.5, 0], 0.3, 0.022, 0.018, oscuroM, oscuroM);
    const pie = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.025, 0.22), metal);
    pie.position.set(0, -0.3, 0.07);
    tobillo.add(pie);
    muslo.rotation.x = -0.45;
    rodilla.rotation.x = 1.0;
    tobillo.rotation.x = -0.75;
    return { muslo, rodilla, tobillo };
  });
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.14), metal);
  pelvis.position.y = CADERA;
  grupo.add(pelvis);

  // ---------- Parte de arriba (pivota en la cadera) ----------
  const arriba = new THREE.Group();
  arriba.position.y = CADERA;
  grupo.add(arriba);

  // Columna de discos curvada hacia atrás y costillas de radiador delante.
  for (let i = 0; i < 10; i++) {
    const disco = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.04, 6), i % 2 ? metal : oscuroM);
    disco.position.set(0, 0.08 + i * 0.07, -0.06 - Math.sin((i / 9) * Math.PI) * 0.05);
    arriba.add(disco);
  }
  for (let i = 0; i < 6; i++) {
    const ancho = 0.34 - i * 0.03;
    const costilla = new THREE.Mesh(new THREE.BoxGeometry(ancho, 0.018, 0.02), metal);
    costilla.position.set(0, 0.68 - i * 0.075, 0.07);
    arriba.add(costilla);
    for (const s of [-1, 1]) {
      const lado = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.018, 0.15), oscuroM);
      lado.position.set(s * ancho / 2, 0.68 - i * 0.075, 0);
      arriba.add(lado);
    }
  }
  // Piel cosida sobre el pecho, rasgada.
  const pecho = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.32, 7, 1, true, -1.1, 2.0), piel);
  pecho.position.set(0, 0.56, 0.0);
  arriba.add(pecho);
  // Cables colgando del pecho.
  for (const [x, l] of [[-0.08, 0.35], [0.05, 0.5], [0.11, 0.28]]) {
    const cable = barra(l, 0.006, 0.006, oscuroM, 3);
    const g = new THREE.Group();
    g.position.set(x, 0.32, 0.08);
    g.rotation.x = 0.15;
    g.add(cable);
    arriba.add(g);
  }
  // Hombros.
  for (const s of [-1, 1]) {
    const hombro = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 4), metal);
    hombro.position.set(s * 0.21, 0.72, 0);
    arriba.add(hombro);
  }

  // ---------- Brazos: tres tramos, dos codos, mano de pinza con cuatro dedos largos ----------
  const brazos = [-1, 1].map((s) => {
    const brazo = segmento(arriba, [s * 0.23, 0.72, 0], 0.42, 0.028, 0.024, metal, oscuroM);
    manga(brazo, 0.26, 0.05, -0.04, piel, rng);
    const codo1 = segmento(brazo, [0, -0.42, 0], 0.38, 0.024, 0.02, metal, oscuroM);
    const codo2 = segmento(codo1, [0, -0.38, 0], 0.36, 0.02, 0.016, oscuroM, oscuroM);
    const mano = new THREE.Group();
    mano.position.y = -0.36;
    codo2.add(mano);
    const palma = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.025), metal);
    palma.position.y = -0.04;
    mano.add(palma);
    const dedos = [];
    for (let f = 0; f < 4; f++) {
      const dedo = segmento(mano, [(f - 1.5) * 0.017, -0.08, 0], 0.17, 0.008, 0.007, oscuroM, null);
      dedo.rotation.z = (f - 1.5) * 0.14 * s;
      const punta = segmento(dedo, [0, -0.17, 0], 0.15, 0.007, 0.004, metal, null);
      dedos.push({ dedo, punta });
    }
    brazo.rotation.z = s * 0.12;
    codo1.rotation.x = -0.2;
    codo2.rotation.x = -0.25;
    return { brazo, codo1, codo2, dedos, s };
  });

  // ---------- Cuello de discos y cabeza: cráneo de chapa con cara de piel encima ----------
  const cuello = new THREE.Group();
  cuello.position.set(0, 0.76, 0.02);
  cuello.rotation.x = 0.35;
  arriba.add(cuello);
  for (let i = 0; i < 5; i++) {
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.035, 6), i % 2 ? metal : oscuroM);
    d.position.y = 0.04 + i * 0.065;
    cuello.add(d);
  }
  const cabeza = new THREE.Group();
  cabeza.position.y = 0.36;
  cabeza.rotation.x = -0.35;
  cuello.add(cabeza);
  const giro = new THREE.Group(); // los giros de 90° de la cabeza, aparte de la inclinación
  giro.scale.setScalar(1.35); // cabeza grande, que se vea bien desde la silla
  cabeza.add(giro);
  const craneo = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), metal);
  craneo.scale.set(1, 1.3, 1);
  craneo.position.y = 0.07;
  giro.add(craneo);
  // Cara: un trozo de esfera algo mayor que el cráneo, por delante, con la máscara de piel.
  const mascara = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 9, Math.PI / 2 - 1.0, 2.0, 0.35, 1.85), cara);
  mascara.scale.set(1, 1.3, 1);
  mascara.position.y = 0.07;
  giro.add(mascara);
  // Pómulos y arco de las cejas marcados por debajo de la piel.
  for (const s of [-1, 1]) {
    const pomulo = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 4), cara);
    pomulo.scale.set(1.3, 0.7, 0.6);
    pomulo.position.set(s * 0.045, 0.1, 0.112);
    giro.add(pomulo);
  }
  // Ojos: dos LED en las cuencas de la máscara, y una corona de LED pequeños encima del cráneo.
  const ojos = [];
  for (const s of [-1, 1]) {
    const o = new THREE.Mesh(new THREE.SphereGeometry(0.017, 5, 4), ojo);
    o.position.set(s * 0.042, 0.155, 0.1);
    giro.add(o);
    ojos.push(o);
  }
  const leds = [];
  for (let i = 0; i < 6; i++) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.012), ojo);
    l.position.set(((i % 3) - 1) * 0.03, 0.245 + Math.floor(i / 3) * 0.015, 0.03 - Math.floor(i / 3) * 0.035);
    giro.add(l);
    leds.push(l);
  }
  // Pelo humano, largo y apelmazado, colgando de la parte de atrás del cráneo.
  const pelos = [];
  for (let i = 0; i < 16; i++) {
    const a = -1.4 + (i / 15) * 2.8 + Math.PI;
    const largo = 0.2 + rng() * 0.25;
    const g = new THREE.Group();
    g.position.set(Math.sin(a) * 0.1, 0.2, Math.cos(a) * 0.09);
    g.rotation.z = Math.sin(a) * 0.3;
    g.add(barra(largo, 0.004, 0.003, oscuroM, 3));
    giro.add(g);
    pelos.push(g);
  }
  // Boca: dientes de arriba bajo la máscara, mandíbula de bisagra y garganta oscura que crece al abrir.
  for (let i = 0; i < 7; i++) {
    const d = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.025 + rng() * 0.03, 3), diente);
    d.position.set((i - 3) * 0.013, -0.04, 0.1);
    d.rotation.x = Math.PI;
    d.rotation.z = (rng() - 0.5) * 0.5;
    giro.add(d);
  }
  const garganta = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 1), boca);
  garganta.position.set(0, -0.05, 0.085);
  garganta.visible = false;
  giro.add(garganta);
  const mandibula = new THREE.Group();
  mandibula.position.set(0, -0.05, 0.03);
  giro.add(mandibula);
  const quijada = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.035, 0.12), metal);
  quijada.position.set(0, -0.02, 0.04);
  mandibula.add(quijada);
  for (const s of [-1, 1]) {
    const bisagra = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 6), oscuroM);
    bisagra.rotation.z = Math.PI / 2;
    bisagra.position.set(s * 0.06, 0, -0.01);
    mandibula.add(bisagra);
  }
  for (let i = 0; i < 7; i++) {
    const d = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.025 + rng() * 0.03, 3), diente);
    d.position.set((i - 3) * 0.013, 0.012, 0.09);
    d.rotation.z = (rng() - 0.5) * 0.5;
    mandibula.add(d);
  }

  const colores = [metal, oscuroM, piel, cara, diente].map((m) => [m, m.color.getHex()]);
  let inclinacion = 0;
  let alcance = 0;

  // ---------- Glitch (lo llama quien lo anima, una vez por fotograma de 12 fps) ----------
  let roto = 0; // fotogramas que quedan de pose rota
  let cabezaHasta = 0;
  const posturaBrazos = () => {
    for (const b of brazos) {
      b.brazo.rotation.x = -1.1 * alcance + b.extraX;
      b.codo1.rotation.x = -0.2 - 0.4 * alcance + b.extraCodo;
      b.codo2.rotation.x = -0.25 - 0.3 * alcance;
    }
  };
  for (const b of brazos) { b.extraX = 0; b.extraCodo = 0; }

  return {
    grupo,
    cabeza,
    ojos,
    // rad: 0 erguido; ~1,0 para pasar por la puerta; ~0,6 dentro de la habitación (techo de 2,6 m).
    agacharse(rad) {
      inclinacion = rad;
      arriba.rotation.x = rad;
      cuello.rotation.x = 0.35 - rad * 0.55;
      cabeza.rotation.x = -0.35 - rad * 0.25;
    },
    // Paso: piernas y brazos alternos (fase en radianes; quien llama la avanza a 12 fps).
    andar(fase) {
      piernas[0].muslo.rotation.x = -0.45 + Math.sin(fase) * 0.35;
      piernas[1].muslo.rotation.x = -0.45 - Math.sin(fase) * 0.35;
      piernas[0].rodilla.rotation.x = 1.0 + Math.max(0, Math.cos(fase)) * 0.4;
      piernas[1].rodilla.rotation.x = 1.0 + Math.max(0, -Math.cos(fase)) * 0.4;
      // Brazos a destiempo, cada uno a su aire.
      brazos[0].extraX = -Math.sin(fase * 0.7) * 0.35;
      brazos[1].extraX = Math.sin(fase * 1.3 + 1) * 0.25;
      brazos[0].extraCodo = Math.max(0, Math.sin(fase * 0.5)) * 0.9; // el codo se dobla hacia donde no debe
      posturaBrazos();
    },
    // Brazos hacia delante (para agarrar): 0 colgando, 1 extendidos.
    alcanzar(u) { alcance = u; posturaBrazos(); },
    // 0 cerrada; 1 desencajada hasta el pecho.
    boca(u) {
      const k = Math.round(u * 4) / 4;
      mandibula.rotation.x = 0.4 * k;
      mandibula.position.y = -0.05 - 0.22 * k;
      garganta.visible = k > 0;
      garganta.scale.y = Math.max(0.01, 0.24 * k);
      garganta.position.y = -0.05 - 0.12 * k;
    },
    // En la oscuridad (asomado tras la puerta) solo se le ven los ojos.
    oscuro(si) {
      for (const [m, c] of colores) m.color.setHex(si ? 0x050505 : c);
      for (const l of leds) l.visible = !si;
    },
    // 1 abiertos, 0 cerrados (parpadeo).
    parpadear(u) { for (const o of ojos) o.scale.y = Math.max(0.05, u); },
    // Un fotograma de 12 fps: un brazo tiembla siempre, la cabeza gira de golpe 90° a veces y, de vez en
    // cuando, una pose rota de 1–2 fotogramas. Devuelve true en los fotogramas rotos (para el glitch de
    // pantalla).
    // nivel: 0 sin glitch (asomado), 1 normal, 2 entrando (muchos fotogramas rotos).
    tic(rnd, nivel = 1) {
      const conGlitch = nivel > 0;
      for (const p of pelos) p.rotation.x = (rnd() - 0.5) * 0.3;
      brazos[1].brazo.rotation.z = 0.12 + (rnd() - 0.5) * 0.12;
      brazos[1].codo2.rotation.z = (rnd() - 0.5) * 0.3;
      cabezaHasta--;
      if (cabezaHasta <= 0) giro.rotation.z = 0;
      if (conGlitch && rnd() < (nivel > 1 ? 0.15 : 0.03)) { giro.rotation.z = rnd() < 0.5 ? Math.PI / 2 : -Math.PI / 2; cabezaHasta = 6 + Math.floor(rnd() * 14); }
      if (roto > 0) roto--;
      else if (conGlitch && rnd() < (nivel > 1 ? 0.4 : 0.06)) roto = 1 + Math.floor(rnd() * 2);
      if (roto > 0) {
        for (const b of brazos) { b.brazo.rotation.x = (rnd() - 0.5) * 3; b.codo1.rotation.x = (rnd() - 0.5) * 3; }
        arriba.rotation.x = inclinacion + (rnd() - 0.5) * 0.5;
        arriba.position.x = (rnd() - 0.5) * 0.25;
        grupo.scale.y = 0.85 + rnd() * 0.3;
        return true;
      }
      arriba.rotation.x = inclinacion;
      arriba.position.x = 0;
      grupo.scale.y = 1;
      posturaBrazos();
      return false;
    },
  };
}

// La mano que entra por el boquete: antebrazo de barra con piel cosida, muñeca de anillo y dedos de pinza
// larguísimos. Apunta hacia +z local. agarrar(u): 0 abiertos, 1 cerrados sobre el borde.
export function crearMano() {
  const rng = createRng(731);
  const metal = materialPS1({ map: tex.chapa(rng) });
  const oscuroM = materialPS1({ color: 0x232426 });
  const piel = materialPS1({ map: tex.pielHumana(rng), side: THREE.DoubleSide });
  const grupo = new THREE.Group();
  // Todo se monta hacia −y y se tumba hacia +z.
  const eje = new THREE.Group();
  eje.rotation.x = -Math.PI / 2;
  grupo.add(eje);
  const antebrazo = segmento(eje, [0, 0.45, 0], 0.45, 0.026, 0.02, metal, oscuroM);
  manga(antebrazo, 0.3, 0.045, -0.05, piel, rng);
  const mano = new THREE.Group();
  mano.position.y = -0.45;
  antebrazo.add(mano);
  const palma = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.09, 0.025), metal);
  palma.position.y = -0.045;
  mano.add(palma);
  const dorso = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.1), piel);
  dorso.position.set(0, -0.045, 0.014);
  mano.add(dorso);
  const dedos = [];
  for (let f = 0; f < 4; f++) {
    const dedo = segmento(mano, [(f - 1.5) * 0.02, -0.09, 0], 0.19, 0.008, 0.007, oscuroM, metal);
    dedo.rotation.z = (f - 1.5) * 0.1;
    const medio = segmento(dedo, [0, -0.19, 0], 0.16, 0.007, 0.005, metal, null);
    const una = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.05, 3), oscuroM);
    una.position.y = -0.16;
    una.rotation.x = Math.PI;
    medio.add(una);
    dedos.push({ dedo, medio });
  }
  const pulgar = segmento(mano, [0.045, -0.03, 0], 0.14, 0.008, 0.006, oscuroM, metal);
  pulgar.rotation.z = -0.7;
  grupo.scale.setScalar(1.3); // algo más grande que la del ente: se tiene que ver desde la silla
  return {
    grupo,
    agarrar(u) {
      for (const d of dedos) { d.dedo.rotation.x = 0.9 * u; d.medio.rotation.x = 1.1 * u; }
      pulgar.rotation.x = 0.6 * u;
    },
  };
}
