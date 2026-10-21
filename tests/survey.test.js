import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STEPS, createSurvey, currentStep, isAuto, questionNumber, answer, advance, unlock, glitchLevel,
  ENTE_MS, RAYADO_MS,
} from '../js/survey.js';

const ORDEN = ['inicio', 'nombre', 'solas', 'sonreir', 'despertar', 'estres', 'tipica', 'corre', 'amigos',
  'familia', 'rayado', 'madre', 'ente', 'morir', 'buscan', 'lugar', 'aqui', 'final'];

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
  assert.equal(currentStep(s).id, 'solas');
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

test('questionNumber cuenta las preguntas a partir de la primera', () => {
  assert.equal(questionNumber(at('solas')), 1);
  assert.equal(questionNumber(at('despertar')), 3);
  assert.equal(questionNumber(at('tipica')), 5);
  assert.equal(questionNumber(at('amigos')), 6);
  assert.equal(questionNumber(at('madre')), 8);
  assert.equal(questionNumber(at('lugar')), 10);
  assert.equal(questionNumber(at('final')), 11);
});

test('glitch: 1–2 limpias, la 3 se rompe y se ordena, la 4 rota constante, luego sube', () => {
  assert.equal(glitchLevel(at('solas')), 0);
  assert.equal(glitchLevel(at('sonreir')), 0);
  assert.equal(glitchLevel(at('despertar')), 0);
  assert.equal(STEPS.find((x) => x.id === 'despertar').glitchPasajero, true);
  assert.equal(STEPS.filter((x) => x.glitchPasajero).length, 1);
  assert.equal(glitchLevel(at('estres')), 1);
  assert.equal(glitchLevel(at('tipica')), 2);
  assert.ok(glitchLevel(at('amigos')) > glitchLevel(at('tipica')));
  assert.ok(glitchLevel(at('amigos')) >= glitchLevel(at('estres')));
  assert.ok(glitchLevel(at('lugar')) >= glitchLevel(at('morir')));
  assert.equal(glitchLevel(at('final')), 4);
  assert.equal(glitchLevel(at('final', { loop: 2 })), 5);
  assert.equal(glitchLevel(at('final', { loop: 5 })), 5);
});

test('ningún paso de destellos pasa de 3 por segundo', () => {
  for (const st of STEPS.filter((x) => x.kind === 'destellos')) {
    assert.ok(st.textos.length >= 1 && st.ms > 0 && st.gap > 0, st.id);
    // Destellos que caben en cualquier ventana de 1 s: no más que los que hay ni que los que permite el periodo.
    assert.ok(Math.min(st.textos.length, Math.floor(999 / (st.ms + st.gap)) + 1) <= 3, st.id);
  }
});

test('«TE BUSCAN» y «ESTÁ AQUÍ» son más cortos que «CORRE»', () => {
  const ms = (id) => STEPS.find((x) => x.id === id).ms;
  assert.ok(ms('buscan') < ms('corre'));
  assert.ok(ms('aqui') < ms('corre'));
});

test('la pantalla rayada dura 2 s y el ente tras la madre un par de fotogramas', () => {
  assert.equal(RAYADO_MS, 2000);
  assert.ok(ENTE_MS >= 50 && ENTE_MS <= 90);
  assert.ok(isAuto(STEPS.find((x) => x.id === 'rayado')));
});

test('la cara rosa desaparece desde «miedo a morir»; ya no hay mano', () => {
  const st = (id) => STEPS.find((x) => x.id === id);
  for (const id of ['solas', 'amigos', 'madre']) assert.ok(!st(id).sinCara, id);
  for (const id of ['morir', 'lugar', 'final']) assert.equal(st(id).sinCara, true, id);
  assert.equal(STEPS.filter((x) => 'mano' in x).length, 0);
});

test('la pregunta final va sin música', () => {
  assert.equal(STEPS.find((x) => x.id === 'final').sinMusica, true);
  assert.equal(STEPS.filter((x) => x.sinMusica).length, 1);
});

test('sin golpes en las preguntas 1–2, desde la 3; en la final, golpeteo constante sin espera', () => {
  const st = (id) => STEPS.find((x) => x.id === id);
  assert.equal(st('nombre').thumps, undefined);
  assert.equal(st('solas').thumps, undefined);
  assert.equal(st('sonreir').thumps, undefined);
  assert.ok(st('solas').delay > 0 && st('sonreir').delay > 0);
  assert.ok(st('despertar').thumps >= 1);
  const final = STEPS.find((x) => x.id === 'final');
  assert.equal(final.thumps, undefined);
  assert.equal(final.golpeteo, true);
});
