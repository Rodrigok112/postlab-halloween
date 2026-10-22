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

test('es rápida (al menos 6,5 m/s) y sale de lejos, para que se vea venir', () => {
  assert.ok(ACECHO.vel >= 6.5);
  assert.ok(ACECHO.distanciaM >= 35);
});

test('espera escondido hasta que el jugador lleva unos metros', () => {
  const a = actualizarAcecho(crearAcecho(ESQUINA), ACECHO.apareceM - 0.1, 0.1);
  assert.equal(a.estado, 'espera');
  const b = actualizarAcecho(a, ACECHO.apareceM, 0.016);
  assert.equal(b.estado, 'corre');
  assert.equal(b.pos, ACECHO.distanciaM);
});

test('a ritmo normal (5 toques/s, 1,9 m/s) giras antes de que llegue y se esfuma en la esquina', () => {
  assert.equal(simular(1.9).estado, 'fuera');
});

test('margen generoso: a 3,6 toques/s todavía escapas', () => {
  assert.equal(simular(3.6 * 0.38).estado, 'fuera');
});

test('si vas muy lento (3 toques/s) te atrapa', () => {
  assert.equal(simular(3 * 0.38).estado, 'atrapa');
});

test('un salto de tiempo enorme avanza como mucho 0,1 s', () => {
  const a = actualizarAcecho(crearAcecho(ESQUINA), ACECHO.apareceM, 0.01);
  const b = actualizarAcecho(a, ACECHO.apareceM, 30);
  assert.ok(a.pos - b.pos <= ACECHO.vel * 0.1 + 1e-9);
});
