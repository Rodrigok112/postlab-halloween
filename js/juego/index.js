// El juego: toma el control cuando la encuesta termina (evento «encuesta:fin»).
// Habitación (cinemática) → final 2, o cruce → elegir izquierda/derecha → carrera por el pasillo
// (giro de cabeza tras unos toques, segundo monstruo al final del primer tramo) → «HAS MUERTO» o «HAS ESCAPADO».

import { THREE, crearMotor, luces } from './ps1.js';
import { crearHabitacion } from './habitacion.js';
import { crearEnte, crearMano } from './ente.js';
import { crearArana } from './arana.js';
import { crearPasillos } from './pasillo.js';
import { CAMARA, ENTE, ACCIONES, DURACION, MANO } from './escenas.js';
import { muestrear } from './linea.js';
import { CRUCE } from './recorrido.js';
import { createCarrera, tap, update, distancia, VENTAJA_M } from './carrera.js';
import { crearAcecho, actualizarAcecho, ACECHO } from './acecho.js';
import { portazo, paso, crearCoro, astillazo, voz, crearArrastre } from './sonidos.js';
import { thump, scream, screamQTV } from '../audio.js';
import { createRng, createFlashGuard } from '../glitch.js';
import { ahiEstas } from '../texts.js';
import { cargarFotos } from './texturas.js';

const OJO_Y = 1.6;
const BALANCEO_M = 0.04;
const CAPTURA_S = 1.6;
const OJOS_CERCA_M = 2.6;
const ELEGIR_S = 4;
const MIRAR_ATRAS_M = 2.5; // unos 7 toques
const MIRAR_ATRAS_S = 2.1;
const LETRA_MS = 75;
// Los monstruos se mueven a 12 fps (la cámara y el resto, a los fps del móvil).
const FPS_MONSTRUO = 12;
const paso12 = (t) => Math.floor(t * FPS_MONSTRUO) / FPS_MONSTRUO;
// Boquete de la puerta derecha (habitación de 5 m): la mano entra por aquí, un poco por debajo del centro.
const MANO_Y = 1.43, MANO_Z = 0.35;
// Hacia dónde mira la cámara en el cruce (−x, de frente a la pared) y el rumbo de cada camino.
const RUMBO_CRUCE = Math.PI / 2;
// Huecos de luz durante la carrera.
const L_LINTERNA = 0, L_META = 1, L_ARANA = 2;

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

const smooth = (u) => u * u * (3 - 2 * u);

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
  const tmp = new THREE.Vector3();
  let raf = 0;
  let apagado = false;
  const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const quitarInput = [];
  let coro = null;
  let arrastre = null;

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

  const cerrar = () => {
    apagado = true;
    cancelAnimationFrame(raf);
    timers.forEach(clearTimeout);
    quitarInput.forEach((fn) => fn());
    coro?.parar();
    arrastre?.parar();
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

  // ---------- Mundo: habitación, pasillos y los dos monstruos ----------
  const hab = crearHabitacion(rng);
  const pasillos = crearPasillos(rng);
  const ente = crearEnte();
  // Araña A (agujas) o B (brazos): al azar en cada partida; ?arana=a o ?arana=b la fija.
  const pedida = new URLSearchParams(window.location.search).get('arana');
  const arana = crearArana(pedida === 'a' || pedida === 'b' ? pedida : rng() < 0.5 ? 'a' : 'b');
  const mano = crearMano();
  escena.add(hab.grupo, pasillos.grupo, ente.grupo, arana.grupo, mano.grupo);
  ente.grupo.visible = false;
  arana.grupo.visible = false;
  mano.grupo.visible = false;
  mano.grupo.rotation.y = -Math.PI / 2; // apunta hacia dentro de la habitación (−x)
  escena.fog.color.set(0x000000);
  escena.fog.near = 3;
  escena.fog.far = 14;

  const parpadeo = (ms) => {
    if (!guard.tryFlash(performance.now())) return;
    hab.setLuz(false);
    later(() => hab.setLuz(true), ms);
  };
  // Posición de los ojos (para su brillo rojo en el boquete).
  const posOjos = () => ente.ojos[0].getWorldPosition(new THREE.Vector3());

  let revientaEn = null;
  let abreEn = null;
  const ejecutar = (a) => {
    switch (a.que) {
      case 'pantalla': hab.setPantalla(a.valor); break;
      case 'boquete': astillazo(); hab.romper(); parpadeo(160); sacudir(1, 350); break;
      case 'mano': mano.grupo.visible = true; break;
      case 'manoFuera': manoFueraEn = a.t; break;
      case 'ojos':
        ente.grupo.visible = true;
        ente.oscuro(true);
        asomado = true;
        ente.parpadear(1);
        ente.grupo.updateMatrixWorld(true);
        hab.luzOjos(posOjos());
        thump(0.25);
        coro = crearCoro();
        coro.setCercania(0.05);
        break;
      case 'parpadeo': ente.parpadear(0); later(() => ente.parpadear(1), 130); break;
      case 'dialogo': hablar(ahiEstas(nombre)); break;
      case 'callar': callar(); break;
      case 'revienta': asomado = false; mano.grupo.visible = false; ente.oscuro(false); portazo(); parpadeo(180); sacudir(1.2, 400); revientaEn = performance.now(); hab.luzOjos(null); break;
      case 'boca': ente.boca(1); ente.alcanzar(1); break;
      case 'grito': screamQTV(); sacudir(1.5, 900); coro?.setCercania(1); break;
      case 'abrePuerta': abreEn = performance.now(); break;
      case 'paso': paso(); break;
      default: break;
    }
  };

  const acciones = (ACCIONES[camino] ?? []).map((a) => ({ ...a, hecho: false }));
  const t0 = performance.now();

  // Reloj de 12 fps del ente: en cada fotograma nuevo decide si se congela (2–3 fotogramas) y si toca un
  // fotograma roto, que también rompe la pantalla (glitch del paso final).
  let ultimoTic = -1;
  let asomado = false;
  let congelado = 0;
  const ticEnte = (t) => {
    const tic = Math.floor(t * FPS_MONSTRUO);
    if (tic === ultimoTic) return false;
    ultimoTic = tic;
    if (congelado > 0) { congelado--; return false; }
    if (rng() < 0.05) congelado = 2 + Math.floor(rng() * 2);
    // Asomado tras la puerta, sin glitch ni giros de cabeza: que se lean bien los dos ojos.
    motor.glitch(ente.grupo.visible && ente.tic(rng, !asomado) ? 1 : 0);
    return true;
  };

  // Coloca al ente según sus claves en el tiempo t.
  const posarEnte = (claves, t) => {
    const e = muestrear(claves, t);
    ente.grupo.position.set(...e.pos);
    ente.grupo.rotation.y = Math.atan2(e.mira[0] - e.pos[0], e.mira[2] - e.pos[2]);
    const k = claves.findIndex((c) => c.t > t);
    const a0 = claves[Math.max(0, (k < 0 ? claves.length : k) - 1)];
    const a1 = claves[k < 0 ? claves.length - 1 : k];
    const u = a1.t > a0.t ? Math.min(1, Math.max(0, (t - a0.t) / (a1.t - a0.t))) : 1;
    ente.agacharse(a0.agachado + (a1.agachado - a0.agachado) * u);
    const anda = a0.pos.some((v, i) => v !== a1.pos[i]) && u < 1;
    ente.andar(anda ? t * 6 : 0);
  };

  // La mano: entra despacio por el boquete y se agarra al borde; con manoFuera se retira deprisa.
  let manoFueraEn = null;
  const posarMano = (t) => {
    const u = Math.min(1, Math.max(0, (t - MANO.entraDesde) / (MANO.entraHasta - MANO.entraDesde)));
    const k = u * u * (3 - 2 * u);
    let x = MANO.fuera + (MANO.dentro - MANO.fuera) * k;
    if (manoFueraEn !== null) x += (MANO.fuera - MANO.dentro) * Math.min(1, (t - manoFueraEn) / 0.4);
    mano.grupo.position.set(x, MANO_Y, MANO_Z);
    mano.agarrar(u > 0.8 ? (u - 0.8) / 0.2 : 0);
  };

  const pintarHabitacion = (ahora) => {
    // window.__tFijo (solo para depurar) congela la cinemática en ese segundo.
    const t = window.__tFijo ?? (ahora - t0) / 1000;
    for (const a of acciones) if (!a.hecho && t >= a.t) { a.hecho = true; ejecutar(a); }
    if (revientaEn !== null) {
      const u = Math.min(1, (ahora - revientaEn) / 160);
      hab.puertaRota.rotation.y = -1.75 * u;
    }
    if (abreEn !== null) {
      const u = Math.min(1, (ahora - abreEn) / 300);
      hab.puertaIzquierda.rotation.y = 0.35 + 1.15 * u;
    }
    if (ticEnte(t)) {
      posarEnte(ENTE[camino], paso12(t));
      if (mano.grupo.visible) posarMano(paso12(t));
    }
    const c = muestrear(CAMARA[camino], t);
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
        coro?.parar();
        coro = null;
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
      motor.render();
      if (u < 1) { raf = requestAnimationFrame(paso_); return; }
      hecho();
    };
    raf = requestAnimationFrame(paso_);
  };

  // En el cruce: dos botones y 4 s para elegir. Si no eliges, el ente te atrapa.
  function elegir() {
    motor.glitch(0);
    mano.grupo.visible = false;
    ente.grupo.visible = false;
    ente.oscuro(false);
    arana.grupo.visible = false;
    ente.boca(0);
    ente.alcanzar(0);
    negro(false);
    ambientePasillo();
    if (!coro) coro = crearCoro();
    coro.setCercania(0.25);
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
      capa.replaceChildren();
      // El ente sale por la puerta, a tu espalda.
      captura({
        x: CRUCE.x, z: CRUCE.z, yaw: RUMBO_CRUCE,
        colocar: () => {
          ente.grupo.position.set(CRUCE.x + 1.25, 0, CRUCE.z);
          ente.grupo.rotation.y = -Math.PI / 2;
          ente.agacharse(0.75);
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

    // Mientras eliges, el coro sube.
    const ini = performance.now();
    const espera = (ahora) => {
      if (apagado || elegido) return;
      coro.setCercania(0.25 + 0.6 * Math.min(1, (ahora - ini) / (ELEGIR_S * 1000)));
      motor.render();
      raf = requestAnimationFrame(espera);
    };
    raf = requestAnimationFrame(espera);
  }

  function correr(lado) {
    const { recorrido: rec, luzMeta } = pasillos.caminos[lado];
    luces.punto(L_META, luzMeta, 0xffffff, 2.5, 9);
    let c = createCarrera(rec.largo);
    let acecho = crearAcecho(rec.esquinas[0]);
    let empezado = false;
    let pausa = false;
    let miradoAtras = false;
    let ultimo = performance.now();
    let ultimoParpadeo = 0;
    let balanceo = 0;
    const r0 = rec.segmentos[0].rumbo;
    let ultimoTicArana = -1;
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
    const soltar = () => {
      contenedor.removeEventListener('pointerdown', alTocar);
      window.removeEventListener('keydown', alTocar);
    };
    quitarInput.push(soltar);

    // Giro de cabeza: el ente ya ha cruzado la puerta y te grita; luego vuelves a mirar al frente.
    let atrasDesde = 0;
    const mirarAtras = (ahora) => {
      miradoAtras = true;
      pausa = true;
      atrasDesde = ahora;
      const p = rec.poseEn(Math.max(0, c.jugador - 2.3));
      ente.grupo.position.set(p.x, 0, p.z);
      ente.grupo.rotation.y = p.rumbo + Math.PI;
      ente.agacharse(0.5);
      ente.andar(0);
      ente.alcanzar(0.7);
      ente.boca(0);
      ente.grupo.visible = true;
      later(() => { ente.boca(1); scream(1, 'abierto'); thump(0.8); sacudir(1.2, 600); coro.setCercania(1); }, 450);
    };
    const vistaAtras = (ahora, p) => {
      const t = (ahora - atrasDesde) / 1000;
      ticEnte(t + 1000);
      const ida = smooth(Math.min(1, t / 0.3));
      const vuelta = smooth(Math.min(1, Math.max(0, (t - 1.7) / 0.3)));
      const u = ida - vuelta;
      camaraEn(p.x, p.z, p.rumbo + Math.PI * u, 0.12 * u);
      if (t >= MIRAR_ATRAS_S) {
        pausa = false;
        motor.glitch(0);
        ente.grupo.visible = false;
        ente.boca(0);
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
        if (antes === 'espera' && acecho.estado === 'corre') { scream(0.8, 'medio'); arrastre = crearArrastre(); }
        if (acecho.estado === 'fuera' && antes !== 'fuera') {
          arana.grupo.visible = false;
          luces.apagar(L_ARANA);
          arrastre?.parar();
          arrastre = null;
        }
      }
      if (empezado && !miradoAtras && c.jugador >= MIRAR_ATRAS_M) mirarAtras(ahora);
      balanceo = Math.max(0, balanceo - dt * 6);
      const p = rec.poseEn(c.jugador);
      if (pausa) vistaAtras(ahora, p);
      else {
        camaraEn(p.x, p.z, p.rumbo);
        camara.position.y += Math.sin(balanceo * Math.PI) * BALANCEO_M;
      }
      aplicarSacudida(ahora);
      luces.mover(L_LINTERNA, [p.x, 2.2, p.z]);
      if (!pausa) {
        const cerca = 1 - Math.min(1, distancia(c) / (VENTAJA_M + 1));
        coro.setCercania(empezado ? cerca : 0.15);
      }

      // El segundo monstruo, corriendo por el pasillo que sigue recto.
      const ticArana = Math.floor((ahora / 1000) * FPS_MONSTRUO);
      if ((acecho.estado === 'corre' || acecho.estado === 'esquivado') && ticArana !== ultimoTicArana) {
        ultimoTicArana = ticArana;
        const q = rec.recto(acecho.pos);
        arana.grupo.visible = true;
        arana.grupo.position.set(q.x, 0, q.z);
        arana.grupo.rotation.y = r0;
        arana.animar(ticArana * 1.6, rng);
        luces.punto(L_ARANA, [q.x, 0.8, q.z], 0xff1010, 0.9, 2.6);
        const hueco = (acecho.esquina - c.jugador) + acecho.pos;
        arrastre?.setCercania(1 - Math.min(1, hueco / ACECHO.distanciaM));
      }

      // Ojos rojos asomando por el borde cuando el ente está cerca.
      if (empezado && !pausa && distancia(c) < OJOS_CERCA_M && rng() < dt * 2.5 && guard.tryFlash(ahora)) {
        ojos.style.setProperty('--lado', rng() < 0.5 ? '0' : '1');
        ojos.classList.add('on');
        later(() => ojos.classList.remove('on'), 90);
      }
      if (ahora - ultimoParpadeo > 700 && rng() < 0.05) { pasillos.parpadeo(rng); ultimoParpadeo = ahora; }
      motor.render();
      if (acecho.estado === 'atrapa') { soltar(); capturaArana(c, rec); return; }
      if (c.estado === 'atrapado') {
        soltar();
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
      if (c.estado === 'escapado') { soltar(); escapar(c); return; }
      raf = requestAnimationFrame(bucle);
    };
    raf = requestAnimationFrame(bucle);
  }

  const terminarMuerte = (toques) => {
    coro?.parar();
    coro = null;
    arrastre?.parar();
    arrastre = null;
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
    ente.alcanzar(1);
    ente.boca(1);
    const inicio = performance.now();
    let grito = false;
    vibrar();
    const giro = (ahora) => {
      if (apagado) return;
      const t = (ahora - inicio) / 1000;
      const u = smooth(Math.min(1, t / 0.35));
      camaraEn(x, z, yaw + Math.PI * u, 0.45 * u);
      ticEnte(t + 2000);
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

  // Te atrapa el segundo monstruo: salta hacia ti desde delante.
  function capturaArana(c, rec) {
    const p = rec.poseEn(c.jugador);
    const d = new THREE.Vector2(-Math.sin(p.rumbo), -Math.cos(p.rumbo));
    const inicio = performance.now();
    let grito = false;
    vibrar();
    const salto = (ahora) => {
      if (apagado) return;
      const t = paso12((ahora - inicio) / 1000);
      const u = smooth(Math.min(1, t / 0.25));
      // Acaba con la cabeza (0,85 m por delante de su centro) a 1 m de ti y un poco por debajo.
      const lejos = 3.0 - 1.15 * u;
      arana.grupo.visible = true;
      arana.grupo.position.set(p.x + d.x * lejos, 0.75 * u, p.z + d.y * lejos);
      arana.grupo.rotation.y = p.rumbo;
      motor.glitch(arana.animar(t * 20, rng) ? 1 : 0);
      camaraEn(p.x, p.z, p.rumbo, -0.25 * u);
      if (!grito && t > 0.15) { grito = true; screamQTV(); sacudir(1.5, 900); }
      aplicarSacudida(ahora);
      motor.render();
      if (t < CAPTURA_S) { raf = requestAnimationFrame(salto); return; }
      motor.glitch(0);
      arana.grupo.visible = false;
      luces.apagar(L_ARANA);
      terminarMuerte(c.toques);
    };
    raf = requestAnimationFrame(salto);
  }

  // Llegas: flash blanco, el jardín y «HAS ESCAPADO».
  function escapar(c) {
    coro?.parar();
    coro = null;
    arrastre?.parar();
    arrastre = null;
    thump(0.6);
    capa.replaceChildren(el('div', 'juego-flash'));
    later(() => {
      negro(true);
      pantallaFinal('HAS ESCAPADO', 'escapado', c.toques, 'otra vez', () => { cerrar(); reiniciar(); });
      capa.prepend(el('div', 'jardin'));
    }, 700);
  }

  // Para depurar desde la consola cuando se entra por un atajo de prueba.
  if (window.location.hash.startsWith('#juego-')) window.__juego = { THREE, motor, ente, arana, mano, camara, escena, hab, pasillos };

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
