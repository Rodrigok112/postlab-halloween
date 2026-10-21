import { test } from 'node:test';
import assert from 'node:assert/strict';
import { textFor, HEADER, INICIO, NOMBRE, MUERTE, TIPICA_CORTE } from '../js/texts.js';
import { STEPS } from '../js/survey.js';

const at = (id, loop = 1) => ({ index: STEPS.findIndex((x) => x.id === id), loop, locked: false, ended: null, nombre: 'Lucía' });
const SN = [{ label: 'Sí', value: 'si' }, { label: 'No', value: 'no' }];

test('pantallas fijas', () => {
  assert.deepEqual(HEADER, { title: 'Encuesta de bienestar', sub: '3 preguntas rápidas. Responde con sinceridad.' });
  assert.deepEqual(INICIO, {
    saludo: 'Hola :)',
    title: 'Soy tu asistente de bienestar permanente.',
    sub: 'Vamos a hacerte un pequeño cuestionario sobre tu estado emocional. Solo te llevará un minuto.',
    volumen: '(Sube el volumen)',
    boton: 'Empezar',
  });
  assert.deepEqual(NOMBRE, {
    title: '¿cómo te llamas?',
    aviso: 'te recordaré para siempre, así que no pongas tu nombre de Habbo.',
    placeholder: 'tu nombre',
    boton: 'Continuar',
  });
  assert.deepEqual(MUERTE, { title: 'HAS MUERTO', boton: 'otra vez' });
  assert.equal(TIPICA_CORTE, 'del 1 al 10, ¿cuánto recomendarías esta oficina a un ami');
});

test('preguntas de bienestar y del medio', () => {
  assert.deepEqual(textFor(at('despertar')), {
    title: '¿cómo te has despertado hoy?', sub: '',
    opciones: [{ label: 'Bien', value: 'bien' }, { label: 'Mal', value: 'mal' }],
  });
  assert.deepEqual(textFor(at('estres')), { title: '¿sientes estrés estos días?', sub: '', opciones: SN });
  assert.deepEqual(textFor(at('amigos')), { title: '¿tienes amigos?', sub: '', opciones: SN });
  assert.deepEqual(textFor(at('familia')), { title: '¿tienes familia?', sub: '', opciones: SN });
  assert.deepEqual(textFor(at('madre')), { title: '¿recuerdas la cara de tu madre sin mirar una foto?', sub: '', opciones: SN });
  assert.deepEqual(textFor(at('morir')), { title: '¿tienes miedo a morir?', sub: '', opciones: SN });
  assert.deepEqual(textFor(at('lugar')), { title: 'si alguien ocupara tu lugar mañana, ¿lo notarían?', sub: '', opciones: SN });
});

test('la pregunta final usa el nombre y muta en cada vuelta', () => {
  const t = (loop) => { const { title, sub } = textFor(at('final', loop)); return { title, sub }; };
  assert.deepEqual(t(1), { title: '¿puedo ser tú a partir de ahora, Lucía?', sub: '' });
  assert.deepEqual(t(2), { title: '¿puedo ser tú a partir de ahora, Lucía?', sub: '¿seguro? piénsalo otra vez.' });
  assert.deepEqual(t(3), { title: 'déjame ser tú, Lucía.', sub: 'jaja. vale, otra vez.' });
  assert.deepEqual(t(4), { title: 'voy a ser tú.', sub: 'no tienes que hacer nada.' });
  assert.deepEqual(t(5), { title: 'ya soy Lucía.', sub: '' });
  assert.deepEqual(textFor(at('final', 3)).opciones, SN);
});

test('el nombre se inserta tal cual, aunque tenga $ o HTML', () => {
  const s = { ...at('final'), nombre: '$&<i>x' };
  assert.equal(textFor(s).title, '¿puedo ser tú a partir de ahora, $&<i>x?');
});

test('todos los pasos con respuesta tienen texto', () => {
  for (const st of STEPS.filter((x) => x.kind === 'pregunta' || x.kind === 'final')) {
    assert.ok(textFor(at(st.id)).title.length > 0, st.id);
  }
});
