// Visor de monstruos (solo para revisar el diseño; el juego no lo usa): el ente rediseñado en sus poses, girando
// 360°, la entrada completa de 30 poses a 12 fps, un primer plano de la cara, el glitch y los brazos de pared.
// Mismo motor PS1 que el juego. Se arrastra con el dedo o el ratón para girar a mano.

import { THREE, crearMotor, materialPS1, luces } from './juego/ps1.js';
import * as tex from './juego/texturas.js';
import { crearEnte, POSES, poseEntrada } from './juego/ente.js';
import { crearBrazoPared } from './juego/brazos.js';
import { createRng } from './glitch.js';

const FPS = 12;
const NOMBRES = {
  reposo: 'reposo', acecho: 'al acecho', dedos: '1 · dedos', reves: '2 · del revés', retuerce: '3 · se retuerce',
  rodilla: '4 · rodilla atrás', despliega: '5 · se despliega', enPie: '6 · en pie', cuatroPatas: 'a cuatro patas',
  grito: 'grito', lanza: 'se lanza',
};

await tex.cargarFotos();
const contenedor = document.getElementById('escena');
const motor = crearMotor(contenedor);
const { escena, camara } = motor;
const rng = createRng(5);
escena.fog.near = 6;
escena.fog.far = 18;
luces.ambiente(0x2a2a30, 1.1);
luces.punto(0, [1.6, 2.7, 2.6], 0xffe7c0, 2.4, 9);
luces.punto(1, [-2.2, 1.6, 1.2], 0x8090ff, 0.7, 6);

// Suelo de baldosas y una pared con puerta (para la entrada) al fondo.
const suelo = new THREE.Mesh(new THREE.PlaneGeometry(10, 10, 20, 20), materialPS1({ map: tex.baldosas(rng, [7, 7]) }));
suelo.rotation.x = -Math.PI / 2;
escena.add(suelo);
const pared = new THREE.Group();
const papel = materialPS1({ map: tex.paredSucia(rng, [1.6, 1]) });
for (const [x, w] of [[-1.25, 1.6], [1.25, 1.6]]) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 2.6, 4, 5), papel);
  m.position.set(x, 1.3, 0);
  pared.add(m);
}
const dintel = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.5, 2, 1), papel);
dintel.position.set(0, 2.35, 0);
pared.add(dintel);
escena.add(pared);

const ente = crearEnte();
escena.add(ente.grupo);

// Brazos de pared: uno en una pared, otro en el suelo y otro en el techo, saliendo en bucle.
const zonaBrazos = new THREE.Group();
zonaBrazos.position.set(0, 0, -6);
const muro = new THREE.Mesh(new THREE.PlaneGeometry(3, 2.6, 6, 5), materialPS1({ map: tex.papelBackrooms(rng, [2, 2]) }));
muro.position.set(0, 1.3, 0);
const techo = new THREE.Mesh(new THREE.PlaneGeometry(3, 2.5, 6, 5), materialPS1({ map: tex.techo([2, 2]) }));
techo.rotation.x = Math.PI / 2;
techo.position.set(0, 2.6, 1.25);
zonaBrazos.add(muro, techo);
const brazos = [crearBrazoPared(11), crearBrazoPared(22), crearBrazoPared(33)];
brazos[0].grupo.position.set(-0.5, 1.3, 0);
brazos[1].grupo.position.set(0.6, 0.01, 1.0);
brazos[1].grupo.rotation.x = -Math.PI / 2;
brazos[2].grupo.position.set(0.2, 2.59, 1.6);
brazos[2].grupo.rotation.x = Math.PI / 2;
for (const b of brazos) zonaBrazos.add(b.grupo);
escena.add(zonaBrazos);
zonaBrazos.visible = false;

// ---------- Estado y controles ----------
const titulo = document.getElementById('titulo');
let modo = 'pose'; // 'pose' | 'entrada' | 'brazos'
let girar = true;
let primerPlano = false;
let conGlitch = false;
let angulo = 0.4;
let arrastrando = null;
let t0 = performance.now();
let ultimoTic = -1;

const botonesPose = document.getElementById('poses');
const lucesEnte = () => luces.punto(0, [1.6, 2.7, 2.6], 0xffe7c0, 2.4, 9);
const elegirPose = (nombre) => {
  modo = 'pose';
  lucesEnte();
  zonaBrazos.visible = false;
  ente.grupo.visible = true;
  pared.visible = false;
  ente.grupo.position.set(0, 0, 0);
  ente.pose(nombre);
  titulo.textContent = `el ente · ${NOMBRES[nombre]}`;
  marcar();
};
for (const nombre of Object.keys(POSES)) {
  const b = document.createElement('button');
  b.textContent = NOMBRES[nombre] ?? nombre;
  b.dataset.pose = nombre;
  b.addEventListener('click', () => elegirPose(nombre));
  botonesPose.append(b);
}
const marcar = () => {
  document.getElementById('giro').classList.toggle('on', girar);
  document.getElementById('cara').classList.toggle('on', primerPlano);
  document.getElementById('glitch').classList.toggle('on', conGlitch);
  document.getElementById('entrada').classList.toggle('on', modo === 'entrada');
  document.getElementById('brazos').classList.toggle('on', modo === 'brazos');
};
document.getElementById('giro').addEventListener('click', () => { girar = !girar; marcar(); });
document.getElementById('cara').addEventListener('click', () => { primerPlano = !primerPlano; marcar(); });
document.getElementById('glitch').addEventListener('click', () => { conGlitch = !conGlitch; if (!conGlitch) motor.glitch(0); marcar(); });
document.getElementById('entrada').addEventListener('click', () => {
  modo = 'entrada';
  lucesEnte();
  zonaBrazos.visible = false;
  ente.grupo.visible = true;
  pared.visible = true;
  t0 = performance.now();
  titulo.textContent = 'el ente · entrada';
  marcar();
});
document.getElementById('brazos').addEventListener('click', () => {
  modo = 'brazos';
  zonaBrazos.visible = true;
  ente.grupo.visible = false;
  pared.visible = false;
  t0 = performance.now();
  luces.punto(0, [0.4, 2.3, -4.4], 0xfff0c0, 2.2, 6);
  titulo.textContent = 'brazos de pared';
  marcar();
});
contenedor.addEventListener('pointerdown', (e) => { arrastrando = e.clientX; });
window.addEventListener('pointerup', () => { arrastrando = null; });
window.addEventListener('pointermove', (e) => {
  if (arrastrando === null) return;
  angulo -= (e.clientX - arrastrando) * 0.01;
  arrastrando = e.clientX;
});

// ---------- Bucle ----------
const objetivo = new THREE.Vector3();
const cabezaMundo = new THREE.Vector3();
function bucle(ahora) {
  const t = (ahora - t0) / 1000;
  const tic = Math.floor((ahora / 1000) * FPS);
  if (tic !== ultimoTic) {
    ultimoTic = tic;
    if (modo === 'entrada') {
      // 30 poses a 12 fps (2,5 s) mientras cruza la puerta, y 1,5 s quieto antes de repetir.
      const k = Math.floor((t % 4) * FPS);
      const u = Math.min(1, k / 29);
      ente.pose(poseEntrada(Math.min(k, 29)));
      ente.grupo.position.set(0, 0, -0.9 + 1.6 * u);
      titulo.textContent = `el ente · entrada · pose ${Math.min(k, 29) + 1}/30`;
    }
    if (modo === 'brazos') {
      brazos.forEach((b, i) => {
        const u = ((t + i * 0.7) % 3) / 3;
        b.salir(u < 0.6 ? u / 0.6 : u < 0.85 ? 1 : 1 - (u - 0.85) / 0.15);
        b.agarrar(u > 0.45 && u < 0.85 ? 1 : 0.2);
        b.tic(rng);
      });
    }
    if (modo !== 'brazos') motor.glitch(ente.tic(rng, conGlitch ? 2 : 0) ? 1 : 0);
  }
  if (girar && arrastrando === null) angulo += 0.008;
  if (modo === 'brazos') {
    objetivo.set(0, 1.2, -5.4);
    camara.position.set(Math.sin(angulo * 0.5) * 0.9, 1.45, -3.6);
  } else if (primerPlano) {
    ente.cabeza.getWorldPosition(cabezaMundo);
    objetivo.copy(cabezaMundo).add(new THREE.Vector3(0, 0.2, 0));
    camara.position.set(objetivo.x + Math.sin(angulo) * 1.0, objetivo.y, objetivo.z + Math.cos(angulo) * 1.0);
  } else {
    objetivo.set(0, 1.5, modo === 'entrada' ? 0 : 0);
    const r = modo === 'entrada' ? 4.2 : 3.8;
    const a = modo === 'entrada' && !girar ? 0 : angulo;
    camara.position.set(Math.sin(a) * r, 1.6, Math.cos(a) * r);
  }
  camara.lookAt(objetivo);
  motor.render();
  requestAnimationFrame(bucle);
}
elegirPose('reposo');
requestAnimationFrame(bucle);
window.__visor = { ente, brazos, motor, camara, elegirPose, ver: (a) => { angulo = a; girar = false; marcar(); } };
