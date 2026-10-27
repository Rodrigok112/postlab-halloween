import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aLocal, nivelRitmo, UMBRAL, SEGMENTOS, llenos, RITMO_MAX, umbralDe } from '../js/juego/gesto.js';
import { VEL_ENTE, VEL_ENTE_FINAL, PASO_M } from '../js/juego/carrera.js';

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

test('la barrita sube con los toques por segundo y se llena a RITMO_MAX', () => {
  assert.equal(nivelRitmo(0), 0);
  assert.equal(nivelRitmo(RITMO_MAX), 1);
  assert.equal(nivelRitmo(RITMO_MAX * 3), 1);
  assert.ok(nivelRitmo(4) < nivelRitmo(6));
});

test('la raya de la barrita marca lo rápido que va el ente', () => {
  assert.ok(Math.abs(UMBRAL - nivelRitmo(VEL_ENTE / PASO_M)) < 1e-9);
  assert.ok(UMBRAL > 0.5 && UMBRAL < 0.85, 'hay margen por encima');
});

test('la raya sube a medida que el ente acelera, y al final casi llega arriba', () => {
  assert.ok(umbralDe(VEL_ENTE_FINAL) > umbralDe(VEL_ENTE));
  assert.ok(umbralDe(VEL_ENTE_FINAL) > 0.9 && umbralDe(VEL_ENTE_FINAL) < 1);
});

test('segmentos encendidos de la barrita', () => {
  assert.equal(llenos(0), 0);
  assert.equal(llenos(1), SEGMENTOS);
  assert.equal(llenos(0.5), Math.round(SEGMENTOS / 2));
});
