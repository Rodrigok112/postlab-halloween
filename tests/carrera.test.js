import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createCarrera, tap, update, soltar, agarrar, distancia, PASO_M, LARGO_M, PUERTA_M, DT_MAX_S, AGARRE_TOQUES,
} from '../js/juego/carrera.js';
import { crearRecorrido, RUTAS } from '../js/juego/recorrido.js';

const IZQ = crearRecorrido(RUTAS.izquierda).largo;
const DER = crearRecorrido(RUTAS.derecha).largo;

// Ritmo constante de toques. A PUERTA_M el ente revienta la puerta del cruce y sale desde ahí (d = 0).
function simular(toquesPorSegundo, largo, maxS = 120) {
  let c = createCarrera(largo);
  const dt = 1 / 120;
  let siguiente = 0;
  for (let t = 0; c.estado === 'corriendo' && t < maxS; t += dt) {
    if (t >= siguiente) { c = tap(c); siguiente += 1 / toquesPorSegundo; }
    if (!c.suelto && c.jugador >= PUERTA_M) c = soltar(c, 0);
    c = update(c, dt);
  }
  return c;
}

test('al empezar, el ente sigue encerrado tras la puerta: no se mueve ni atrapa', () => {
  let c = createCarrera(IZQ);
  assert.equal(c.suelto, false);
  for (let i = 0; i < 100; i++) c = update(c, 0.1);
  assert.equal(c.estado, 'corriendo');
  assert.equal(distancia(c), Infinity);
});

test('soltar coloca al ente donde revienta la puerta', () => {
  const c = soltar({ ...createCarrera(IZQ), jugador: 6 }, 0);
  assert.equal(c.suelto, true);
  assert.equal(distancia(c), 6);
});

test('cada toque avanza un paso y cuenta una vez', () => {
  const c = tap(tap(createCarrera(IZQ)));
  assert.equal(c.toques, 2);
  assert.ok(Math.abs(c.jugador - 2 * PASO_M) < 1e-9);
});

test('si un brazo te agarra, cada toque avanza la mitad hasta que te sueltas con 14 toques', () => {
  let c = agarrar(createCarrera(IZQ));
  assert.equal(c.agarre, AGARRE_TOQUES);
  assert.equal(AGARRE_TOQUES, 14);
  c = tap(c);
  assert.ok(Math.abs(c.jugador - PASO_M / 2) < 1e-9);
  for (let i = 1; i < AGARRE_TOQUES; i++) c = tap(c);
  assert.equal(c.agarre, 0);
  const antes = c.jugador;
  c = tap(c);
  assert.ok(Math.abs(c.jugador - antes - PASO_M) < 1e-9, 'suelto: paso entero');
});

test('por defecto el largo es el del camino izquierdo', () => {
  assert.equal(LARGO_M, IZQ);
});

test('muy difícil (hay que esforzarse): por la izquierda, a 6,4 toques/s te atrapa y a 7 escapas', () => {
  assert.equal(simular(6.4, IZQ).estado, 'atrapado');
  assert.equal(simular(7.0, IZQ).estado, 'escapado');
});

test('por la derecha, más larga, a 6,5 toques/s te atrapa y a 7,1 escapas', () => {
  assert.equal(simular(6.5, DER).estado, 'atrapado');
  assert.equal(simular(7.1, DER).estado, 'escapado');
});

test('un salto de tiempo enorme (pestaña en segundo plano) avanza como mucho DT_MAX_S', () => {
  const c0 = update(soltar(createCarrera(IZQ), -6), 5);
  const c1 = update(c0, 30);
  assert.ok(c1.t - c0.t <= DT_MAX_S + 1e-9);
  assert.equal(c1.estado, 'corriendo');
});

test('fuera de «corriendo» nada cambia', () => {
  let c = createCarrera(IZQ);
  for (let i = 0; i < 400; i++) c = tap(c);
  assert.equal(c.estado, 'escapado');
  assert.equal(tap(c), c);
  assert.equal(update(c, 0.05), c);
});
