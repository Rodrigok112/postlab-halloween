import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearAcecho, actualizarAcecho, ACECHO } from '../js/juego/acecho.js';

const ESQUINA = 14;

// Jugador a velocidad constante (m/s) hasta que el acecho termina o pasan 20 s.
function simular(vel) {
  let a = crearAcecho(ESQUINA);
  let jugador = 0;
  const dt = 1 / 120;
  for (let t = 0; t < 20 && !['atrapa', 'fuera'].includes(a.estado); t += dt) {
    jugador += vel * dt;
    a = actualizarAcecho(a, jugador, dt);
  }
  return a;
}

test('la masa está al fondo desde que empiezas a correr, lejos, para que se la vea venir', () => {
  assert.ok(ACECHO.distanciaM >= 35);
  const b = actualizarAcecho(crearAcecho(ESQUINA), 0, 0.016);
  assert.equal(b.estado, 'corre');
});

test('difícil: a 5,8 toques/s giras antes de que llegue y se esfuma en la esquina', () => {
  assert.equal(simular(5.8 * 0.38).estado, 'fuera');
});

test('a 5 toques/s te atrapa', () => {
  assert.equal(simular(5 * 0.38).estado, 'atrapa');
});

test('en una esquina lejana (camino derecho) no sale hasta que te acercas a ella', () => {
  const lejos = actualizarAcecho(crearAcecho(71), 71 - ACECHO.antesM - 1, 0.016);
  assert.equal(lejos.estado, 'espera');
  assert.equal(actualizarAcecho(lejos, 71 - ACECHO.antesM, 0.016).estado, 'corre');
});

test('un salto de tiempo enorme avanza como mucho 0,1 s', () => {
  const a = actualizarAcecho(crearAcecho(ESQUINA), 0, 0.01);
  const b = actualizarAcecho(a, 0, 30);
  assert.ok(a.pos - b.pos <= ACECHO.vel * 0.1 + 1e-9);
});
