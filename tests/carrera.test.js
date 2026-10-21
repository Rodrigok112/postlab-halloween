import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createCarrera, tap, update, distancia, PASO_M, LARGO_M, VENTAJA_M, DT_MAX_S,
} from '../js/juego/carrera.js';

// Simula un ritmo constante de toques durante como mucho maxS segundos.
function simular(toquesPorSegundo, maxS = 60) {
  let c = createCarrera();
  const dt = 1 / 120;
  let siguiente = 0;
  let t = 0;
  while (c.estado === 'corriendo' && t < maxS) {
    t += dt;
    if (t >= siguiente) { c = tap(c); siguiente += 1 / toquesPorSegundo; }
    c = update(c, dt);
  }
  return { c, t };
}

test('estado inicial: el ente empieza detrás con ventaja', () => {
  assert.deepEqual(createCarrera(), { jugador: 0, ente: -VENTAJA_M, toques: 0, t: 0, estado: 'corriendo' });
  assert.equal(distancia(createCarrera()), VENTAJA_M);
});

test('cada toque avanza un paso y cuenta una vez', () => {
  const c = tap(tap(createCarrera()));
  assert.equal(c.toques, 2);
  assert.ok(Math.abs(c.jugador - 2 * PASO_M) < 1e-9);
});

test('muchísimos toques seguidos terminan en la meta sin pasarse', () => {
  let c = createCarrera();
  for (let i = 0; i < 200; i++) c = tap(c);
  assert.equal(c.estado, 'escapado');
  assert.equal(c.jugador, LARGO_M);
  assert.equal(c.toques, Math.ceil(LARGO_M / PASO_M));
});

test('a 3,5 toques por segundo te atrapa', () => {
  assert.equal(simular(3.5).c.estado, 'atrapado');
});

test('a 4,5 toques por segundo escapas en unos 20 s', () => {
  const { c, t } = simular(4.5);
  assert.equal(c.estado, 'escapado');
  assert.ok(t < 21, `tardó ${t.toFixed(1)} s`);
  assert.ok(c.toques >= 85 && c.toques <= 95, `${c.toques} toques`);
});

test('un salto de tiempo enorme (pestaña en segundo plano) avanza como mucho DT_MAX_S', () => {
  const c0 = update(createCarrera(), 5);
  const c1 = update(c0, 30);
  assert.ok(c1.t - c0.t <= DT_MAX_S + 1e-9);
  assert.equal(c1.estado, 'corriendo');
});

test('fuera de «corriendo» nada cambia', () => {
  let c = createCarrera();
  for (let i = 0; i < 200; i++) c = tap(c);
  assert.equal(tap(c), c);
  assert.equal(update(c, 0.05), c);
});
