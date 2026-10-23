import { test } from 'node:test';
import assert from 'node:assert/strict';
import { muestrear, valorEn } from '../js/juego/linea.js';

const CLAVES = [
  { t: 0, pos: [0, 1, 0], mira: [0, 1, -1] },
  { t: 2, pos: [0, 2, 0], mira: [1, 2, 0] },
  { t: 4, pos: [4, 2, 0], mira: [1, 2, 0] },
];

test('antes de la primera clave y después de la última devuelve los extremos', () => {
  assert.deepEqual(muestrear(CLAVES, -1), { pos: [0, 1, 0], mira: [0, 1, -1] });
  assert.deepEqual(muestrear(CLAVES, 9), { pos: [4, 2, 0], mira: [1, 2, 0] });
});

const cerca = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 1e-9);

test('en el punto medio entre dos claves, smoothstep da exactamente la mitad (y la mirada gira la mitad del ángulo)', () => {
  const m = muestrear(CLAVES, 1);
  assert.deepEqual(m.pos, [0, 1.5, 0]);
  assert.ok(cerca(m.mira, [Math.SQRT1_2, 1.5, -Math.SQRT1_2]), String(m.mira));
});

test('la mirada gira como una cabeza: de −x a +z y a +x nunca apunta al suelo ni a la propia cámara', () => {
  const giro = [
    { t: 0, pos: [0, 1.6, 0], mira: [-2, 1.6, 0] },
    { t: 1, pos: [0, 1.6, 0], mira: [0, 1.6, 3] },
    { t: 2, pos: [0, 1.6, 0], mira: [2, 1.6, 0] },
  ];
  for (let t = 0; t <= 2; t += 0.05) {
    const m = muestrear(giro, t);
    const d = m.mira.map((v, i) => v - m.pos[i]);
    assert.ok(Math.abs(d[1]) < 1e-9, `mira hacia arriba/abajo en t=${t.toFixed(2)}`);
    assert.ok(Math.hypot(...d) > 1.5, `la mirada pasa por la cámara en t=${t.toFixed(2)}`);
  }
  assert.ok(muestrear(giro, 1.5).mira[2] > 0, 'de +z a +x pasa por el lado +z, no por detrás');
});

test('suaviza: al 25 % del tramo avanza menos del 25 %', () => {
  const m = muestrear(CLAVES, 2.5);
  assert.ok(m.pos[0] > 0 && m.pos[0] < 1);
});

test('dos claves con el mismo tiempo no dividen por cero (corte de cámara)', () => {
  const corte = [{ t: 1, pos: [0, 0, 0], mira: [0, 0, -1] }, { t: 1, pos: [5, 0, 0], mira: [5, 0, -1] }];
  const m = muestrear(corte, 1);
  assert.ok(m.pos.every(Number.isFinite));
  assert.deepEqual(muestrear(corte, 1.01).pos, [5, 0, 0]);
});

test('valorEn: un número interpolado entre claves { t, v }, con corte seco si dos claves comparten t', () => {
  const zoom = [{ t: 0, v: 68 }, { t: 2, v: 40 }, { t: 2, v: 60 }];
  assert.equal(valorEn(zoom, -1), 68);
  assert.equal(valorEn(zoom, 1), 54);
  assert.equal(valorEn(zoom, 1.99) < 41, true);
  assert.equal(valorEn(zoom, 2), 60);
  assert.equal(valorEn(zoom, 9), 60);
});

test('un giro de 180° de una clave a otra (darse la vuelta) no pasa la mirada por la cámara', () => {
  const vuelta = [{ t: 0, pos: [0, 1.6, 0], mira: [-2, 1.5, 0] }, { t: 1, pos: [0, 1.6, 0], mira: [2, 1.5, 0] }];
  for (let t = 0; t <= 1; t += 0.05) {
    const m = muestrear(vuelta, t);
    const d = m.mira.map((v, i) => v - m.pos[i]);
    assert.ok(Math.hypot(d[0], d[2]) > 1.5, `t=${t.toFixed(2)}`);
  }
});
