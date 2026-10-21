import { test } from 'node:test';
import assert from 'node:assert/strict';
import { textFor, HEADER } from '../js/texts.js';

const at = (step, loop = 1) => ({ step, loop, locked: false, ended: null });

test('HEADER promete 3 preguntas', () => {
  assert.deepEqual(HEADER, { title: 'Encuesta de bienestar', sub: '3 preguntas rápidas. Responde con sinceridad.' });
});

test('textos de q1 a q3', () => {
  assert.deepEqual(textFor(at('q1')), { title: '¿tienes amigos?', sub: '' });
  assert.deepEqual(textFor(at('q2')), { title: '¿tienes familia?', sub: '' });
  assert.deepEqual(textFor(at('q3')), { title: '¿eres feliz?', sub: 'no hace falta que mientas.' });
});

test('la última pregunta muta en cada vuelta', () => {
  assert.deepEqual(textFor(at('q4', 1)), { title: '¿puedo ser tú a partir de ahora?', sub: '' });
  assert.deepEqual(textFor(at('q4', 2)), { title: '¿puedo ser tú a partir de ahora?', sub: 'piénsalo otra vez.' });
  assert.deepEqual(textFor(at('q4', 3)), { title: 'déjame ser tú.', sub: 'lo harías mejor conmigo.' });
  assert.deepEqual(textFor(at('q4', 4)), { title: 'voy a ser tú.', sub: 'no tienes que hacer nada.' });
  assert.deepEqual(textFor(at('q4', 5)), { title: 'ya soy tú.', sub: '' });
});
