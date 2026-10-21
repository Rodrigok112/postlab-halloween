// Textos de la encuesta. Editables: si cambian, actualizar tests/texts.test.js.

import { currentStep } from './survey.js';

// Dice 3 preguntas a propósito: hay 9.
export const HEADER = { title: 'Encuesta de bienestar', sub: '3 preguntas rápidas. Responde con sinceridad.' };

export const INICIO = {
  saludo: 'Hola :)',
  title: 'Soy tu asistente de bienestar permanente.',
  sub: 'Vamos a hacerte un pequeño cuestionario sobre tu estado emocional. Solo te llevará un minuto.',
  volumen: '(Sube el volumen)',
  boton: 'Empezar',
};

export const NOMBRE = {
  title: '¿cómo te llamas?',
  aviso: 'te recordaré para siempre, así que no pongas tu nombre de Habbo.',
  placeholder: 'tu nombre',
  boton: 'Continuar',
};

export const MUERTE = { title: 'HAS MUERTO', boton: 'otra vez' };

// La pregunta típica se escribe sola hasta aquí y se corta.
export const TIPICA_CORTE = 'del 1 al 10, ¿cuánto recomendarías esta oficina a un ami';

const SN = [{ label: 'Sí', value: 'si' }, { label: 'No', value: 'no' }];
const BIEN_MAL = [{ label: 'Bien', value: 'bien' }, { label: 'Mal', value: 'mal' }];

const PREGUNTAS = {
  despertar: { title: '¿cómo te has despertado hoy?', opciones: BIEN_MAL },
  estres: { title: '¿sientes estrés estos días?' },
  amigos: { title: '¿tienes amigos?' },
  familia: { title: '¿tienes familia?' },
  madre: { title: '¿recuerdas la cara de tu madre sin mirar una foto?' },
  morir: { title: '¿tienes miedo a morir?' },
  lugar: { title: 'si alguien ocupara tu lugar mañana, ¿lo notarían?' },
};

// Pregunta final, una entrada por vuelta (1 a 5). N = nombre.
const FINAL = [
  { title: '¿puedo ser tú a partir de ahora, N?', sub: '' },
  { title: '¿puedo ser tú a partir de ahora, N?', sub: '¿seguro? piénsalo otra vez.' },
  { title: 'déjame ser tú, N.', sub: 'jaja. vale, otra vez.' },
  { title: 'voy a ser tú.', sub: 'no tienes que hacer nada.' },
  { title: 'ya soy N.', sub: '' },
];

export function textFor(s) {
  const step = currentStep(s);
  if (step.kind === 'final') {
    const f = FINAL[Math.max(1, Math.min(s.loop, 5)) - 1];
    // Función de reemplazo: así un nombre con «$&» no se interpreta como patrón.
    return { title: f.title.replace('N', () => s.nombre), sub: f.sub, opciones: SN.map((o) => ({ ...o })) };
  }
  const p = PREGUNTAS[step.id];
  if (!p) return { title: '', sub: '', opciones: [] };
  return { title: p.title, sub: '', opciones: (p.opciones ?? SN).map((o) => ({ ...o })) };
}
