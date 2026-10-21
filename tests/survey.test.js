import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSurvey, answer, unlock, afterEyes, glitchLevel } from '../js/survey.js';

const at = (step, loop = 1) => ({ step, loop, locked: false, ended: null });

test('createSurvey devuelve el estado inicial', () => {
  assert.deepEqual(createSurvey(), { step: 'q1', loop: 1, locked: false, ended: null });
});

test('q1 → q2 → ojos → q3, con bloqueo tras cada respuesta', () => {
  let s = answer(createSurvey(), 'si');
  assert.deepEqual(s, { step: 'q2', loop: 1, locked: true, ended: null });
  s = answer(unlock(s), 'no');
  assert.equal(s.step, 'ojos');
  s = afterEyes(s);
  assert.deepEqual(s, { step: 'q3', loop: 1, locked: false, ended: null });
  s = answer(s, 'no');
  assert.equal(s.step, 'q4');
});

test('answer ignora toques mientras está bloqueado', () => {
  const s = answer(createSurvey(), 'si');
  assert.equal(answer(s, 'si'), s);
  assert.equal(answer(s, 'no'), s);
});

test('Sí a la primera en q4 lleva al final 2', () => {
  assert.equal(answer(at('q4'), 'si').ended, 'final2');
});

test('No en q4 sube la vuelta hasta 5 y el Sí forzado lleva al pasillo', () => {
  let s = at('q4');
  for (let i = 0; i < 4; i++) s = unlock(answer(s, 'no'));
  assert.equal(s.loop, 5);
  assert.equal(s.step, 'q4');
  s = unlock(answer(s, 'no'));
  assert.equal(s.loop, 5);
  assert.equal(answer(s, 'si').ended, 'pasillo');
});

test('answer no hace nada cuando la encuesta terminó', () => {
  const s = answer(at('q4'), 'si');
  assert.equal(answer(s, 'no'), s);
});

test('afterEyes solo actúa en el paso de los ojos', () => {
  const s = at('q2');
  assert.equal(afterEyes(s), s);
});

test('glitchLevel crece con la pregunta y la vuelta', () => {
  assert.equal(glitchLevel(at('q1')), 0);
  assert.equal(glitchLevel(at('q2')), 1);
  assert.equal(glitchLevel(at('q3')), 2);
  assert.equal(glitchLevel(at('q4', 1)), 3);
  assert.equal(glitchLevel(at('q4', 3)), 5);
  assert.equal(glitchLevel(at('q4', 5)), 5);
});
