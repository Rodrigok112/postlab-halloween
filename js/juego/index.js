// El juego: toma el control cuando la encuesta termina (evento «encuesta:fin»).
// Habitación (cinemática) → final 2 o pasillo (carrera) → «HAS MUERTO» o «HAS ESCAPADO».

import { THREE, crearMotor } from './ps1.js';
import { crearHabitacion } from './habitacion.js';
import { crearEnte } from './ente.js';
import { crearPasillo } from './pasillo.js';
import { CAMARA, ENTE, ACCIONES, DURACION } from './escenas.js';
import { muestrear } from './linea.js';
import { poseEn } from './recorrido.js';
import { createCarrera, tap, update, distancia, VENTAJA_M } from './carrera.js';
import { portazo, paso, crearCoro } from './sonidos.js';
import { thump, screamQTV } from '../audio.js';
import { createRng, createFlashGuard } from '../glitch.js';

const OJO_Y = 1.6;
const BALANCEO_M = 0.04;
const CAPTURA_S = 1.6;
const OJOS_CERCA_M = 2.6;

function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined) n.textContent = text;
  return n;
}

function soportaWebGL() {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export async function iniciarJuego({ camino, reiniciar }) {
  const rng = createRng(Date.now() >>> 0);
  const guard = createFlashGuard(3);
  const contenedor = el('div', 'juego');
  const capa = el('div', 'juego-capa');
  contenedor.append(capa);
  document.body.append(contenedor);
  await document.fonts.load('44px "Rubik Wet Paint"').catch(() => {});

  const motor = crearMotor(contenedor);
  contenedor.prepend(motor.lienzo);
  const { escena, camara } = motor;
  const mira = new THREE.Vector3();
  let raf = 0;
  let apagado = false;
  const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const quitarInput = [];

  // Negro total: se oculta el lienzo (más fiable que esconder la escena).
  const negro = (si) => { motor.lienzo.style.visibility = si ? 'hidden' : 'visible'; };

  const cerrar = () => {
    apagado = true;
    cancelAnimationFrame(raf);
    timers.forEach(clearTimeout);
    quitarInput.forEach((fn) => fn());
    motor.destruir();
    contenedor.remove();
  };

  const pantallaFinal = (titulo, clase, toques, boton, alPulsar) => {
    capa.replaceChildren();
    const fin = el('div', `juego-final ${clase}`);
    fin.append(el('h1', 'juego-titulo', titulo));
    if (toques !== null) fin.append(el('p', 'juego-toques', `${toques} toques`));
    const b = el('button', 'otra-vez', boton);
    b.type = 'button';
    b.addEventListener('click', alPulsar);
    fin.append(b);
    capa.append(fin);
  };

  // ---------- Habitación ----------
  const hab = crearHabitacion(rng);
  const ente = crearEnte();
  escena.add(hab.grupo, ente.grupo);
  escena.fog.color.set(0x000000);
  escena.fog.near = 3;
  escena.fog.far = 14;

  const parpadeo = (ms) => {
    if (!guard.tryFlash(performance.now())) return;
    hab.setLuz(false);
    later(() => hab.setLuz(true), ms);
  };
  const ejecutar = (a) => {
    if (a.que === 'pantalla') hab.setPantalla(a.valor);
    if (a.que === 'golpe') { thump(a.valor); parpadeo(140); }
    if (a.que === 'revienta') { portazo(); parpadeo(180); revientaEn = performance.now(); }
    if (a.que === 'grito') screamQTV();
  };

  let revientaEn = null;
  const acciones = ACCIONES[camino].map((a) => ({ ...a, hecho: false }));
  const t0 = performance.now();

  const pintarHabitacion = (ahora) => {
    const t = (ahora - t0) / 1000;
    for (const a of acciones) if (!a.hecho && t >= a.t) { a.hecho = true; ejecutar(a); }
    if (revientaEn !== null) {
      const u = Math.min(1, (ahora - revientaEn) / 160);
      hab.puertaDerecha.rotation.y = -1.75 * u;
    }
    const e = muestrear(ENTE[camino], t);
    ente.grupo.position.set(...e.pos);
    ente.grupo.rotation.y = Math.atan2(e.mira[0] - e.pos[0], e.mira[2] - e.pos[2]);
    const k = ENTE[camino].findIndex((c) => c.t > t);
    const a0 = ENTE[camino][Math.max(0, (k < 0 ? ENTE[camino].length : k) - 1)];
    const a1 = ENTE[camino][k < 0 ? ENTE[camino].length - 1 : k];
    const u = a1.t > a0.t ? Math.min(1, Math.max(0, (t - a0.t) / (a1.t - a0.t))) : 1;
    ente.agacharse(a0.agachado + (a1.agachado - a0.agachado) * u);
    ente.andar(t * 5);
    const c = muestrear(CAMARA[camino], t);
    camara.position.set(...c.pos);
    camara.lookAt(mira.set(...c.mira));
    motor.render();
    return t >= DURACION[camino];
  };

  const bucleHabitacion = (ahora) => {
    if (apagado) return;
    if (pintarHabitacion(ahora)) {
      if (camino === 'final2') {
        negro(true);
        pantallaFinal('HAS MUERTO', 'muerte-juego', null, 'otra vez', () => { cerrar(); reiniciar(); });
      } else {
        empezarPasillo();
      }
      return;
    }
    raf = requestAnimationFrame(bucleHabitacion);
  };

  // ---------- Pasillo ----------
  let pasillo = null;
  let coro = null;

  function empezarPasillo() {
    escena.remove(hab.grupo);
    escena.remove(ente.grupo);
    pasillo = crearPasillo(rng);
    escena.add(pasillo.grupo);
    escena.fog.color.set(0x15120a);
    escena.fog.near = 2;
    escena.fog.far = 13;
    escena.background.set(0x15120a);
    coro = crearCoro();
    correr();
  }

  function correr() {
    let c = createCarrera();
    let empezado = false;
    let ultimo = performance.now();
    let ultimoParpadeo = 0;
    let balanceo = 0;
    capa.replaceChildren(el('p', 'juego-aviso', 'TOCA PARA CORRER'));
    const ojos = el('div', 'juego-ojos');
    ojos.append(el('span', 'ojo-rojo'), el('span', 'ojo-rojo'));
    capa.append(ojos);

    const alTocar = (ev) => {
      if (ev.type === 'keydown' && ev.code !== 'Space') return;
      if (ev.type === 'keydown') ev.preventDefault();
      if (c.estado !== 'corriendo') return;
      if (!empezado) { empezado = true; capa.querySelector('.juego-aviso')?.remove(); ultimo = performance.now(); }
      c = tap(c);
      balanceo = 1;
      paso();
    };
    contenedor.addEventListener('pointerdown', alTocar);
    window.addEventListener('keydown', alTocar);
    const soltar = () => {
      contenedor.removeEventListener('pointerdown', alTocar);
      window.removeEventListener('keydown', alTocar);
    };
    quitarInput.push(soltar);

    const bucle = (ahora) => {
      if (apagado) return;
      const dt = (ahora - ultimo) / 1000;
      ultimo = ahora;
      if (empezado) c = update(c, dt);
      balanceo = Math.max(0, balanceo - dt * 6);
      const p = poseEn(c.jugador);
      camara.position.set(p.x, OJO_Y + Math.sin(balanceo * Math.PI) * BALANCEO_M, p.z);
      camara.rotation.set(0, p.rumbo, 0, 'YXZ');
      pasillo.linterna.position.set(p.x, 2.2, p.z);
      const cerca = 1 - Math.min(1, distancia(c) / (VENTAJA_M + 1));
      coro.setCercania(empezado ? cerca : 0.1);
      // Ojos rojos asomando por el borde cuando el ente está cerca.
      if (empezado && distancia(c) < OJOS_CERCA_M && rng() < dt * 2.5 && guard.tryFlash(ahora)) {
        ojos.style.setProperty('--lado', rng() < 0.5 ? '0' : '1');
        ojos.classList.add('on');
        later(() => ojos.classList.remove('on'), 90);
      }
      if (ahora - ultimoParpadeo > 700 && rng() < 0.05) { pasillo.parpadeo(rng); ultimoParpadeo = ahora; }
      motor.render();
      if (c.estado === 'atrapado') { soltar(); captura(c); return; }
      if (c.estado === 'escapado') { soltar(); escapar(c); return; }
      raf = requestAnimationFrame(bucle);
    };
    raf = requestAnimationFrame(bucle);
  }

  // Te atrapa: te das la vuelta, el ente está encima, grita, corte a negro.
  function captura(c) {
    const p = poseEn(c.jugador);
    // A 1,8 m detrás e inclinado: la cabeza queda a menos de un metro, por encima de ti.
    const detras = poseEn(Math.max(0, c.jugador - 1.8));
    escena.add(ente.grupo);
    ente.grupo.position.set(detras.x, 0, detras.z);
    // El ente mira hacia donde corres (hacia ti): su frente es +z local.
    ente.grupo.rotation.y = p.rumbo + Math.PI;
    ente.agacharse(0.85);
    const inicio = performance.now();
    let grito = false;
    // Solo vibra si ya hubo un toque real (si no, el navegador lo bloquea y avisa en consola).
    if (navigator.vibrate && navigator.userActivation?.hasBeenActive !== false) navigator.vibrate([200, 80, 400]);
    const giro = (ahora) => {
      if (apagado) return;
      const t = (ahora - inicio) / 1000;
      const u = Math.min(1, t / 0.35);
      camara.rotation.set(0.55 * u, p.rumbo + Math.PI * u, 0, 'YXZ');
      coro.setCercania(1);
      if (!grito && t > 0.5) { grito = true; screamQTV(); }
      motor.render();
      if (t < CAPTURA_S) { raf = requestAnimationFrame(giro); return; }
      coro.parar();
      negro(true);
      pantallaFinal('HAS MUERTO', 'muerte-juego', c.toques, 'repetir', () => {
        escena.remove(ente.grupo);
        negro(false);
        coro = crearCoro();
        correr();
      });
    };
    raf = requestAnimationFrame(giro);
  }

  // Llegas: flash blanco, el jardín y «HAS ESCAPADO».
  function escapar(c) {
    coro.parar();
    thump(0.6);
    capa.replaceChildren(el('div', 'juego-flash'));
    later(() => {
      negro(true);
      pantallaFinal('HAS ESCAPADO', 'escapado', c.toques, 'otra vez', () => { cerrar(); reiniciar(); });
      capa.prepend(el('div', 'jardin'));
    }, 700);
  }

  raf = requestAnimationFrame(bucleHabitacion);
}

// La encuesta avisa al terminar; el juego se encarga si el navegador puede con WebGL.
window.addEventListener('encuesta:fin', (ev) => {
  if (!soportaWebGL()) return;
  ev.preventDefault();
  iniciarJuego(ev.detail).catch(() => { document.querySelector('.juego')?.remove(); ev.detail.alFallar?.(); });
});
