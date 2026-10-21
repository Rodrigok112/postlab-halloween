import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buttonsFor, fleePosition, createFleeBudget } from '../js/layout.js';
import { createRng } from '../js/glitch.js';

test('buttonsFor sigue la tabla del spec vuelta a vuelta', () => {
  assert.deepEqual(buttonsFor(1), { si: { size: 'normal' }, no: { scale: 1, mode: 'huye' } });
  assert.deepEqual(buttonsFor(2), { si: { size: 'grande' }, no: { scale: 1, mode: 'movido' } });
  assert.deepEqual(buttonsFor(3), { si: { size: 'mayor' }, no: { scale: 0.7, mode: 'chico' } });
  assert.deepEqual(buttonsFor(4), { si: { size: 'media' }, no: { scale: 0.4, mode: 'esquina' } });
  assert.deepEqual(buttonsFor(5), { si: { size: 'completa' }, no: { scale: 0, mode: 'oculto' } });
});

const inside = (p, vp, b) => p.x >= 0 && p.y >= 0 && p.x <= vp.w - b.w && p.y <= vp.h - b.h;
const centerDist = (p, b, ptr) => Math.hypot(p.x + b.w / 2 - ptr.x, p.y + b.h / 2 - ptr.y);

test('fleePosition queda en pantalla y lejos del dedo', () => {
  const vp = { w: 375, h: 667 }, b = { w: 90, h: 44 };
  const rng = createRng(3);
  for (let i = 0; i < 200; i++) {
    const ptr = { x: rng() * vp.w, y: rng() * vp.h };
    const p = fleePosition(vp, b, ptr, rng);
    assert.ok(inside(p, vp, b), `fuera de pantalla: ${JSON.stringify(p)}`);
    assert.ok(centerDist(p, b, ptr) >= 120, `demasiado cerca: ${JSON.stringify({ p, ptr })}`);
  }
});

test('fleePosition queda en pantalla en 320x568 con el dedo en el centro', () => {
  const vp = { w: 320, h: 568 }, b = { w: 90, h: 44 };
  const p = fleePosition(vp, b, { x: 160, y: 284 }, createRng(9));
  assert.ok(inside(p, vp, b));
});

test('el No huye 3 veces, separadas, y luego se deja tocar', () => {
  const b = createFleeBudget(3, 300);
  assert.equal(b.tryFlee(0), true);
  assert.equal(b.tryFlee(100), false, 'demasiado pronto');
  assert.equal(b.tryFlee(320), true);
  assert.equal(b.tryFlee(700), true);
  assert.equal(b.tryFlee(1200), false, 'ya huyó 3 veces');
});

test('el No no se puede tocar hasta que haya huido 3 veces', () => {
  const b = createFleeBudget(3, 300);
  assert.equal(b.agotado(), false);
  b.tryFlee(0);
  b.tryFlee(100);
  assert.equal(b.agotado(), false, 'una huida bloqueada por el respiro no cuenta');
  b.tryFlee(400);
  b.tryFlee(800);
  assert.equal(b.agotado(), true);
});
