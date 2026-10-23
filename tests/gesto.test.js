import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aLocal, segmentos } from '../js/juego/gesto.js';

test('sin girar, el toque cae donde tocas', () => {
  assert.deepEqual(aLocal(120, 300, false, 812), { x: 120, y: 300 });
});

test('girado 90°, el toque se pasa a las coordenadas del juego horizontal', () => {
  // Móvil en vertical de 375 × 812: el juego mide 812 × 375 y está girado. Arriba a la derecha de la pantalla
  // es la esquina de arriba a la izquierda del juego.
  assert.deepEqual(aLocal(375, 0, true, 375), { x: 0, y: 0 });
  // Abajo a la izquierda de la pantalla es abajo a la derecha del juego.
  assert.deepEqual(aLocal(0, 812, true, 375), { x: 812, y: 375 });
  assert.deepEqual(aLocal(100, 200, true, 375), { x: 200, y: 275 });
});

test('la barra del agarre se llena un segmento por toque', () => {
  assert.equal(segmentos(10, 10), 0);
  assert.equal(segmentos(7, 10), 3);
  assert.equal(segmentos(0, 10), 10);
});
