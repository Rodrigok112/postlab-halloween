import { test } from 'node:test';
import assert from 'node:assert/strict';
import { screamSamples, HOLD } from '../js/scream.js';
import { createRng } from '../js/glitch.js';

const s = screamSamples(48000, 1.5, createRng(5));

test('longitud exacta y amplitud dentro de [-1, 1]', () => {
  assert.equal(s.length, 72000);
  for (const x of s) assert.ok(Math.abs(x) <= 1);
});

test('cuantizado a 5 bits: como mucho 33 valores distintos', () => {
  assert.ok(new Set(s).size <= 33);
  assert.ok(new Set(s).size > 4, 'no puede ser silencio');
});

test('tasa baja tipo PS1: muestras iguales dentro de cada bloque', () => {
  assert.equal(HOLD, 6);
  for (let i = 0; i + HOLD <= s.length; i += HOLD) {
    for (let k = 1; k < HOLD; k++) assert.equal(s[i + k], s[i]);
  }
});

test('es determinista con la misma semilla', () => {
  assert.deepEqual(screamSamples(8000, 0.2, createRng(1)), screamSamples(8000, 0.2, createRng(1)));
});
