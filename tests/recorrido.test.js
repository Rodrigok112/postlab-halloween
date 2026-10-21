import { test } from 'node:test';
import assert from 'node:assert/strict';
import { poseEn, largoTotal, TRAMOS } from '../js/juego/recorrido.js';

const cerca = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

// rumbo = giro de cámara alrededor de y (convención de Three.js): mira a (-sin r, 0, -cos r).
test('tres tramos de 12, 10 y 12 m: 34 m en total', () => {
  assert.deepEqual(TRAMOS.map((t) => t.largo), [12, 10, 12]);
  assert.equal(largoTotal(), 34);
});

test('empieza en el origen mirando hacia −x', () => {
  const p = poseEn(0);
  assert.ok(cerca(p.x, 0) && cerca(p.z, 0));
  assert.ok(cerca(p.rumbo, Math.PI / 2));
});

test('esquinas y final en su sitio', () => {
  const a = poseEn(12), b = poseEn(22), c = poseEn(34);
  assert.ok(cerca(a.x, -12) && cerca(a.z, 0), 'primera esquina');
  assert.ok(cerca(b.x, -12) && cerca(b.z, -10), 'segunda esquina');
  assert.ok(cerca(c.x, -24) && cerca(c.z, -10), 'final');
});

test('primer giro a la derecha (hacia −z) y segundo a la izquierda (otra vez −x)', () => {
  assert.ok(cerca(poseEn(17).rumbo, 0));
  assert.ok(cerca(poseEn(30).rumbo, Math.PI / 2));
});

test('el rumbo cambia de forma continua', () => {
  for (let d = 0; d < 34; d += 0.1) {
    assert.ok(Math.abs(poseEn(d + 0.1).rumbo - poseEn(d).rumbo) < 0.2, `salto en ${d.toFixed(1)} m`);
  }
});

test('fuera de rango se limita a los extremos', () => {
  assert.deepEqual(poseEn(-5), poseEn(0));
  assert.deepEqual(poseEn(99), poseEn(34));
});
