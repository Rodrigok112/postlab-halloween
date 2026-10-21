import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng, corrupt, createFlashGuard } from '../js/glitch.js';

test('createRng es determinista y está en [0,1)', () => {
  const a = createRng(42), b = createRng(42);
  for (let i = 0; i < 100; i++) { const x = a(); assert.equal(x, b()); assert.ok(x >= 0 && x < 1); }
});

test('corrupt con nivel 0 devuelve el texto igual', () => {
  assert.equal(corrupt('¿tienes amigos?', 0, createRng(1)), '¿tienes amigos?');
});

test('corrupt conserva longitud y espacios', () => {
  const t = '¿puedo ser tú a partir de ahora?';
  const c = corrupt(t, 5, createRng(7));
  assert.equal([...c].length, [...t].length);
  [...t].forEach((ch, i) => { if (ch === ' ') assert.equal([...c][i], ' '); });
  assert.notEqual(c, t);
});

test('createFlashGuard deja como máximo 3 destellos por segundo', () => {
  const g = createFlashGuard(3);
  const results = [0, 100, 200, 300, 400].map((t) => g.tryFlash(t));
  assert.deepEqual(results, [true, true, true, false, false]);
  assert.equal(g.tryFlash(1001), true);
});
