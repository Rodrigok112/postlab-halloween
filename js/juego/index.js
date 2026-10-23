// El juego: toma el control cuando la encuesta termina (evento «encuesta:fin»).
// Habitación (cinemática) → final 2 (se lanza a la cámara), o huida: cierras la puerta del cruce, eliges
// izquierda/derecha, corres; a los pocos metros el ente revienta esa puerta, te mira, grita y te persigue;
// al fondo del primer tramo, la masa de manos se acerca saltando entre luces → «HAS MUERTO» o «HAS ESCAPADO».

import { THREE, crearMotor, luces, crearGlitchMalla, materialBrillo } from './ps1.js';
import { crearHabitacion } from './habitacion.js';
import { crearEnte, crearMano, poseEntrada, mezclarPoses, POSES } from './ente.js';
import { crearBrazoPared } from './brazos.js';
import { crearMasa } from './masa.js';
import { crearPasillos, PLATO } from './pasillo.js';
import { CAMARA, ENTE, ACCIONES, DURACION, MANO, ZOOM, ENTRADA_GLITCH_S, MOMENTOS } from './escenas.js';
import { muestrear, valorEn } from './linea.js';
import { CRUCE } from './recorrido.js';
import { createCarrera, tap, update, soltar, agarrar, distancia, PUERTA_M, AGARRE_TOQUES } from './carrera.js';
import { crearAcecho, actualizarAcecho, ACECHO } from './acecho.js';
import {
  portazo, paso, crearCoro, astillazo, voz, crearArrastre, crearFondo, crearZumbido, pasoMetal, chirrido,
  golpePuerta, encontrado,
} from './sonidos.js';
import { thump, scream, screamQTV } from '../audio.js';
import { createRng, createFlashGuard } from '../glitch.js';
import { ahiEstas, PSICOLOGO } from '../texts.js';
import { crearConsulta, vestir, SOFA, SILLON, CENTRO as CENTRO_CONSULTA } from './consulta.js';
import { cargarFotos, sombraEnte, halo } from './texturas.js';
import { crearJardin, CENTRO as CENTRO_JARDIN } from './jardin.js';
import { crearBarra, onda, aLocal } from './gesto.js';

const OJO_Y = 1.6;
const BALANCEO_M = 0.04;
const OJOS_CERCA_M = 2.6;
const ELEGIR_S = 4;
const LETRA_MS = 75;
// Los monstruos se mueven a 12 fps (la cámara y el resto, a los fps del móvil).
const FPS_MONSTRUO = 12;
const paso12 = (t) => Math.floor(t * FPS_MONSTRUO) / FPS_MONSTRUO;
// Boquete de la puerta derecha: la mano sale por aquí, un poco por debajo del centro.
const MANO_Y = 1.43, MANO_Z = 0.35;
// Puerta del cruce (pared x = −3,5 de la habitación).
const PUERTA_CRUCE_X = -3.5;
// Hacia dónde mira la cámara en el cruce (−x, de frente a la pared).
const RUMBO_CRUCE = Math.PI / 2;
// La masa salta entre luces mientras está lejos; más cerca de esto (m a la esquina) ya se mueve seguido.
// Golpes contra la puerta cerrada del cruce.
const GOLPE_CADA_MS = [650, 1100];
// La puerta del cruce revienta durante la carrera: duración de la escena (s).
const REVIENTA_S = 3.8;
// Brazos de la pared: cada cuánto sale uno (m), a veces dos a la vez, y a partir de qué ritmo (toques en el
// último segundo) no te agarra. Cuando te tiene cerca se tira hacia ti.
const BRAZO_CADA_M = [1.8, 3.2];
const BRAZO_PAR = 0.35; // probabilidad de que salgan dos (uno en cada pared)
const BRAZO_SE_TIRA_M = 1.6;
const RITMO_LIBRE = 5;
// Sombra del ente en la pared: aparece cuando está a menos de esto (m).
const SOMBRA_M = 4.5;
// Por la izquierda (24/10): tras la esquina de la masa salen todos los brazos a la vez (uno cada OLEADA_CADA_M,
// alternando paredes), y el último tramo tiene las dos paredes llenas de brazos que se tiran hacia ti sin
// agarrarte (salen SALIDA_DELANTE_M por delante de ti).
const OLEADA_CADA_M = 1.4;
const SALIDA_CADA_M = 1.5;
const SALIDA_DELANTE_M = 8;
const BRAZOS_POOL = 16;
// Zoom al ente cuando revienta la puerta del cruce (fov en grados; el normal es 68).
const FOV = 68;
const FOV_PUERTA = 26;
// Presentación de la masa: zoom rápido al fondo de su pasillo, la vemos cruzar a toda prisa y zoom de vuelta.
const MASA_S = 2.0;
// Gritos agónicos del ente mientras te persigue (ms entre uno y otro).
const GRITO_CADA_MS = [3500, 7000];
// Escena de muerte: distancias (m) a las que reaparece entre apagones, y poses de cada aparición.
const DISTANCIAS_MUERTE = [6, 4, 2.4, 1.2];
const POSES_MUERTE = ['acecho', 'retuerce', 'cuatroPatas', 'rodilla'];
// Huecos de luz durante la carrera.
const L_LINTERNA = 0, L_META = 1, L_MASA = 2;

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

const smooth = (u) => { const k = Math.max(0, Math.min(1, u)); return k * k * (3 - 2 * k); };

export async function iniciarJuego({ camino, reiniciar, nombre }) {
  const rng = createRng(Date.now() >>> 0);
  const guard = createFlashGuard(3);
  const contenedor = el('div', 'juego');
  const capa = el('div', 'juego-capa');
  contenedor.append(capa);
  document.body.append(contenedor);
  // En el móvil el juego va siempre en horizontal: si el navegador está en vertical (giro bloqueado, o aún sin
  // girar el móvil), se dibuja girado 90° y se avisa de que gires el móvil. Va antes que el motor, que mide
  // el contenedor al redimensionar.
  const tactil = window.matchMedia('(pointer: coarse)').matches;
  const orientar = () => {
    const girado = tactil && window.innerHeight > window.innerWidth;
    contenedor.classList.toggle('girado', girado);
  };
  orientar();
  window.addEventListener('resize', orientar);
  if (contenedor.classList.contains('girado')) {
    const gira = el('p', 'juego-gira', '⟳ gira el móvil');
    capa.append(gira);
    setTimeout(() => gira.remove(), 3500);
  }
  await Promise.all([document.fonts.load('44px "Rubik Wet Paint"').catch(() => {}), cargarFotos()]);

  const motor = crearMotor(contenedor);
  contenedor.prepend(motor.lienzo);
  const { escena, camara } = motor;
  const mira = new THREE.Vector3();
  let raf = 0;
  let apagado = false;
  const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const quitarInput = [];
  let coro = null;
  let arrastre = null;
  let zumbido = null;
  const fondo = crearFondo();
  fondo.volumen(1);

  // Negro total: se oculta el lienzo (más fiable que esconder la escena).
  const negro = (si) => { motor.lienzo.style.visibility = si ? 'hidden' : 'visible'; };
  const ponerFov = (f) => { if (camara.fov !== f) { camara.fov = f; camara.updateProjectionMatrix(); } };

  // Sacudida de cámara tras un golpe: desplazamiento al azar que se apaga solo.
  let sacudidaHasta = 0;
  let sacudidaFuerza = 0;
  const sacudir = (fuerza, ms = 300) => { sacudidaFuerza = fuerza; sacudidaHasta = performance.now() + ms; };
  const aplicarSacudida = (ahora) => {
    if (ahora > sacudidaHasta) return;
    const k = sacudidaFuerza * ((sacudidaHasta - ahora) / 300);
    camara.position.x += (rng() - 0.5) * 0.06 * k;
    camara.position.y += (rng() - 0.5) * 0.06 * k;
  };

  const pararSonidos = () => {
    coro?.parar(); coro = null;
    arrastre?.parar(); arrastre = null;
    zumbido?.parar(); zumbido = null;
  };

  const cerrar = () => {
    apagado = true;
    window.removeEventListener('resize', orientar);
    cancelAnimationFrame(raf);
    timers.forEach(clearTimeout);
    quitarInput.forEach((fn) => fn());
    pararSonidos();
    fondo.parar();
    luces.apagarTodas();
    motor.destruir();
    contenedor.remove();
  };

  const pantallaFinal = (titulo, clase, boton, alPulsar) => {
    capa.replaceChildren();
    const fin = el('div', `juego-final ${clase}`);
    fin.append(el('h1', 'juego-titulo', titulo));
    const b = el('button', 'otra-vez', boton);
    b.type = 'button';
    b.addEventListener('click', alPulsar);
    fin.append(b);
    capa.append(fin);
  };

  // «ahí estás, {nombre}», letra a letra, con un sonido grave por letra.
  let dialogo = null;
  const hablar = (texto) => {
    dialogo = el('p', 'juego-dialogo');
    capa.append(dialogo);
    [...texto].forEach((letra, i) => later(() => {
      if (!dialogo) return;
      dialogo.textContent += letra;
      if (letra.trim()) voz();
    }, i * LETRA_MS));
  };
  const callar = () => { dialogo?.remove(); dialogo = null; };

  // ---------- Mundo: habitación, pasillos, el ente, su mano y la masa ----------
  const hab = crearHabitacion(rng);
  const pasillos = crearPasillos(rng);
  const ente = crearEnte();
  const masa = crearMasa();
  const mano = crearMano();
  escena.add(hab.grupo, pasillos.grupo, ente.grupo, masa.grupo, mano.grupo);
  ente.grupo.visible = false;
  masa.grupo.visible = false;
  mano.grupo.visible = false;
  mano.grupo.rotation.y = -Math.PI / 2; // apunta hacia dentro de la habitación (−x)
  // Brazos de pared que se reutilizan durante la carrera.
  const brazosPared = Array.from({ length: BRAZOS_POOL }, (_, i) => crearBrazoPared(11 * (i + 1)));
  for (const b of brazosPared) { b.grupo.visible = false; escena.add(b.grupo); }
  // La luz roja de la masa, al fondo de su pasillo: un núcleo y un halo grande que siempre mira a la cámara (se
  // ve a lo lejos, sin niebla). La masa lleva el mismo halo cuando corre: la luz roja es ella.
  const crearHalo = (tam) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(tam, tam), materialBrillo({
      map: halo(), fog: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    m.renderOrder = 3;
    return m;
  };
  const luzRoja = new THREE.Group();
  luzRoja.add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 4), materialBrillo({ color: 0xff3020, fog: false })), crearHalo(2.6));
  luzRoja.visible = false;
  escena.add(luzRoja);
  const haloMasa = crearHalo(2.4);
  haloMasa.position.set(0, 1.3, 0.4);
  masa.grupo.add(haloMasa);
  // La sombra del ente en la pared cuando se te acerca.
  const sombra = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 2.4),
    materialBrillo({ map: sombraEnte(), color: 0x000000, transparent: true, depthWrite: false, opacity: 0 }));
  sombra.renderOrder = 2;
  sombra.visible = false;
  escena.add(sombra);
  // Paredes que se rompen con glitch cuando el ente las atraviesa.
  const glitchHab = crearGlitchMalla(hab.paredDerecha);
  const glitchCruce = crearGlitchMalla(pasillos.paredCruce);
  const PUERTA_HAB = new THREE.Vector3(3.5, 1.6, 0.35);
  const PUERTA_CRUCE = new THREE.Vector3(PUERTA_CRUCE_X, 1.5, CRUCE.z);
  escena.fog.color.set(0x000000);
  escena.fog.near = 3;
  escena.fog.far = 16;

  const parpadeo = (ms) => {
    if (!guard.tryFlash(performance.now())) return;
    hab.setLuz(false);
    later(() => hab.setLuz(true), ms);
  };
  // Posición de los ojos (para su brillo rojo en el boquete).
  const posOjos = () => ente.ojos[0].getWorldPosition(new THREE.Vector3());
  // Inclina al ente (sobre su pose) hasta que sus ojos quedan a la altura de los tuyos, y devuelve dónde quedan.
  // Al inclinarse los ojos bajan (en todas las poses salvo «despliega»), así que basta una búsqueda binaria.
  const ojosEnte = new THREE.Vector3();
  const ojosAlOjo = (max = 2.4) => {
    let lo = 0, hi = max;
    for (let i = 0; i < 9; i++) {
      const mid = (lo + hi) / 2;
      ente.agacharse(mid);
      ente.grupo.updateMatrixWorld(true);
      if (ente.ojos[0].getWorldPosition(ojosEnte).y > OJO_Y) lo = mid; else hi = mid;
    }
    ente.agacharse((lo + hi) / 2);
    ente.grupo.updateMatrixWorld(true);
    return ente.ojos[0].getWorldPosition(ojosEnte);
  };

  // ---------- Golpes contra la puerta cerrada del cruce ----------
  let golpeando = false;
  let proximoGolpe = 0;
  const golpear = (ahora) => {
    if (!golpeando || ahora < proximoGolpe) return;
    proximoGolpe = ahora + GOLPE_CADA_MS[0] + rng() * (GOLPE_CADA_MS[1] - GOLPE_CADA_MS[0]);
    golpePuerta(0.7 + rng() * 0.3);
    hab.temblarIzquierda(1);
    sacudir(0.35, 200);
    later(() => hab.temblarIzquierda(0), 120);
  };

  // ---------- Reloj de 12 fps del ente ----------
  // En cada fotograma nuevo decide si se congela (2–3 fotogramas) y si toca un fotograma roto, que también
  // rompe la pantalla (glitch del paso final) y chirría.
  let ultimoTic = -1;
  let asomado = false;
  let entraHasta = null; // hasta cuándo (s de la cinemática) dura la salida con mucho glitch
  let congelado = 0;
  let ultimoChirrido = 0;
  const ticEnte = (t, nivelForzado) => {
    // Con el tiempo congelado (depuración) el reloj sigue al real, para que el ente no se quede en una pose vieja.
    const tic = window.__tFijo !== undefined ? Math.floor(performance.now() / 83) : Math.floor(t * FPS_MONSTRUO);
    if (tic === ultimoTic) return false;
    ultimoTic = tic;
    if (congelado > 0) { congelado--; return false; }
    if (rng() < 0.05) congelado = 2 + Math.floor(rng() * 2);
    // Asomado tras la puerta, sin glitch (que se lean bien los ojos); al salir, mucho.
    const nivel = nivelForzado ?? (asomado ? 0 : entraHasta !== null && t < entraHasta ? 2 : 1);
    const roto = ente.grupo.visible && ente.tic(rng, nivel);
    motor.glitch(roto ? 1 : 0);
    if (roto && performance.now() - ultimoChirrido > 150) { chirrido(); ultimoChirrido = performance.now(); }
    return true;
  };

  // Pose base del ente en la cinemática: asomado en reposo; al salir, las poses de la entrada (una distinta por
  // fotograma); luego en pie, y al final se lanza (final 2) o te sigue al acecho (pasillo).
  const FOTOGRAMAS_SALIDA = Math.round(MOMENTOS.SALIDA_S * FPS_MONSTRUO);
  const poseCinematica = (t) => {
    if (t < MOMENTOS.SALE) return POSES.reposo;
    if (t < MOMENTOS.SALE + MOMENTOS.SALIDA_S) return poseEntrada(Math.floor((t - MOMENTOS.SALE) * FPS_MONSTRUO), FOTOGRAMAS_SALIDA);
    if (camino === 'final2' && t >= MOMENTOS.LANZA) return POSES.lanza;
    if (camino === 'pasillo' && t >= MOMENTOS.HUYE) return POSES.acecho;
    return POSES.enPie;
  };

  // Coloca al ente según sus claves en el tiempo t (posición, hacia dónde mira, inclinación y brazos).
  const posarEnte = (claves, t) => {
    ente.pose(poseCinematica(t));
    const e = muestrear(claves, t);
    ente.grupo.position.set(...e.pos);
    ente.grupo.rotation.y = Math.atan2(e.mira[0] - e.pos[0], e.mira[2] - e.pos[2]);
    const k = claves.findIndex((c) => c.t > t);
    const a0 = claves[Math.max(0, (k < 0 ? claves.length : k) - 1)];
    const a1 = claves[k < 0 ? claves.length - 1 : k];
    const u = a1.t > a0.t ? Math.min(1, Math.max(0, (t - a0.t) / (a1.t - a0.t))) : 1;
    ente.agacharse(a0.agachado + (a1.agachado - a0.agachado) * u);
    ente.abrir((a0.abre ?? 0) + ((a1.abre ?? 0) - (a0.abre ?? 0)) * u);
    const anda = a0.pos.some((v, i) => v !== a1.pos[i]) && u < 1;
    ente.andar(anda ? t * 5 : 0);
    // Cabeza que se ladea despacio, como estudiándote.
    ente.cabezaHacia(Math.sin(t * 0.8) * 0.45);
  };

  // La mano: ya está fuera del boquete y se retira despacio; mientras, los dedos se mueven.
  const posarMano = (t) => {
    const u = smooth((t - MANO.saleDesde) / (MANO.saleHasta - MANO.saleDesde));
    mano.grupo.position.set(MANO.dentro + (MANO.fuera - MANO.dentro) * u, MANO_Y, MANO_Z);
    mano.agarrar(0.35 + 0.35 * Math.sin(t * 7));
    if (t >= MANO.saleHasta) mano.grupo.visible = false;
  };

  // ---------- Cinemática de la habitación ----------
  let abreEn = null;
  let cierraEn = null;
  const cabezaEnte = new THREE.Vector3();
  const miraSuave = new THREE.Vector3();
  let ultimoCuadro = performance.now();
  const ejecutar = (a) => {
    switch (a.que) {
      case 'pantalla': hab.setPantalla(a.valor); break;
      case 'rompe':
        astillazo();
        hab.romper();
        mano.grupo.visible = true;
        parpadeo(160);
        sacudir(0.8, 350);
        fondo.volumen(0.5);
        break;
      case 'ojos':
        ente.grupo.visible = true;
        ente.oscuro(true);
        asomado = true;
        // Se abren despacio.
        [0, 0.25, 0.6, 1].forEach((u, i) => later(() => ente.parpadear(u), i * 140));
        ente.grupo.updateMatrixWorld(true);
        hab.luzOjos(posOjos());
        thump(0.25);
        coro = crearCoro();
        coro.setCercania(0.05);
        break;
      case 'dialogo': hablar(ahiEstas(nombre)); break;
      case 'callar': callar(); break;
      case 'explota':
        // La puerta estalla y, durante un segundo, no sale nada.
        asomado = false;
        ente.grupo.visible = false;
        hab.luzOjos(null);
        hab.estallar('derecha');
        portazo();
        astillazo();
        parpadeo(220);
        sacudir(1.6, 600);
        break;
      case 'sale':
        // Una luz tenue junto a la puerta, para que se le vea salir.
        luces.punto(3, [2.7, 2.3, 0.35], 0xffd8b0, 1.1, 2.6);
        ente.oscuro(false);
        ente.parpadear(1);
        ente.grupo.visible = true;
        entraHasta = a.t + ENTRADA_GLITCH_S;
        break;
      case 'encontrado': encontrado(); coro?.setCercania(0.5); break;
      case 'lanza': ente.boca(1); ente.alcanzar(1); ente.abrir(0); break;
      case 'grito': screamQTV(); sacudir(1.8, 900); coro?.setCercania(1); break;
      case 'abrePuerta': abreEn = performance.now(); break;
      case 'paso': paso(); break;
      case 'pasoEnte': pasoMetal(0.6); break;
      case 'cierra': cierraEn = performance.now(); later(() => { thump(0.7); ente.grupo.visible = false; }, 380); break;
      case 'golpes': golpeando = true; proximoGolpe = 0; break;
      default: break;
    }
  };

  const acciones = (ACCIONES[camino] ?? []).map((a) => ({ ...a, hecho: false }));
  const t0 = performance.now();

  const pintarHabitacion = (ahora) => {
    // window.__tFijo (solo para depurar) congela la cinemática en ese segundo.
    const t = window.__tFijo ?? (ahora - t0) / 1000;
    for (const a of acciones) if (!a.hecho && t >= a.t) { a.hecho = true; ejecutar(a); }
    hab.actualizarTrozos(Math.min(0.05, (ahora - ultimoCuadro) / 1000));
    ultimoCuadro = ahora;
    if (abreEn !== null && cierraEn === null) {
      hab.puertaIzquierda.rotation.y = 0.35 + 1.15 * smooth((ahora - abreEn) / 300);
    }
    if (cierraEn !== null) hab.puertaIzquierda.rotation.y = 1.5 * (1 - smooth((ahora - cierraEn) / 400));
    if (ticEnte(t)) {
      posarEnte(ENTE[camino], paso12(t));
      if (mano.grupo.visible) posarMano(paso12(t));
      // Mientras sale, la pared de la puerta se rompe a su alrededor.
      if (entraHasta !== null && t < entraHasta && rng() < 0.65) glitchHab.sacudir(PUERTA_HAB, 1.7, 0.2, rng);
      else glitchHab.restaurar();
    }
    golpear(ahora);
    const c = muestrear(CAMARA[camino], t);
    // Mientras sale y está en el marco, la mirada sigue a su cabeza (suavizado, para que no tiemble).
    const siguiendo = t >= MOMENTOS.SALE && t < (camino === 'final2' ? MOMENTOS.LANZA : MOMENTOS.HUYE);
    if (siguiendo) {
      ente.cabeza.getWorldPosition(cabezaEnte);
      miraSuave.lerp(cabezaEnte, 0.12);
      const k = Math.min(1, (t - MOMENTOS.SALE) / 0.6) * 0.75;
      c.mira = c.mira.map((v, i) => v + (miraSuave.getComponent(i) - v) * k);
    } else miraSuave.set(...c.mira);
    const fov = valorEn(ZOOM, t);
    if (camara.fov !== fov) { camara.fov = fov; camara.updateProjectionMatrix(); }
    camara.position.set(...c.pos);
    camara.lookAt(mira.set(...c.mira));
    aplicarSacudida(ahora);
    motor.render();
    return t >= DURACION[camino];
  };

  const bucleHabitacion = (ahora) => {
    if (apagado) return;
    if (pintarHabitacion(ahora)) {
      if (camino === 'final2') {
        pararSonidos();
        motor.glitch(0);
        negro(true);
        pantallaFinal('HAS MUERTO', 'muerte-juego', 'otra vez', () => { cerrar(); reiniciar(); });
      } else {
        elegir();
      }
      return;
    }
    raf = requestAnimationFrame(bucleHabitacion);
  };

  // ---------- Cruce y carrera ----------

  // Luz y niebla de los backrooms: amarillenta, con una linterna que va con la cámara.
  const ambientePasillo = () => {
    luces.apagarTodas();
    luces.ambiente(0x6a5f3a, 0.75);
    luces.punto(L_LINTERNA, [CRUCE.x, 2.2, CRUCE.z], 0xfff0c0, 1.4, 6.5);
    escena.fog.color.set(0x15120a);
    escena.fog.near = 2;
    escena.fog.far = 13;
    escena.background.set(0x15120a);
  };

  const camaraEn = (x, z, yaw, pitch = 0) => {
    camara.position.set(x, OJO_Y, z);
    camara.rotation.set(pitch, yaw, 0, 'YXZ');
  };

  // Gira la cámara de un rumbo a otro en ms y luego llama a hecho().
  const girar = (x, z, desde, hasta, ms, hecho) => {
    const ini = performance.now();
    const paso_ = (ahora) => {
      if (apagado) return;
      const u = Math.min(1, (ahora - ini) / ms);
      camaraEn(x, z, desde + (hasta - desde) * smooth(u));
      luces.mover(L_LINTERNA, [x, 2.2, z]);
      golpear(ahora);
      aplicarSacudida(ahora);
      motor.render();
      if (u < 1) { raf = requestAnimationFrame(paso_); return; }
      hecho();
    };
    raf = requestAnimationFrame(paso_);
  };

  // En el cruce, con la puerta cerrada a tu espalda recibiendo golpes: dos botones y 4 s para elegir.
  // Si no eliges, la revienta y te atrapa.
  function elegir() {
    motor.glitch(0);
    ponerFov(FOV);
    mano.grupo.visible = false;
    ente.grupo.visible = false;
    ente.oscuro(false);
    masa.grupo.visible = false;
    ente.boca(0);
    ente.alcanzar(0);
    ente.abrir(0);
    ente.pose('reposo');
    ente.cabezaHacia(0);
    for (const b of brazosPared) b.grupo.visible = false;
    sombra.visible = false;
    luzRoja.visible = false;
    glitchHab.restaurar();
    glitchCruce.restaurar();
    hab.rehacerIzquierda();
    negro(false);
    ambientePasillo();
    fondo.volumen(0);
    if (!zumbido) zumbido = crearZumbido();
    zumbido.volumen(1);
    if (!coro) coro = crearCoro();
    coro.setCercania(0.25);
    golpeando = true;
    camaraEn(CRUCE.x, CRUCE.z, RUMBO_CRUCE);
    motor.render();

    capa.replaceChildren();
    const caja = el('div', 'juego-eleccion');
    const bIzq = el('button', 'lado', '← IZQUIERDA');
    const bDer = el('button', 'lado', 'DERECHA →');
    bIzq.type = bDer.type = 'button';
    const tiempo = el('div', 'juego-tiempo');
    tiempo.style.animationDuration = `${ELEGIR_S}s`;
    caja.append(bIzq, bDer, tiempo);
    capa.append(caja);

    let elegido = false;
    const plazo = setTimeout(() => {
      // window.__sinPlazo (solo para depurar) desactiva la captura por no elegir.
      if (elegido || apagado || window.__sinPlazo) return;
      elegido = true;
      golpeando = false;
      capa.replaceChildren();
      hab.estallar('izquierda');
      portazo();
      escenaMuerte({ x: CRUCE.x, z: CRUCE.z, yaw: RUMBO_CRUCE + Math.PI });
    }, ELEGIR_S * 1000);
    timers.push(plazo);

    const elegirLado = (lado) => (ev) => {
      ev.stopPropagation();
      if (elegido) return;
      elegido = true;
      clearTimeout(plazo);
      capa.replaceChildren();
      const { recorrido } = pasillos.caminos[lado];
      girar(CRUCE.x, CRUCE.z, RUMBO_CRUCE, recorrido.poseEn(0).rumbo, 450, () => correr(lado));
    };
    bIzq.addEventListener('pointerdown', elegirLado('izquierda'));
    bDer.addEventListener('pointerdown', elegirLado('derecha'));

    // Mientras eliges, el coro sube y la puerta no para de recibir golpes.
    const ini = performance.now();
    const espera = (ahora) => {
      if (apagado || elegido) return;
      coro.setCercania(0.25 + 0.6 * Math.min(1, (ahora - ini) / (ELEGIR_S * 1000)));
      golpear(ahora);
      camaraEn(CRUCE.x, CRUCE.z, RUMBO_CRUCE);
      aplicarSacudida(ahora);
      motor.render();
      raf = requestAnimationFrame(espera);
    };
    raf = requestAnimationFrame(espera);
  }

  function correr(lado) {
    const { recorrido: rec, luzMeta } = pasillos.caminos[lado];
    luces.punto(L_META, luzMeta, 0xffffff, 2.5, 9);
    let c = createCarrera(rec.largo);
    let acecho = crearAcecho(rec.esquinaRecto);
    let empezado = false;
    let pausa = false;
    let ultimo = performance.now();
    let ultimoParpadeo = 0;
    let ultimoPaso = 0;
    let balanceo = 0;
    const r0 = rec.segmentos[rec.tramoRecto].rumbo; // la masa viene de frente por ese tramo
    let ultimoTicMasa = -1;
    let proximoGrito = 0;
    const toquesRecientes = [];
    capa.replaceChildren();
    const barra = crearBarra(tactil);
    barra.mostrar(capa);
    let masaVista = false;
    const ojos = el('div', 'juego-ojos');
    ojos.append(el('span', 'ojo-rojo'), el('span', 'ojo-rojo'));
    capa.append(ojos);

    const alTocar = (ev) => {
      if (ev.type === 'keydown' && ev.code !== 'Space') return;
      if (ev.type === 'keydown') ev.preventDefault();
      if (c.estado !== 'corriendo' || pausa) return;
      if (!empezado) { empezado = true; ultimo = performance.now(); }
      const agarrado = c.agarre > 0;
      c = tap(c);
      toquesRecientes.push(performance.now());
      balanceo = agarrado ? 0.4 : 1;
      if (ev.type === 'pointerdown') {
        const q = aLocal(ev.clientX, ev.clientY, contenedor.classList.contains('girado'), contenedor.clientHeight);
        onda(capa, q.x, q.y, agarrado);
      }
      if (agarrado) sacudir(0.5, 120); else paso();
    };
    contenedor.addEventListener('pointerdown', alTocar);
    window.addEventListener('keydown', alTocar);
    const quitarToques = () => {
      contenedor.removeEventListener('pointerdown', alTocar);
      window.removeEventListener('keydown', alTocar);
    };
    quitarInput.push(quitarToques);

    // ----- La masa: al fondo del pasillo sin salida solo se ve su luz roja; al salir, corre a toda prisa -----
    const posarMasa = () => {
      const fondo = rec.recto(rec.sigueRecto - 1);
      if (acecho.estado === 'espera') {
        // La luz roja, quieta al fondo, después de verla cruzar; late y brilla más cuanto más te acercas.
        const visible = masaVista;
        luzRoja.visible = visible;
        if (!visible) return;
        const ini = rec.segmentos[rec.tramoRecto].desde;
        const k = Math.max(0, Math.min(1, (c.jugador - ini) / (acecho.esquina - ACECHO.antesM - ini)));
        const latido = 0.5 + 0.5 * Math.sin((performance.now() / 1000) * (3 + 9 * k));
        luzRoja.position.set(fondo.x, 1.5, fondo.z);
        luzRoja.children[0].scale.setScalar(1 + k * 0.8);
        luzRoja.children[1].lookAt(camara.position);
        luzRoja.children[1].scale.setScalar((0.9 + 1.6 * k) * (0.85 + 0.3 * latido) * (0.9 + rng() * 0.2));
        luces.punto(L_MASA, [fondo.x, 1.6, fondo.z], 0xff2010, (1.2 + 2.5 * k) * (0.7 + 0.3 * latido), 6 + 6 * k);
        return;
      }
      luzRoja.visible = false;
      if (acecho.estado !== 'corre' && acecho.estado !== 'esquivado') return;
      const q = rec.recto(acecho.pos);
      masa.grupo.visible = true;
      masa.grupo.position.set(q.x, 0, q.z);
      masa.grupo.rotation.y = r0;
      haloMasa.visible = true;
      haloMasa.lookAt(camara.position);
      luces.punto(L_MASA, [q.x, 2.0, q.z], 0xff2a1a, 2.2, 5);
    };

    // ----- Brazos de la pared: salen delante de ti; si pasas despacio, te agarran -----
    let proximoBrazo = rec.brazos ? rec.brazos[0] + 2 : Infinity;
    const brazos = []; // { b, d, nace, estado: 'sale' | 'agarra' | 'vuelve', desde }
    // Para depurar desde la consola cuando se entra por un atajo de prueba.
    if (window.location.hash.startsWith('#juego-')) window.__carrera = () => ({ c, brazos: brazos.map((a) => [a.d, a.estado]), proximoBrazo, toques: toquesRecientes.length });
    const colocarBrazo = (b, d, lado) => {
      const p = rec.poseEn(d);
      const dir = [-Math.sin(p.rumbo), -Math.cos(p.rumbo)];
      const der = [-dir[1], dir[0]];
      const g = b.grupo;
      const donde = lado ? 0 : rng();
      if (donde < 0.7) {
        const s = lado ?? (rng() < 0.5 ? 1 : -1);
        g.position.set(p.x + der[0] * s * 0.79, 0.9 + rng() * 0.9, p.z + der[1] * s * 0.79);
        g.rotation.set(0, Math.atan2(-der[0] * s, -der[1] * s), 0, 'YXZ');
      } else if (donde < 0.85) {
        g.position.set(p.x, 2.49, p.z);
        g.rotation.set(Math.PI / 2, p.rumbo, 0, 'YXZ');
      } else {
        g.position.set(p.x, 0.01, p.z);
        g.rotation.set(-Math.PI / 2, p.rumbo, 0, 'YXZ');
      }
      g.visible = true;
      b.salir(0);
    };
    const sacarBrazo = (d, lado, nace, decorativo) => {
      const libre = brazosPared.find((b) => !brazos.some((a) => a.b === b));
      if (!libre) return false;
      colocarBrazo(libre, d, lado);
      brazos.push({ b: libre, d, nace, estado: 'sale', base: libre.grupo.quaternion.clone(), decorativo });
      return true;
    };
    let oleadaHecha = false;
    let proximoSalida = rec.salida ? rec.salida[0] : Infinity;
    const moverBrazos = (ahora) => {
      if (rec.brazos && c.jugador >= proximoBrazo - 3.2 && proximoBrazo <= rec.brazos[1]) {
        const par = rng() < BRAZO_PAR;
        for (const lado of par ? [1, -1] : [undefined]) {
          if (!sacarBrazo(proximoBrazo + (lado === -1 ? 0.5 : 0), lado, ahora, false)) break;
        }
        astillazo();
        proximoBrazo += BRAZO_CADA_M[0] + rng() * (BRAZO_CADA_M[1] - BRAZO_CADA_M[0]);
      }
      // Todos a la vez, uno tras otro en un abrir y cerrar de ojos, nada más girar la esquina de la masa.
      if (rec.oleada && !oleadaHecha && c.jugador >= rec.oleada[0] - 1.2) {
        oleadaHecha = true;
        let i = 0;
        for (let d = rec.oleada[0]; d <= rec.oleada[1]; d += OLEADA_CADA_M, i++) sacarBrazo(d, i % 2 ? 1 : -1, ahora + i * 60, false);
        astillazo();
        golpePuerta(0.8);
        sacudir(0.9, 400);
        scream(0.35, 'medio');
      }
      // La salida, con las dos paredes llenas.
      while (rec.salida && proximoSalida <= rec.salida[1] && c.jugador >= proximoSalida - SALIDA_DELANTE_M) {
        if (!sacarBrazo(proximoSalida, 1, ahora, true)) break;
        sacarBrazo(proximoSalida + SALIDA_CADA_M / 2, -1, ahora, true);
        proximoSalida += SALIDA_CADA_M;
      }
      for (let i = brazos.length - 1; i >= 0; i--) {
        const a = brazos[i];
        if (a.estado === 'sale') {
          a.b.salir((ahora - a.nace) / 500);
          // Cuando te tiene cerca se tira hacia ti, con la mano abriéndose y cerrándose para cogerte.
          const falta = a.d - c.jugador;
          if (falta < BRAZO_SE_TIRA_M && falta > -0.6) {
            a.b.grupo.lookAt(camara.position.x, camara.position.y - 0.25, camara.position.z);
            a.b.agarrar(0.4 + 0.6 * Math.max(0, 1 - Math.abs(falta) / BRAZO_SE_TIRA_M));
          } else {
            a.b.grupo.quaternion.copy(a.base);
            a.b.agarrar(0.2);
          }
          if (Math.abs(falta) < 0.25 && !a.rozado) { a.rozado = true; sacudir(0.5, 150); golpePuerta(0.25); }
          if (!a.decorativo && Math.abs(c.jugador - a.d) < 0.6 && c.agarre === 0 && toquesRecientes.length < RITMO_LIBRE) {
            a.estado = 'agarra';
            c = agarrar(c);
            a.b.salir(1);
            a.b.agarrar(1);
            scream(0.5, 'medio');
            golpePuerta(0.6);
            sacudir(1.2, 400);
            vibrar();
          } else if (c.jugador > a.d + 1.0) { a.estado = 'vuelve'; a.desde = ahora; }
        } else if (a.estado === 'agarra') {
          if (c.agarre === 0) { a.estado = 'vuelve'; a.desde = ahora; }
        } else {
          a.b.salir(1 - (ahora - a.desde) / 400);
          if (ahora - a.desde > 400) { a.b.grupo.visible = false; brazos.splice(i, 1); }
        }
      }
    };

    // ----- La sombra del ente en la pared cuando se acerca, y las luces que parpadean -----
    const moverSombra = (ahora) => {
      const dist = distancia(c);
      if (!c.suelto || dist >= SOMBRA_M) { sombra.visible = false; return; }
      const cerca = 1 - dist / SOMBRA_M;
      const p = rec.poseEn(c.jugador + 1.3);
      const dir = [-Math.sin(p.rumbo), -Math.cos(p.rumbo)];
      const der = [-dir[1], dir[0]];
      const s = Math.floor(ahora / 2600) % 2 ? 1 : -1;
      sombra.visible = true;
      sombra.position.set(p.x + der[0] * s * 0.78, 1.25, p.z + der[1] * s * 0.78);
      sombra.rotation.set(0, Math.atan2(-der[0] * s, -der[1] * s), 0);
      sombra.scale.set(0.8 + cerca * 0.5, 0.85 + cerca * 0.4, 1);
      sombra.material.opacity = (rng() < 0.15 ? 0.25 : 0.85) * cerca;
      if (cerca > 0.35 && rng() < 0.25) {
        pasillos.parpadeo(rng);
        luces.punto(L_LINTERNA, [p.x, 2.2, p.z], 0xfff0c0, 0.5 + rng() * 1.0, 6.5);
      }
    };

    // ----- La puerta del cruce revienta: te giras, sale el ente, te mira despacio, grita -----
    let revientaDesde = 0;
    let gritado = false;
    let escenaPausa = null;
    const reventar = (ahora) => {
      pausa = true;
      escenaPausa = escenaRevienta;
      revientaDesde = ahora;
      gritado = false;
      golpeando = false;
    };

    // ----- Presentación de la masa: zoom rápido al fondo de su pasillo; la vemos cruzar a toda prisa y salir de
    // cuadro; zoom de vuelta y sigues corriendo, ya con su luz roja al fondo -----
    let masaDesde = 0;
    let masaGrito = false;
    const presentarMasa = (ahora) => {
      pausa = true;
      escenaPausa = escenaMasa;
      masaDesde = ahora;
      masaGrito = false;
      thump(0.5);
    };
    const escenaMasa = (ahora) => {
      const t = (ahora - masaDesde) / 1000;
      const p = rec.poseEn(c.jugador);
      // Sale del fondo y corre hacia ti a 12 m/s; el zoom la sigue y se cierra hasta que no cabe en la pantalla.
      const avance = 12 * smooth((t - 0.3) / 1.2) * 1.2;
      const q = rec.recto(rec.sigueRecto - 0.8 - avance);
      const lejos = Math.hypot(q.x - p.x, q.z - p.z);
      const alto = 0.75 - 0.5 * smooth((t - 0.3) / 1.2); // medio alto del plano (m): de pecho a la cara
      const fovCerca = (2 * Math.atan(alto / lejos) * 180) / Math.PI;
      const u = smooth(t / 0.3) * (1 - smooth((t - 1.5) / 0.3));
      ponerFov(FOV + (fovCerca - FOV) * u);
      camaraEn(p.x, p.z, p.rumbo, Math.atan2(1.5 - OJO_Y, lejos) * u);
      if (t >= 0.15 && t < 1.5) {
        masa.grupo.visible = true;
        haloMasa.visible = false; // con el zoom, el halo lo taparía todo
        masa.grupo.position.set(q.x, 0, q.z);
        masa.grupo.rotation.y = r0;
        luces.punto(L_MASA, [q.x, 2.0, q.z], 0xff2a1a, 2.4, 5);
        if (!masaGrito && t >= 0.35) { masaGrito = true; scream(0.8, 'abierto'); sacudir(0.6, 300); }
      } else if (t >= 1.5) {
        // Corte: al abrir el plano ya no está; solo queda su luz al fondo.
        masa.grupo.visible = false;
        masaVista = true;
      }
      if (t >= MASA_S) {
        pausa = false;
        masaVista = true;
        ponerFov(FOV);
        masa.grupo.visible = false;
        ultimo = ahora;
      }
    };
    const escenaRevienta = (ahora) => {
      const t = (ahora - revientaDesde) / 1000;
      const p = rec.poseEn(c.jugador);
      const ida = smooth(t / 0.45);
      const vuelta = smooth((t - (REVIENTA_S - 0.35)) / 0.35);
      camaraEn(p.x, p.z, p.rumbo + Math.PI * (ida - vuelta), 0);
      // Zoom al ente mientras sale (se ve pequeño a 6 m) y de vuelta al girarte.
      const zoom = smooth((t - 0.5) / 0.5) * (1 - vuelta);
      ponerFov(FOV + (FOV_PUERTA - FOV) * zoom);
      escena.fog.far = 13 + 9 * zoom; // con el zoom, la niebla no se lo come
      if (t >= 0.25 && !hab.izquierdaRota()) {
        hab.estallar('izquierda');
        portazo();
        astillazo();
        sacudir(1.4, 500);
      }
      hab.actualizarTrozos(1 / 60);
      // Mientras sale, la pared de la puerta se rompe a su alrededor.
      if (t >= 0.25 && t < 1.9 && rng() < 0.6) glitchCruce.sacudir(PUERTA_CRUCE, 1.5, 0.2, rng);
      else glitchCruce.restaurar();
      if (t >= 0.6) {
        // Sale a cuatro patas hacia el cruce; se levanta de espaldas a ti y gira la cabeza 180° hasta mirarte.
        const u = smooth((t - 0.6) / 1.2);
        const x = PUERTA_CRUCE_X + 0.3 + (CRUCE.x + 0.4 - (PUERTA_CRUCE_X + 0.3)) * u;
        const haciaTi = Math.atan2(p.x - x, p.z - CRUCE.z);
        ente.grupo.visible = true;
        ente.grupo.position.set(x, 0, CRUCE.z);
        if (ticEnte(t + 3000, t < 2.0 ? 2 : 1)) {
          if (t < 1.8) {
            ente.grupo.rotation.y = -Math.PI / 2;
            ente.pose('cuatroPatas');
            ente.andar(t * 6);
            ojosAlOjo();
          } else {
            ente.grupo.rotation.y = haciaTi + Math.PI; // de espaldas
            ente.andar(0);
            ente.pose(t >= 2.9 ? 'grito' : mezclarPoses(POSES.cuatroPatas, POSES.enPie, smooth((t - 1.8) / 0.5)));
            ente.cabezaHacia(Math.PI * smooth((t - 2.15) / 0.75));
            ojosAlOjo(); // encorvado, con la cabeza a tu altura (y bajo el techo de 2,5 m)
          }
        }
        if (!gritado && t >= 2.9) {
          gritado = true;
          ente.boca(1);
          screamQTV();
          sacudir(1.4, 700);
          coro?.setCercania(1);
        }
      }
      if (t >= REVIENTA_S) {
        pausa = false;
        ponerFov(FOV);
        escena.fog.far = 13;
        motor.glitch(0);
        glitchCruce.restaurar();
        ente.grupo.visible = false;
        ente.boca(0);
        ente.cabezaHacia(0);
        ente.pose('reposo');
        c = soltar(c, 0);
        ultimo = ahora;
      }
    };

    const bucle = (ahora) => {
      if (apagado) return;
      const dt = (ahora - ultimo) / 1000;
      ultimo = ahora;
      if (empezado && !pausa) {
        c = update(c, dt);
        const antes = acecho.estado;
        acecho = actualizarAcecho(acecho, c.jugador, dt);
        if (antes === 'espera' && acecho.estado === 'corre') {
          // Sale disparada: grito de todas a la vez y sus pasos encima.
          scream(0.9, 'abierto');
          sacudir(0.8, 400);
          arrastre = crearArrastre();
          arrastre.setCercania(1);
        }
        if (acecho.estado === 'fuera' && antes !== 'fuera') {
          masa.grupo.visible = false;
          luces.apagar(L_MASA);
          arrastre?.parar();
          arrastre = null;
        }
        if (!c.suelto && c.jugador >= PUERTA_M) reventar(ahora);
        else if (!masaVista && c.jugador >= rec.segmentos[rec.tramoRecto].desde + 1.2) presentarMasa(ahora);
      }
      while (toquesRecientes.length && ahora - toquesRecientes[0] > 1000) toquesRecientes.shift();
      barra.actualizar({ toques: toquesRecientes.length, empezado, avisar: c.suelto, agarre: c.agarre, total: AGARRE_TOQUES, oculta: pausa, guia: !c.suelto });
      balanceo = Math.max(0, balanceo - dt * 6);
      const p = rec.poseEn(c.jugador);
      if (pausa) escenaPausa(ahora);
      else {
        camaraEn(p.x, p.z, p.rumbo);
        camara.position.y += Math.sin(balanceo * Math.PI) * BALANCEO_M;
        golpear(ahora);
      }
      aplicarSacudida(ahora);
      luces.mover(L_LINTERNA, [p.x, 2.2, p.z]);
      if (!pausa) {
        const cerca = c.suelto ? 1 - Math.min(1, distancia(c) / (PUERTA_M + 1)) : 0.2;
        coro.setCercania(empezado ? cerca : 0.15);
        // Pasos metálicos del ente detrás de ti, más seguidos y fuertes cuanto más cerca, y sus gritos agónicos.
        if (c.suelto && ahora - ultimoPaso > 420) { pasoMetal(cerca); ultimoPaso = ahora; }
        if (c.suelto && ahora > proximoGrito) {
          if (proximoGrito) scream(0.25 + 0.5 * cerca, 'medio');
          proximoGrito = ahora + GRITO_CADA_MS[0] + rng() * (GRITO_CADA_MS[1] - GRITO_CADA_MS[0]);
        }
        moverBrazos(ahora);
        moverSombra(ahora);
      }

      // La masa y los brazos, a 12 fps.
      const ticMasa = Math.floor((ahora / 1000) * FPS_MONSTRUO);
      if (ticMasa !== ultimoTicMasa) {
        ultimoTicMasa = ticMasa;
        for (const a of brazos) a.b.tic(rng);
        if (!pausa || escenaPausa !== escenaMasa || masaVista) posarMasa();
        if (masa.grupo.visible) masa.animar(ticMasa * 2.2, rng);
        const hueco = (acecho.esquina - c.jugador) + (acecho.pos ?? ACECHO.distanciaM);
        arrastre?.setCercania(1 - Math.min(1, hueco / 30));
      }

      // Ojos rojos asomando por el borde cuando el ente está cerca.
      if (empezado && !pausa && distancia(c) < OJOS_CERCA_M && rng() < dt * 2.5 && guard.tryFlash(ahora)) {
        ojos.style.setProperty('--lado', rng() < 0.5 ? '0' : '1');
        ojos.classList.add('on');
        later(() => ojos.classList.remove('on'), 90);
      }
      if (ahora - ultimoParpadeo > 700 && rng() < 0.05) { pasillos.parpadeo(rng); ultimoParpadeo = ahora; }
      motor.render();
      const limpiar = () => {
        quitarToques();
        luzRoja.visible = false;
        barra.quitar();
        sombra.visible = false;
        for (const a of brazos) a.b.grupo.visible = false;
      };
      if (acecho.estado === 'atrapa') {
        limpiar();
        muerteMasa();
        return;
      }
      if (c.estado === 'atrapado') {
        limpiar();
        // En el plató, siempre igual (24/10).
        escenaMuerte({ x: PLATO.x, z: PLATO.z - 3, yaw: 0, rnd: createRng(1313), fija: true });
        return;
      }
      if (c.estado === 'escapado') { limpiar(); escapar(); return; }
      raf = requestAnimationFrame(bucle);
    };
    raf = requestAnimationFrame(bucle);
  }

  const terminarMuerte = () => {
    pararSonidos();
    golpeando = false;
    negro(true);
    pantallaFinal('HAS MUERTO', 'muerte-juego', 'repetir', () => elegir());
  };

  const vibrar = () => {
    // Solo vibra si ya hubo un toque real (si no, el navegador lo bloquea y avisa en consola).
    if (navigator.vibrate && navigator.userActivation?.hasBeenActive !== false) navigator.vibrate([200, 80, 400]);
  };

  // Muerte del ente: negro; miras hacia él (yaw) y, entre apagones, reaparece cada vez más cerca y en otra pose,
  // como a saltos, hasta tenerlo encima: susto y grito. Los apagones son oscuridad, no destellos.
  // fija (muertes de la carrera, 24/10): en el plató, con el azar sembrado (siempre igual), negro más corto y al
  // final se te tira a la cara.
  function escenaMuerte({ x, z, yaw, rnd = rng, fija = false }) {
    const dir = [-Math.sin(yaw), -Math.cos(yaw)];
    const colocar = (dist, k) => {
      const final = k === 'final';
      // En el susto final, la pose de reposo con la boca abierta.
      const nombre = final ? 'reposo' : POSES_MUERTE[k % POSES_MUERTE.length];
      const px = x + dir[0] * (dist + 1.5);
      const pz = z + dir[1] * (dist + 1.5);
      ente.grupo.visible = true;
      ente.grupo.position.set(px, 0, pz);
      ente.grupo.rotation.y = Math.atan2(x - px, z - pz);
      ente.pose(nombre);
      ente.andar(0);
      ente.abrir(0);
      ente.cabezaHacia(0);
      ente.alcanzar(final ? 0.8 : 0);
      ente.boca(final ? 1 : 0);
      // Los ojos a la altura de los tuyos, centrados y a dist m de ti (la inclinación los adelanta: se corrige
      // moviéndolo).
      ojosAlOjo();
      const o = ente.ojos.reduce((m, ojo) => m.add(ojo.getWorldPosition(new THREE.Vector3())), new THREE.Vector3())
        .divideScalar(ente.ojos.length);
      const der = [-dir[1], dir[0]];
      const hay = (o.x - x) * dir[0] + (o.z - z) * dir[1];
      const lado = (o.x - x) * der[0] + (o.z - z) * der[1];
      ente.grupo.position.x += dir[0] * (dist - hay) - der[0] * lado;
      ente.grupo.position.z += dir[1] * (dist - hay) - der[1] * lado;
    };
    if (fija) {
      ambientePasillo();
      luces.mover(L_LINTERNA, [x, 2.2, z]);
      luces.apagar(L_META);
    }
    ponerFov(FOV);
    vibrar();
    thump(0.6);
    negro(true);
    const INI = fija ? 0.3 : 0.5;
    const inicio = performance.now();
    let aparicion = -1;
    let gritoEn = null;
    let ultimoTicM = -1;
    const FIN = INI + 0.6 * DISTANCIAS_MUERTE.length + 1.1;
    const bucleM = (ahora) => {
      if (apagado) return;
      const t = (ahora - inicio) / 1000;
      camaraEn(x, z, yaw, 0);
      hab.actualizarTrozos(1 / 60);
      if (t >= INI) {
        const k = Math.floor((t - INI) / 0.6);
        if (k < DISTANCIAS_MUERTE.length) {
          if (k !== aparicion) { aparicion = k; colocar(DISTANCIAS_MUERTE[k], k); pasoMetal(0.4 + k * 0.2); }
          negro((t - INI) % 0.6 > 0.35);
        } else if (gritoEn === null) {
          gritoEn = t;
          colocar(fija ? 1.3 : 0.5, 'final');
          negro(false);
          screamQTV();
          sacudir(1.8, 900);
          coro?.setCercania(1);
        } else if (fija) {
          // Se te tira a la cara.
          colocar(1.3 - 0.85 * smooth((t - gritoEn) / 0.25), 'final');
        }
      }
      const tic = Math.floor(t * FPS_MONSTRUO);
      if (tic !== ultimoTicM) {
        ultimoTicM = tic;
        motor.glitch(ente.tic(rnd, 1) ? 1 : 0);
      }
      aplicarSacudida(ahora);
      motor.render();
      if (t < FIN) { raf = requestAnimationFrame(bucleM); return; }
      motor.glitch(0);
      ente.grupo.visible = false;
      terminarMuerte();
    };
    raf = requestAnimationFrame(bucleM);
  }

  // Muerte de la masa (24/10), en el plató y siempre igual: un instante de negro y, de golpe, las cuatro encima de
  // ti gritándote en la cara con todas las manos hacia la cámara (jumpscare); luego negro.
  function muerteMasa() {
    const rnd = createRng(2424);
    const x = PLATO.x, z = PLATO.z - 3, yaw = 0;
    const dir = [-Math.sin(yaw), -Math.cos(yaw)];
    ambientePasillo();
    luces.mover(L_LINTERNA, [x, 2.2, z]);
    ponerFov(FOV);
    vibrar();
    negro(true);
    haloMasa.visible = false;
    const colocar = (dist) => {
      const px = x + dir[0] * dist, pz = z + dir[1] * dist;
      // Un poco hundida: así sus cabezas quedan a la altura de tus ojos (los pies no se ven).
      masa.grupo.position.set(px, -0.15, pz);
      masa.grupo.rotation.y = Math.atan2(x - px, z - pz);
      luces.punto(L_MASA, [px, 2.0, pz], 0xff2a1a, 2.4, 5);
    };
    const inicio = performance.now();
    let grito = false;
    let ultimoTicM = -1;
    const bucleM = (ahora) => {
      if (apagado) return;
      const t = (ahora - inicio) / 1000;
      camaraEn(x, z, yaw, 0);
      if (t >= 0.3 && t < 1.15) {
        if (!grito) {
          grito = true;
          negro(false);
          masa.grupo.visible = true;
          screamQTV();
          scream(0.9, 'abierto');
          sacudir(2.2, 1000);
          coro?.setCercania(1);
        }
        // Encima de ti y aún se te echa un poco más.
        colocar(1.35 - 0.25 * smooth((t - 0.3) / 0.2));
        const tic = Math.floor(t * FPS_MONSTRUO);
        if (tic !== ultimoTicM) {
          ultimoTicM = tic;
          motor.glitch(masa.posar('final', rnd) ? 1 : 0);
        }
        masa.alcanzar(camara.position);
      } else if (t >= 1.15) {
        negro(true);
      }
      aplicarSacudida(ahora);
      motor.render();
      if (t < 1.6) { raf = requestAnimationFrame(bucleM); return; }
      motor.glitch(0);
      masa.grupo.visible = false;
      luces.apagar(L_MASA);
      terminarMuerte();
    };
    raf = requestAnimationFrame(bucleM);
  }

  // Llegas: flash blanco y apareces en el jardín (3D, mismo estilo); la cámara mira alrededor despacio y sale
  // «HAS ESCAPADO».
  function escapar() {
    pararSonidos();
    golpeando = false;
    thump(0.6);
    capa.replaceChildren(el('div', 'juego-flash'));
    later(() => {
      const jardin = crearJardin(rng);
      escena.add(jardin.grupo);
      jardin.encender(escena);
      ente.grupo.visible = false;
      masa.grupo.visible = false;
      motor.glitch(0);
      capa.replaceChildren();
      later(() => pantallaFinal('HAS ESCAPADO', 'escapado', 'otra vez', () => { cerrar(); reiniciar(); }), 1800);
      const inicio = performance.now();
      const paseo = (ahora) => {
        if (apagado) return;
        const t = (ahora - inicio) / 1000;
        camaraEn(CENTRO_JARDIN.x, CENTRO_JARDIN.z + 3 - Math.min(t, 6) * 0.25, Math.sin(t * 0.25) * 0.35, 0.05);
        motor.render();
        raf = requestAnimationFrame(paseo);
      };
      raf = requestAnimationFrame(paseo);
    }, 700);
  }

  // Para depurar desde la consola cuando se entra por un atajo de prueba.
  if (window.location.hash.startsWith('#juego-')) window.__juego = { THREE, motor, ente, masa, mano, camara, escena, hab, pasillos, muerteMasa, escenaMuerte, PLATO, createRng };

  // Final del psicólogo: negro; estás sentado en el sofá de una consulta; giras la cabeza y el ente está en el
  // sillón de al lado, con sombrero y cigarrillo: «{nombre}, hablemos un poco de tu vida». Luego, a negro:
  // «vete al psicólogo».
  function psicologo() {
    const consulta = crearConsulta(rng);
    escena.add(consulta.grupo);
    consulta.encender(escena);
    fondo.volumen(0.4);
    const sofa = SOFA.clone().add(CENTRO_CONSULTA);
    const sillon = SILLON.clone().add(CENTRO_CONSULTA);
    ente.grupo.visible = true;
    ente.grupo.position.copy(sillon).add(new THREE.Vector3(0, 0.05, 0));
    ente.grupo.rotation.y = Math.atan2(sofa.x - sillon.x, sofa.z - sillon.z);
    ente.pose('sentado');
    const humo = vestir(ente, camara, escena);
    const cabezaMundo = new THREE.Vector3();
    const objetivo = new THREE.Vector3(sofa.x, 1.0, sofa.z - 3);
    const alFrente = objetivo.clone();
    negro(true);
    const inicio = performance.now();
    let hablo = false;
    let cerrado = false;
    let proximoTic = 0;
    const bucleP = (ahora) => {
      if (apagado) return;
      const t = (ahora - inicio) / 1000;
      if (t >= 1.2) negro(false);
      // Tic tac del reloj.
      if (ahora > proximoTic) { thump(0.05); proximoTic = ahora + 1000; }
      ente.cabeza.getWorldPosition(cabezaMundo);
      // Mira al frente; a los 2,5 s gira despacio la cabeza hacia el sillón.
      const u = smooth((t - 2.5) / 2.0);
      objetivo.copy(alFrente).lerp(cabezaMundo, u);
      camara.position.copy(sofa);
      camara.lookAt(objetivo);
      // El ente gira la cabeza hacia ti cuando lo miras, y habla.
      ente.cabezaHacia(-0.6 * smooth((t - 4.3) / 0.6));
      if (!hablo && t >= 5.0) { hablo = true; hablar(PSICOLOGO.frase(nombre)); }
      const tic = Math.floor(t * FPS_MONSTRUO);
      if (tic !== ultimoTic) {
        ultimoTic = tic;
        motor.glitch(ente.tic(rng, t > 5 ? 1 : 0) ? 1 : 0);
        humo.tic(t, rng);
      }
      motor.render();
      if (t >= 9.6 && !cerrado) {
        cerrado = true;
        callar();
        motor.glitch(0);
        negro(true);
        pantallaFinal(PSICOLOGO.cierre, 'psicologo-fin', 'otra vez', () => { cerrar(); reiniciar(); });
        return;
      }
      raf = requestAnimationFrame(bucleP);
    };
    raf = requestAnimationFrame(bucleP);
  }

  // Atajos de prueba #juego-cruce (salta la habitación) y el final del psicólogo.
  if (camino === 'cruce') { elegir(); return; }
  if (camino === 'psicologo') { psicologo(); return; }
  raf = requestAnimationFrame(bucleHabitacion);
}

// La encuesta avisa al terminar; el juego se encarga si el navegador puede con WebGL.
window.addEventListener('encuesta:fin', (ev) => {
  if (!soportaWebGL()) return;
  ev.preventDefault();
  iniciarJuego(ev.detail).catch((e) => {
    console.error(e);
    document.querySelector('.juego')?.remove();
    ev.detail.alFallar?.();
  });
});
