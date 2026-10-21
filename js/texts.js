// Textos de la encuesta. Editables: si cambian, actualizar tests/texts.test.js.

// Dice 3 preguntas a propósito: la cuarta es la sorpresa.
export const HEADER = { title: 'Encuesta de bienestar', sub: '3 preguntas rápidas. Responde con sinceridad.' };

const PREGUNTAS = {
  q1: { title: '¿tienes amigos?', sub: '' },
  q2: { title: '¿tienes familia?', sub: '' },
  q3: { title: '¿eres feliz?', sub: 'no hace falta que mientas.' },
};

// Última pregunta, una entrada por vuelta (1 a 5).
const ULTIMA = [
  { title: '¿puedo ser tú a partir de ahora?', sub: '' },
  { title: '¿puedo ser tú a partir de ahora?', sub: 'piénsalo otra vez.' },
  { title: 'déjame ser tú.', sub: 'lo harías mejor conmigo.' },
  { title: 'voy a ser tú.', sub: 'no tienes que hacer nada.' },
  { title: 'ya soy tú.', sub: '' },
];

export function textFor(s) {
  if (s.step === 'q4') return { ...ULTIMA[Math.max(1, Math.min(s.loop, 5)) - 1] };
  return { ...(PREGUNTAS[s.step] ?? { title: '', sub: '' }) };
}
