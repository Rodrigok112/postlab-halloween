import { test } from 'node:test';
import assert from 'node:assert/strict';
import { textFor, contador, HEADER, INICIO, NOMBRE, MUERTE, TIPICA_CORTE, JEJE_MS, TOTAL_PROMETIDO, ahiEstas, PSICOLOGO, escrituraFinal, ESCRITURA_FINAL } from '../js/texts.js';
import { STEPS } from '../js/survey.js';

const at = (id, loop = 1) => ({ index: STEPS.findIndex((x) => x.id === id), loop, locked: false, ended: null, nombre: 'Lucía' });
const SN = [{ label: 'Sí', value: 'si' }, { label: 'No', value: 'no' }];

test('pantallas fijas', () => {
  assert.deepEqual(HEADER, { title: 'Encuesta de bienestar', sub: '5 preguntas rápidas. Responde con sinceridad.' });
  assert.equal(TOTAL_PROMETIDO, 5);
  assert.deepEqual(INICIO, {
    saludo: 'Hola :)',
    title: 'Soy tu asistente de bienestar permanente.',
    sub: 'Vamos a hacerte un pequeño cuestionario sobre tu estado emocional. Solo te llevará un minuto.',
    volumen: '(Sube el volumen)',
    boton: 'Empezar',
  });
  assert.deepEqual(NOMBRE, {
    title: '¿cómo te llamas?',
    avisoBorde: 'te recordaré para siempre, así que mejor no pongas un nombre de mierda.',
    aviso: 'te recordaré para siempre, así que no pongas tu usuario de Tuenti.',
    cambioMs: 3500,
    placeholder: 'tu nombre',
    boton: 'Continuar',
  });
  assert.deepEqual(MUERTE, { title: 'HAS MUERTO', boton: 'otra vez' });
  assert.equal(TIPICA_CORTE, 'del 1 al 10, ¿cuánto recomendarías tu vida a un ami');
  assert.equal(JEJE_MS, 2000);
});

test('preguntas de bienestar y del medio', () => {
  assert.deepEqual(textFor(at('solas')), { title: '¿pasas mucho tiempo a solas?', sub: '', extra: ' jeje', opciones: SN });
  assert.deepEqual(textFor(at('sonreir')), { title: '¿te gusta sonreír?', sub: '', extra: '', opciones: SN });
  assert.deepEqual(textFor(at('despertar')), {
    title: '¿cómo te has despertado hoy?', sub: '', extra: '',
    opciones: [{ label: 'Bien', value: 'bien' }, { label: 'Mal', value: 'mal' }],
  });
  assert.deepEqual(textFor(at('estres')), { title: '¿sientes estrés estos días?', sub: '', extra: '', opciones: SN });
  assert.deepEqual(textFor(at('amigos')), { title: '¿tienes amigos?', sub: '', extra: '', opciones: SN });
  assert.deepEqual(textFor(at('familia')), { title: '¿tienes familia?', sub: '', extra: '', opciones: SN });
  assert.deepEqual(textFor(at('madre')), { title: '¿recuerdas la cara de tu madre sin mirar una foto?', sub: '', extra: '', opciones: SN });
  assert.deepEqual(textFor(at('morir')), { title: '¿tienes miedo a morir?', sub: '', extra: '', opciones: [SN[0]] });
  assert.deepEqual(textFor(at('lugar')), { title: 'si alguien ocupara tu lugar mañana, ¿lo notarían?', sub: '', extra: '', opciones: SN });
});

test('la pregunta final usa el nombre y muta en cada vuelta', () => {
  const t = (loop) => { const { title, sub } = textFor(at('final', loop)); return { title, sub }; };
  assert.deepEqual(t(1), { title: '¿puedo tomar tu cuerpo y ser tú desde ahora?', sub: '' });
  assert.deepEqual(t(2), { title: '¿puedo tomar tu cuerpo y ser tú desde ahora, Lucía?', sub: '¿seguro? piénsalo otra vez.' });
  assert.deepEqual(t(3), { title: 'déjame ser tú, Lucía.', sub: 'jaja. vale, otra vez.' });
  assert.deepEqual(t(4), { title: 'voy a ser tú.', sub: 'no tienes que hacer nada.' });
  assert.deepEqual(t(5), { title: 'ya soy Lucía.', sub: '' });
  assert.deepEqual(textFor(at('final', 3)).opciones, SN);
});

test('el nombre se inserta tal cual, aunque tenga $ o HTML', () => {
  const s = { ...at('final', 2), nombre: '$&<i>x' };
  assert.equal(textFor(s).title, '¿puedo tomar tu cuerpo y ser tú desde ahora, $&<i>x?');
});

test('la primera vez, la final se escribe sola: primero el nombre, despacio, y luego la pregunta', () => {
  assert.deepEqual(escrituraFinal('Lucía'), ['Lucía', '¿puedo tomar tu cuerpo y ser tú desde ahora?']);
  assert.ok(ESCRITURA_FINAL.nombreMs > ESCRITURA_FINAL.letraMs, 'el nombre, más despacio');
});

test('todos los pasos con respuesta tienen texto', () => {
  for (const st of STEPS.filter((x) => x.kind === 'pregunta' || x.kind === 'final')) {
    assert.ok(textFor(at(st.id)).title.length > 0, st.id);
  }
});

test('contador: «pregunta N de 5», y se pasa de 5 a partir de la sexta', () => {
  assert.equal(contador(1), 'pregunta 1 de 5');
  assert.equal(contador(5), 'pregunta 5 de 5');
  assert.equal(contador(6), 'pregunta 6 de 5');
  assert.equal(contador(11), 'pregunta 11 de 5');
});

test('«ahí estás» lleva el nombre, o nada si no lo hay', () => {
  assert.equal(ahiEstas('Rodrigo'), 'ahí estás, Rodrigo');
  assert.equal(ahiEstas(''), 'ahí estás');
  assert.equal(ahiEstas(undefined), 'ahí estás');
});

test('final del psicólogo: «{nombre}, hablemos un poco de tu vida» y «vete al psicólogo»', () => {
  assert.equal(PSICOLOGO.frase('Rodrigo'), 'Rodrigo, hablemos un poco de tu vida');
  assert.equal(PSICOLOGO.frase(''), 'hablemos un poco de tu vida');
  assert.equal(PSICOLOGO.cierre, 'vete al psicólogo');
});
