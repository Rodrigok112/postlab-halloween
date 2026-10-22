// El juego: toma el control cuando la encuesta termina (evento «encuesta:fin»).
// Habitación (cinemática) → final 2 (se lanza a la cámara), o huida: cierras la puerta del cruce, eliges
// izquierda/derecha, corres; a los pocos metros el ente revienta esa puerta, te mira, grita y te persigue;
// al fondo del primer tramo, la masa de manos se acerca saltando entre luces → «HAS MUERTO» o «HAS ESCAPADO».

import { THREE, crearMotor, luces } from './ps1.js';
import { crearHabitacion } from './habitacion.js';
import { crearEnte, crearMano } from './ente.js';
import { crearMasa } from './masa.js';
import { crearPasillos } from './pasillo.js';
import { CAMARA, ENTE, ACCIONES, DURACION, MANO, ZOOM, ENTRADA_GLITCH_S } from './escenas.js';
import { muestrear, valorEn } from './linea.js';
import { CRUCE } from './recorrido.js';
import { createCarrera, tap, update, soltar, distancia, PUERTA_M } from './carrera.js';
import { crearAcecho, actualizarAcecho, ACECHO } from './acecho.js';
import {
  portazo, paso, crearCoro, astillazo, voz, crearArrastre, crearFondo, crearZumbido, pasoMetal, chirrido,
  golpePuerta, encontrado,
} from './sonidos.js';
import { thump, scream, screamQTV } from '../audio.js';
import { createRng, createFlashGuard } from '../glitch.js';
import { ahiEstas } from '../texts.js';
import { cargarFotos } from './texturas.js';

const OJO_Y = 1.6;
const BALANCEO_M = 0.04;
const CAPTURA_S = 1.6;
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
const MASA_CERCA_M = 9;
const APAGON_MS = 220;
// Golpes contra la puerta cerrada del cruce.
const GOLPE_CADA_MS = [650, 1100];
// La puerta del cruce revienta durante la carrera: duración de la escena (s).
const REVIENTA_S = 3.8;
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
    cancelAnimationFrame(raf);
    timers.forEach(clearTimeout);
    quitarInput.forEach((fn) => fn());
    pararSonidos();
    fondo.parar();
    luces.apagarTodas();
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

  // Coloca al ente según sus claves en el tiempo t (posición, hacia dónde mira, inclinación y brazos).
  const posarEnte = (claves, t) => {
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
    }
    golpear(ahora);
    const c = muestrear(CAMARA[camino], t);
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
        pantallaFinal('HAS MUERTO', 'muerte-juego', null, 'otra vez', () => { cerrar(); reiniciar(); });
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
    if (camara.fov !== 68) { camara.fov = 68; camara.updateProjectionMatrix(); }
    mano.grupo.visible = false;
    ente.grupo.visible = false;
    ente.oscuro(false);
    masa.grupo.visible = false;
    ente.boca(0);
    ente.alcanzar(0);
    ente.abrir(0);
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
      captura({
        x: CRUCE.x, z: CRUCE.z, yaw: RUMBO_CRUCE,
        colocar: () => {
          ente.grupo.position.set(PUERTA_CRUCE_X + 0.6, 0, CRUCE.z);
          ente.grupo.rotation.y = -Math.PI / 2;
          ente.agacharse(0.85);
        },
        toques: null,
      });
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
    const { recorrido: rec, luzMeta, estaciones } = pasillos.caminos[lado];
    luces.punto(L_META, luzMeta, 0xffffff, 2.5, 9);
    let c = createCarrera(rec.largo);
    let acecho = crearAcecho(rec.esquinas[0]);
    let empezado = false;
    let pausa = false;
    let ultimo = performance.now();
    let ultimoParpadeo = 0;
    let ultimoPaso = 0;
    let balanceo = 0;
    const r0 = rec.segmentos[0].rumbo;
    let ultimoTicMasa = -1;
    capa.replaceChildren(el('p', 'juego-aviso', 'TOCA PARA CORRER'));
    const ojos = el('div', 'juego-ojos');
    ojos.append(el('span', 'ojo-rojo'), el('span', 'ojo-rojo'));
    capa.append(ojos);

    const alTocar = (ev) => {
      if (ev.type === 'keydown' && ev.code !== 'Space') return;
      if (ev.type === 'keydown') ev.preventDefault();
      if (c.estado !== 'corriendo' || pausa) return;
      if (!empezado) { empezado = true; capa.querySelector('.juego-aviso')?.remove(); ultimo = performance.now(); }
      c = tap(c);
      balanceo = 1;
      paso();
    };
    contenedor.addEventListener('pointerdown', alTocar);
    window.addEventListener('keydown', alTocar);
    const quitarToques = () => {
      contenedor.removeEventListener('pointerdown', alTocar);
      window.removeEventListener('keydown', alTocar);
    };
    quitarInput.push(quitarToques);

    // ----- La masa: salta de luz en luz mientras está lejos; cerca, avanza seguida -----
    let estacion = null; // estación donde se la ve ahora
    let apagonHasta = 0;
    const encenderTodas = () => estaciones.forEach((e) => pasillos.luz(e.malla, true));
    const posarMasa = (ahora) => {
      if (acecho.estado !== 'corre' && acecho.estado !== 'esquivado') return;
      if (acecho.pos > MASA_CERCA_M) {
        const destino = estaciones.find((e) => e.r >= acecho.pos) ?? estaciones.at(-1);
        if (destino !== estacion && ahora >= apagonHasta) {
          // Apagón: se apagan la luz donde estaba y la siguiente, desaparece y reaparece más cerca.
          if (estacion) pasillos.luz(estacion.malla, false);
          pasillos.luz(destino.malla, false);
          masa.grupo.visible = false;
          luces.apagar(L_MASA);
          const anterior = estacion;
          estacion = destino;
          apagonHasta = ahora + APAGON_MS;
          later(() => {
            if (anterior) pasillos.luz(anterior.malla, true);
            pasillos.luz(destino.malla, true);
          }, APAGON_MS);
        }
        if (ahora < apagonHasta) return;
        const q = rec.recto(estacion.r);
        masa.grupo.visible = true;
        masa.grupo.position.set(q.x, 0, q.z);
        luces.punto(L_MASA, [q.x, 2.3, q.z], 0xfff0c0, 1.6, 4.5);
      } else {
        const q = rec.recto(acecho.pos);
        masa.grupo.visible = true;
        masa.grupo.position.set(q.x, 0, q.z);
        luces.punto(L_MASA, [q.x, 2.0, q.z], 0xff2a1a, 1.2, 4);
      }
      masa.grupo.rotation.y = r0;
    };

    // ----- La puerta del cruce revienta: te giras, sale el ente, te mira despacio, grita -----
    let revientaDesde = 0;
    let gritado = false;
    const reventar = (ahora) => {
      pausa = true;
      revientaDesde = ahora;
      gritado = false;
      golpeando = false;
    };
    const escenaRevienta = (ahora) => {
      const t = (ahora - revientaDesde) / 1000;
      const p = rec.poseEn(c.jugador);
      const ida = smooth(t / 0.45);
      const vuelta = smooth((t - (REVIENTA_S - 0.35)) / 0.35);
      camaraEn(p.x, p.z, p.rumbo + Math.PI * (ida - vuelta), 0.08 * (ida - vuelta));
      if (t >= 0.25 && !hab.izquierdaRota()) {
        hab.estallar('izquierda');
        portazo();
        astillazo();
        sacudir(1.4, 500);
      }
      hab.actualizarTrozos(1 / 60);
      if (t >= 0.6) {
        // Sale por el hueco hacia el cruce y, ya en el cruce, gira despacio la cara hacia ti.
        const u = smooth((t - 0.6) / 1.0);
        const x = PUERTA_CRUCE_X + 0.3 + (CRUCE.x + 0.4 - (PUERTA_CRUCE_X + 0.3)) * u;
        const haciaTi = Math.atan2(p.x - x, p.z - CRUCE.z);
        const giro = smooth((t - 1.7) / 1.1);
        ente.grupo.visible = true;
        ente.grupo.position.set(x, 0, CRUCE.z);
        ente.grupo.rotation.y = -Math.PI / 2 + (haciaTi + Math.PI / 2) * giro;
        ente.agacharse(0.7);
        ente.abrir(0.6 * (1 - giro));
        if (ticEnte(t + 3000, t < 1.7 ? 2 : 1)) ente.andar(u < 1 ? t * 5 : 0);
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
        motor.glitch(0);
        ente.grupo.visible = false;
        ente.boca(0);
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
        if (antes === 'espera' && acecho.estado === 'corre') { scream(0.4, 'puerta'); arrastre = crearArrastre(); }
        if (acecho.estado === 'fuera' && antes !== 'fuera') {
          masa.grupo.visible = false;
          luces.apagar(L_MASA);
          encenderTodas();
          arrastre?.parar();
          arrastre = null;
        }
        if (!c.suelto && c.jugador >= PUERTA_M) reventar(ahora);
      }
      balanceo = Math.max(0, balanceo - dt * 6);
      const p = rec.poseEn(c.jugador);
      if (pausa) escenaRevienta(ahora);
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
        // Pasos metálicos del ente detrás de ti, más seguidos y fuertes cuanto más cerca.
        if (c.suelto && ahora - ultimoPaso > 420) { pasoMetal(cerca); ultimoPaso = ahora; }
      }

      // La masa, a 12 fps.
      const ticMasa = Math.floor((ahora / 1000) * FPS_MONSTRUO);
      if (ticMasa !== ultimoTicMasa) {
        ultimoTicMasa = ticMasa;
        posarMasa(ahora);
        if (masa.grupo.visible) masa.animar(ticMasa * 1.4, rng);
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
      if (acecho.estado === 'atrapa') { quitarToques(); capturaMasa(c, rec); return; }
      if (c.estado === 'atrapado') {
        quitarToques();
        const detras = rec.poseEn(Math.max(0, c.jugador - 1.6));
        captura({
          x: p.x, z: p.z, yaw: p.rumbo,
          colocar: () => {
            ente.grupo.position.set(detras.x, 0, detras.z);
            // El ente mira hacia donde corres (hacia ti): su frente es +z local.
            ente.grupo.rotation.y = p.rumbo + Math.PI;
            ente.agacharse(0.75);
          },
          toques: c.toques,
        });
        return;
      }
      if (c.estado === 'escapado') { quitarToques(); escapar(c); return; }
      raf = requestAnimationFrame(bucle);
    };
    raf = requestAnimationFrame(bucle);
  }

  const terminarMuerte = (toques) => {
    pararSonidos();
    golpeando = false;
    negro(true);
    pantallaFinal('HAS MUERTO', 'muerte-juego', toques, 'repetir', () => elegir());
  };

  const vibrar = () => {
    // Solo vibra si ya hubo un toque real (si no, el navegador lo bloquea y avisa en consola).
    if (navigator.vibrate && navigator.userActivation?.hasBeenActive !== false) navigator.vibrate([200, 80, 400]);
  };

  // Te atrapa el ente: te das la vuelta, está encima con la boca abierta, grita, corte a negro.
  function captura({ x, z, yaw, colocar, toques }) {
    colocar();
    ente.grupo.visible = true;
    ente.andar(0);
    ente.abrir(0);
    ente.alcanzar(1);
    ente.boca(1);
    const inicio = performance.now();
    let grito = false;
    vibrar();
    const giro = (ahora) => {
      if (apagado) return;
      const t = (ahora - inicio) / 1000;
      const u = smooth(t / 0.35);
      camaraEn(x, z, yaw + Math.PI * u, 0.45 * u);
      ticEnte(t + 2000, 2);
      hab.actualizarTrozos(1 / 60);
      coro?.setCercania(1);
      if (!grito && t > 0.45) { grito = true; screamQTV(); sacudir(1.5, 900); }
      aplicarSacudida(ahora);
      motor.render();
      if (t < CAPTURA_S) { raf = requestAnimationFrame(giro); return; }
      motor.glitch(0);
      ente.grupo.visible = false;
      terminarMuerte(toques);
    };
    raf = requestAnimationFrame(giro);
  }

  // Te atrapa la masa: se te echa encima desde delante, con todas las manos.
  function capturaMasa(c, rec) {
    const p = rec.poseEn(c.jugador);
    const d = new THREE.Vector2(-Math.sin(p.rumbo), -Math.cos(p.rumbo));
    const inicio = performance.now();
    let grito = false;
    vibrar();
    const salto = (ahora) => {
      if (apagado) return;
      const t = paso12((ahora - inicio) / 1000);
      const u = smooth(t / 0.3);
      // Acaba con las caras (0,34 m por delante de su centro) a menos de un metro de ti.
      const lejos = 3.2 - 2.0 * u;
      masa.grupo.visible = true;
      masa.grupo.position.set(p.x + d.x * lejos, 0.35 * u - 0.1, p.z + d.y * lejos);
      masa.grupo.rotation.y = p.rumbo;
      motor.glitch(masa.animar(t * 24, rng) ? 1 : 0);
      camaraEn(p.x, p.z, p.rumbo, 0);
      if (!grito && t > 0.15) { grito = true; screamQTV(); sacudir(1.5, 900); }
      aplicarSacudida(ahora);
      motor.render();
      if (t < CAPTURA_S) { raf = requestAnimationFrame(salto); return; }
      motor.glitch(0);
      masa.grupo.visible = false;
      luces.apagar(L_MASA);
      terminarMuerte(c.toques);
    };
    raf = requestAnimationFrame(salto);
  }

  // Llegas: flash blanco, el jardín y «HAS ESCAPADO».
  function escapar(c) {
    pararSonidos();
    golpeando = false;
    thump(0.6);
    capa.replaceChildren(el('div', 'juego-flash'));
    later(() => {
      negro(true);
      pantallaFinal('HAS ESCAPADO', 'escapado', c.toques, 'otra vez', () => { cerrar(); reiniciar(); });
      capa.prepend(el('div', 'jardin'));
    }, 700);
  }

  // Para depurar desde la consola cuando se entra por un atajo de prueba.
  if (window.location.hash.startsWith('#juego-')) window.__juego = { THREE, motor, ente, masa, mano, camara, escena, hab, pasillos };

  // Atajo de prueba #juego-cruce: salta la habitación.
  if (camino === 'cruce') { elegir(); return; }
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
