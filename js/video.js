// Fotogramas y sonidos del vídeo (27/10): la habitación del juego vista desde la silla (plano subjetivo), con la
// pantalla del CRT centrada en (540, 540) y de 360 px de alto, para que quepan el QR (328 px con margen) y la
// bola de 152 px. Render interno de 360 × 360, ×3 = 1080 × 1080, sin suavizado.
// Estados: A luz encendida y pantalla blanca; B luz apagada y pantalla blanca; C luz apagada y pantalla gris
// azulado muy oscura; D como B con el resplandor rojo de la puerta del ente (por la derecha).
// «Guardar todo» manda los PNG y los WAV al servidor local, que los deja en video/.

import { THREE, crearMotor, luces } from './juego/ps1.js';
import { crearHabitacion, POSES } from './juego/habitacion.js';
import { crearEnte } from './juego/ente.js';
import { cargarFotos } from './juego/texturas.js';
import { createRng } from './glitch.js';
import { grabarEn, thump, scream, screamQTV } from './audio.js';
import { golpePuerta, portazo } from './juego/sonidos.js';
import { sonidoEncendido, sonidoAmbiente, sonidoMusica } from './video-sonidos.js';

const LADO = 1080;
const INTERNO = 360;
const PANTALLA_PX = 360; // alto de la pantalla en el cuadro final
const L_PASILLO = 2;

const ESTADOS = {
  A: { luz: true, pantalla: [0xffffff, 0xe8f0ff, 1.2] },
  B: { luz: false, pantalla: [0xffffff, 0xe8f0ff, 0.9] },
  C: { luz: false, pantalla: [0x1a2230, 0x2a3850, 0.25] },
  D: { luz: false, pantalla: [0xffffff, 0xe8f0ff, 0.9], rojo: true },
  // Fotos para la animación (27/10). «Todo apagado»: solo la pantalla ilumina el monitor y la mesa.
  // escapar: pantalla gris muy oscura con el círculo negro de la guía (152 px en 540, 540) y debajo «haz click
  // para escapar»; los dos se dibujan encima del render, a resolución completa el círculo, para que coincida.
  foto_1_apagado_pantalla: { luz: false, pantalla: [0xffffff, 0xe8f0ff, 0.6, 1.8] },
  foto_2_encendido_rojo: { luz: true, pantalla: [0xffffff, 0xe8f0ff, 1.2], rojo: true },
  foto_3_apagado_pantalla_rojo: { luz: false, pantalla: [0xffffff, 0xe8f0ff, 0.6, 1.8], rojo: true },
  foto_4_encendido_escapar: { luz: true, pantalla: [0x2a2a2e, 0x606878, 0.3], escapar: true },
  foto_5_encendido_escapar_rojo: { luz: true, pantalla: [0x2a2a2e, 0x606878, 0.3], escapar: true, rojo: true },
  foto_6_apagado_escapar: { luz: false, pantalla: [0x2a2a2e, 0x606878, 0.35, 1.8], escapar: true },
  // Finales (27/10). A: el ente se asoma por encima del monitor con la luz roja; la pantalla solo con el círculo.
  // B: como la 6, con su reflejo tenue en la pantalla, de pie detrás de la silla.
  foto_7_final_asomado: { luz: false, pantalla: [0x2a2a2e, 0x606878, 0.35, 1.8], circulo: true, rojo: true, ente: 'asomado' },
  foto_8_final_reflejo: { luz: false, pantalla: [0x2a2a2e, 0x606878, 0.35, 1.8], escapar: true, reflejo: true },
};
const BOLA = { x: 540, y: 540, r: 76 };
// La pantalla en el cuadro final (medida en el render).
const PANT = { x: 294, y: 360, w: 492, h: 360 };
const L_EXTRA = 3;
const TEXTO_ESCAPAR = 'haz click para escapar';

// Sonidos sueltos: [nombre, segundos, qué suena].
const SONIDOS = [
  ['golpe_puerta', 1.2, () => golpePuerta(1)],
  ['golpe_puerta_suave', 1.2, () => golpePuerta(0.5)],
  ['portazo', 1.5, () => portazo()],
  ['golpe_seco', 1.2, () => thump(1)],
  ['grito_tras_puerta', 2.2, () => scream(1, 'puerta')],
  ['grito_medio', 2.2, () => scream(1, 'medio')],
  ['grito_abierto', 2.2, () => scream(1, 'abierto')],
  ['grito_quiero_tu_vida', 2.8, () => screamQTV(0.9)],
];
// Pista de 8 s alineada con la línea de tiempo del vídeo: golpes entre los segundos 2 y 5,5, cada vez más
// fuertes, un grito tras la puerta y silencio en el estado C.
const PISTA = [
  [2.0, () => golpePuerta(0.6)], [2.7, () => golpePuerta(0.7)], [3.0, () => scream(0.8, 'puerta')],
  [3.3, () => golpePuerta(0.8)], [3.8, () => golpePuerta(0.85)], [4.3, () => portazo()],
  [4.7, () => golpePuerta(0.95)], [5.1, () => golpePuerta(1)], [5.4, () => portazo()],
];

const contenedor = document.getElementById('escena');
const estadoTxt = document.getElementById('estado');
await Promise.all([document.fonts.load('44px "Rubik Wet Paint"'), document.fonts.load('13px "VT323"'), cargarFotos()]);
const motor = crearMotor(contenedor, { ladoCorto: INTERNO });
const { escena, camara } = motor;
const hab = crearHabitacion(createRng(20261031));
escena.add(hab.grupo);
const ente = crearEnte();
ente.grupo.visible = false;
escena.add(ente.grupo);

// Coloca al ente con los ojos (punto medio) en «ojos», inclinándolo lo justo sobre su pose para la altura.
const tmp = new THREE.Vector3();
const medioOjos = () => ente.ojos.reduce((m, o) => m.add(o.getWorldPosition(tmp.clone())), new THREE.Vector3()).divideScalar(ente.ojos.length);
function colocarEnte({ pose, rotY, ojos, alcance = 0, cabeza = 0 }) {
  ente.grupo.visible = true;
  ente.oscuro(false);
  ente.parpadear(1);
  ente.pose(pose);
  ente.andar(0);
  ente.abrir(0);
  ente.boca(0);
  ente.alcanzar(alcance);
  ente.cabezaHacia(cabeza);
  ente.grupo.position.set(ojos[0], 0, ojos[2]);
  ente.grupo.rotation.y = rotY;
  let lo = 0, hi = 2.4;
  for (let i = 0; i < 10; i++) {
    const mid = (lo + hi) / 2;
    ente.agacharse(mid);
    ente.grupo.updateMatrixWorld(true);
    if (medioOjos().y > ojos[1]) lo = mid; else hi = mid;
  }
  ente.agacharse((lo + hi) / 2);
  ente.grupo.updateMatrixWorld(true);
  const o = medioOjos();
  ente.grupo.position.x += ojos[0] - o.x;
  ente.grupo.position.z += ojos[2] - o.z;
  ente.grupo.updateMatrixWorld(true);
}
const ENTE = {
  // A la derecha del monitor, encorvado sobre él: la cabeza asoma por encima del borde y mira a la cámara.
  asomado: { pose: 'acecho', rotY: Math.atan2(-0.6, 1.3), ojos: [0.12, 1.5, -1.32], alcance: 0.55, cabeza: 0.35 },
  // Encorvado detrás de la silla, mirando a la pantalla (solo se ve su reflejo): la cara queda a la derecha del
  // círculo y algo por encima, entera dentro de la pantalla.
  reflejo: { pose: 'reposo', rotY: Math.PI, ojos: [0.3, 1.44, 0.5], alcance: 0, cabeza: -0.25 },
};

// Cámara sentada en la silla, con los ojos a la altura del centro de la pantalla y mirando recto (si mirara hacia
// arriba, la pantalla saldría un pelo trapezoidal); el fov hace que la pantalla mida PANTALLA_PX.
const centro = new THREE.Vector3();
const caja = new THREE.Box3().setFromObject(hab.pantalla);
caja.getCenter(centro);
const altoPantalla = caja.max.y - caja.min.y;
camara.position.set(POSES.sentado.pos[0], centro.y, POSES.sentado.pos[2]);
camara.lookAt(centro);
const d = camara.position.distanceTo(centro);
camara.fov = (2 * Math.atan((altoPantalla * LADO / PANTALLA_PX) / 2 / d) * 180) / Math.PI;
camara.updateProjectionMatrix();

function poner(nombre) {
  const e = ESTADOS[nombre];
  if (e.ente) colocarEnte(ENTE[e.ente]); else ente.grupo.visible = false;
  hab.setLuz(e.luz);
  hab.pantallaLisa(...e.pantalla);
  hab.rendija(Boolean(e.rojo));
  // El rojo entra por la derecha y desde abajo, como si viniera de la rendija de la puerta.
  // Con la bombilla encendida hace falta más rojo para que se note.
  if (e.rojo) luces.punto(L_PASILLO, [0.95, 0.55, -0.75], 0xff1808, e.luz ? 7.0 : 4.0, e.luz ? 2.2 : 1.9);
  else if (e.luz) luces.punto(L_PASILLO, [-4.3, 2.1, 0.35], 0xd8c070, 0.9, 3.2);
  else luces.apagar(L_PASILLO);
  motor.render();
  estadoTxt.textContent = `estado ${nombre} · fov ${camara.fov.toFixed(1)}° · pantalla ${PANTALLA_PX} px de alto`;
}

// El reflejo del ente en la pantalla: se renderiza solo el ente desde la cámara reflejada en el plano de la
// pantalla (sin la habitación, que la taparía), y se pinta volteado, tenue y en modo «trama» dentro de la pantalla.
function reflejar(g) {
  colocarEnte(ENTE.reflejo);
  const pos = camara.position.clone();
  camara.position.set(pos.x, pos.y, 2 * centro.z - pos.z);
  camara.lookAt(pos.x, pos.y, pos.z);
  hab.grupo.visible = false;
  luces.punto(L_EXTRA, [0.1, 1.3, -0.2], 0x9aa6c0, 0.9, 2.4);
  motor.render();
  const capa = document.createElement('canvas');
  capa.width = capa.height = LADO;
  const c = capa.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.drawImage(motor.lienzo, 0, 0, LADO, LADO);
  g.save();
  g.beginPath();
  g.rect(PANT.x, PANT.y, PANT.w, PANT.h);
  g.clip();
  g.globalCompositeOperation = 'screen';
  g.globalAlpha = 0.55;
  g.translate(LADO, 0);
  g.scale(-1, 1);
  g.drawImage(capa, 0, 0);
  g.restore();
  // Todo como estaba.
  hab.grupo.visible = true;
  ente.grupo.visible = false;
  luces.apagar(L_EXTRA);
  camara.position.copy(pos);
  camara.lookAt(centro);
  motor.render();
}

// El lienzo interno (360) escalado ×3 sin suavizado; con escapar, el círculo y el texto encima.
async function png(nombre) {
  const grande = document.createElement('canvas');
  grande.width = grande.height = LADO;
  const g = grande.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(motor.lienzo, 0, 0, LADO, LADO);
  const e = ESTADOS[nombre] ?? {};
  if (e.reflejo) reflejar(g);
  if (e.escapar || e.circulo) {
    g.fillStyle = '#000';
    g.beginPath();
    g.arc(BOLA.x, BOLA.y, BOLA.r, 0, Math.PI * 2);
    g.fill();
  }
  if (e.escapar) {
    // El texto a la resolución interna y escalado ×3, para que tenga los mismos píxeles gordos que el resto.
    const chico = document.createElement('canvas');
    chico.width = chico.height = INTERNO;
    const c = chico.getContext('2d');
    c.font = '13px "VT323"';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = '#ecece6';
    c.fillText(TEXTO_ESCAPAR, INTERNO / 2, (BOLA.y + BOLA.r + 720) / 2 / 3);
    g.drawImage(chico, 0, 0, LADO, LADO);
  }
  return new Promise((r) => grande.toBlob(r, 'image/png'));
}

async function guardar(nombre, blob) {
  const r = await fetch(`/__salida/${nombre}`, { method: 'PUT', body: blob });
  if (!r.ok) throw new Error(`${nombre}: ${r.status}`);
}

// WAV de 16 bits, mono.
function wav(buffer) {
  const datos = buffer.getChannelData(0);
  const sr = buffer.sampleRate;
  const out = new DataView(new ArrayBuffer(44 + datos.length * 2));
  const txt = (o, s) => [...s].forEach((ch, i) => out.setUint8(o + i, ch.charCodeAt(0)));
  txt(0, 'RIFF'); out.setUint32(4, 36 + datos.length * 2, true); txt(8, 'WAVE');
  txt(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true);
  out.setUint32(24, sr, true); out.setUint32(28, sr * 2, true); out.setUint16(32, 2, true); out.setUint16(34, 16, true);
  txt(36, 'data'); out.setUint32(40, datos.length * 2, true);
  for (let i = 0; i < datos.length; i++) out.setInt16(44 + i * 2, Math.max(-1, Math.min(1, datos[i])) * 0x7fff, true);
  return new Blob([out], { type: 'audio/wav' });
}

// Graba lo que suene en un contexto sin altavoces; momentos: [[segundo, fn], ...].
async function grabar(segundos, momentos) {
  const off = new OfflineAudioContext(1, Math.ceil(44100 * segundos), 44100);
  const soltar = grabarEn(off);
  try {
    for (const [t, fn] of momentos) {
      if (t === 0) fn();
      else off.suspend(t).then(() => { fn(); off.resume(); });
    }
    return wav(await off.startRendering());
  } finally {
    soltar();
  }
}

// El ordenador que se enciende y su ambiente en bucle.
async function guardarAmbiente() {
  const comoBuffer = (datos) => ({ getChannelData: () => datos, sampleRate: 44100 });
  await guardar('ordenador_encendido.wav', wav(comoBuffer(await sonidoEncendido())));
  await guardar('ordenador_ambiente_bucle.wav', wav(comoBuffer(await sonidoAmbiente())));
  await guardar('musica_crescendo.wav', wav(comoBuffer(await sonidoMusica())));
  estadoTxt.textContent = 'sonidos del ordenador guardados en video/';
}

// Solo las fotos de la animación.
async function guardarFotos() {
  for (const nombre of Object.keys(ESTADOS).filter((n) => n.startsWith('foto_'))) {
    poner(nombre);
    await guardar(`${nombre}.png`, await png(nombre));
  }
  estadoTxt.textContent = 'fotos guardadas en video/';
}

async function guardarTodo() {
  for (const nombre of Object.keys(ESTADOS).filter((n) => !n.startsWith('foto_'))) {
    poner(nombre);
    await guardar(`estado_${nombre}.png`, await png(nombre));
  }
  for (const [nombre, seg, fn] of SONIDOS) await guardar(`${nombre}.wav`, await grabar(seg, [[0, fn]]));
  await guardar('pista_8s.wav', await grabar(8, PISTA));
  estadoTxt.textContent = 'guardado en video/';
}

const panel = document.getElementById('panel');
for (const nombre of Object.keys(ESTADOS)) {
  const b = document.createElement('button');
  b.textContent = nombre;
  b.addEventListener('click', () => poner(nombre));
  panel.append(b);
}
const bGuia = document.createElement('button');
bGuia.textContent = 'guía QR/bola';
bGuia.addEventListener('click', () => { document.getElementById('guia').classList.toggle('on'); bGuia.classList.toggle('on'); });
const bTodo = document.createElement('button');
bTodo.textContent = 'guardar todo';
bTodo.addEventListener('click', () => guardarTodo().catch((e) => { estadoTxt.textContent = String(e); }));
panel.append(bGuia, bTodo);
poner('A');
window.__video = { poner, guardarTodo, guardarFotos, guardarAmbiente, camara, hab, motor };
