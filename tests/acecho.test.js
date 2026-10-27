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

test('la masa espera al fondo (una luz roja) hasta que te faltan 2,5 m para la esquina; entonces corre a toda prisa', () => {
  assert.ok(ACECHO.distanciaM >= 35);
  assert.equal(ACECHO.antesM, 2.5);
  assert.ok(ACECHO.vel >= 65, 'a toda prisa: solo se esquiva yendo casi al máximo');
  assert.equal(actualizarAcecho(crearAcecho(ESQUINA), ESQUINA - 2.6, 0.016).estado, 'espera');
  assert.equal(actualizarAcecho(crearAcecho(ESQUINA), ESQUINA - 2.5, 0.016).estado, 'corre');
});

test('extremadamente difícil: a 13,3 toques/s giras antes de que llegue y se esfuma en la esquina', () => {
  assert.equal(simular(13.3 * 0.38).estado, 'fuera');
});

test('a 12,5 toques/s te atrapa', () => {
  assert.equal(simular(12.5 * 0.38).estado, 'atrapa');
});

test('en una esquina lejana (camino derecho) no sale hasta que te acercas a ella', () => {
  const lejos = actualizarAcecho(crearAcecho(71), 71 - ACECHO.antesM - 1, 0.016);
  assert.equal(lejos.estado, 'espera');
  assert.equal(actualizarAcecho(lejos, 71 - ACECHO.antesM, 0.016).estado, 'corre');
});

test('un salto de tiempo enorme avanza como mucho 0,1 s', () => {
  const a = actualizarAcecho(crearAcecho(ESQUINA), ESQUINA - 2.5, 0.01);
  const b = actualizarAcecho(a, ESQUINA - 2.5, 30);
  assert.ok(a.pos - b.pos <= ACECHO.vel * 0.1 + 1e-9);
});
