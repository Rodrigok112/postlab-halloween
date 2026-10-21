import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STEPS, createSurvey, currentStep, isAuto, questionNumber, answer, advance, unlock, glitchLevel,
  DESTELLO_MS, DESTELLO_GAP_MS,
} from '../js/survey.js';

const ORDEN = ['inicio', 'nombre', 'despertar', 'estres', 'tipica', 'corre', 'amigos', 'familia',
  'madre', 'ente', 'morir', 'buscan', 'lugar', 'aqui', 'final'];

const at = (id, extra = {}) => ({ index: ORDEN.indexOf(id), loop: 1, locked: false, ended: null, nombre: 'Lucía', ...extra });

// Avanza un paso como lo haría la interfaz: responde o deja pasar el automático, y desbloquea.
function step(s) {
  const st = currentStep(s);
  if (isAuto(st)) return advance(s);
  if (st.kind === 'nombre') return unlock(answer(s, 'Lucía'));
  return unlock(answer(s, 'si'));
}

test('STEPS sigue el orden del spec', () => {
  assert.deepEqual(STEPS.map((x) => x.id), ORDEN);
});

test('createSurvey devuelve el estado inicial', () => {
  assert.deepEqual(createSurvey(), { index: 0, loop: 1, locked: false, ended: null, nombre: '' });
});

test('recorrido completo hasta la pregunta final', () => {
  let s = createSurvey();
  const vistos = [currentStep(s).id];
  while (currentStep(s).id !== 'final') { s = step(s); vistos.push(currentStep(s).id); }
  assert.deepEqual(vistos, ORDEN);
  assert.equal(s.nombre, 'Lucía');
});

test('inicio pasa sin bloquear', () => {
  const s = answer(createSurvey(), 'empezar');
  assert.equal(currentStep(s).id, 'nombre');
  assert.equal(s.locked, false);
});

test('nombre vacío o con solo espacios no avanza', () => {
  const s = at('nombre', { nombre: '' });
  assert.equal(answer(s, ''), s);
  assert.equal(answer(s, '   '), s);
});

test('nombre se recorta y se limita a 20 caracteres', () => {
  const s = answer(at('nombre', { nombre: '' }), '  <b>Maximiliano Fernández de la Peña</b>  ');
  assert.equal(s.nombre, '<b>Maximiliano Ferná');
  assert.equal([...s.nombre].length, 20);
  assert.equal(currentStep(s).id, 'despertar');
  assert.equal(s.locked, true);
});

test('answer ignora toques bloqueados, pasos automáticos y encuesta terminada', () => {
  const bloqueado = answer(at('amigos'), 'si');
  assert.equal(answer(bloqueado, 'no'), bloqueado);
  const auto = at('corre');
  assert.equal(answer(auto, 'si'), auto);
  const fin = answer(at('final'), 'si');
  assert.equal(answer(fin, 'no'), fin);
});

test('advance solo actúa en pasos automáticos', () => {
  const s = at('amigos');
  assert.equal(advance(s), s);
  const t = advance(at('tipica', { locked: true }));
  assert.equal(currentStep(t).id, 'corre');
  assert.equal(t.locked, false);
});

test('final: No pasa al instante, sin bloquear, con tope 5', () => {
  let s = at('final');
  for (let i = 0; i < 6; i++) { s = answer(s, 'no'); assert.equal(s.locked, false); }
  assert.equal(s.loop, 5);
  assert.equal(currentStep(s).id, 'final');
});

test('final: Sí a la primera es final2 y forzado es pasillo', () => {
  assert.equal(answer(at('final'), 'si').ended, 'final2');
  assert.equal(answer(at('final', { loop: 2 }), 'si').ended, 'pasillo');
});

test('questionNumber cuenta las preguntas a partir del despertar', () => {
  assert.equal(questionNumber(at('despertar')), 1);
  assert.equal(questionNumber(at('tipica')), 3);
  assert.equal(questionNumber(at('amigos')), 4);
  assert.equal(questionNumber(at('lugar')), 8);
  assert.equal(questionNumber(at('final')), 9);
});

test('glitchLevel crece y la final llega a 5', () => {
  assert.equal(glitchLevel(at('despertar')), 0);
  assert.ok(glitchLevel(at('amigos')) >= glitchLevel(at('estres')));
  assert.ok(glitchLevel(at('lugar')) >= glitchLevel(at('morir')));
  assert.equal(glitchLevel(at('final')), 4);
  assert.equal(glitchLevel(at('final', { loop: 2 })), 5);
  assert.equal(glitchLevel(at('final', { loop: 5 })), 5);
});

test('ningún paso de destellos pasa de 3 por segundo', () => {
  const periodo = DESTELLO_MS + DESTELLO_GAP_MS;
  for (const st of STEPS.filter((x) => x.kind === 'destellos')) {
    assert.ok(st.textos.length >= 1);
    assert.ok(Math.min(st.textos.length, Math.floor(999 / periodo) + 1) <= 3);
  }
  assert.ok(Math.floor(999 / periodo) + 1 <= 3);
});

test('las preguntas de bienestar tienen golpes desde el principio', () => {
  const despertar = STEPS.find((x) => x.id === 'despertar');
  assert.ok(despertar.thumps >= 1 && despertar.delay > 0);
  assert.equal(STEPS.find((x) => x.id === 'final').thumps, undefined);
});
