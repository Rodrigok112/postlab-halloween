// Máquina de estados de la encuesta. Funciones puras: cada una devuelve un estado nuevo.
// La secuencia es una tabla de pasos; los textos viven en texts.js.

export const MAX_LOOP = 5;
export const MAX_NOMBRE = 20;
// Un par de fotogramas: se ve, pero no da tiempo a mirarlo.
export const ENTE_MS = 70;
export const RAYADO_MS = 2000;

// nivel: corrupción visual y de la música. thumps/delay: golpes y espera tras responder.
// destellos: ms visibles y gap de negro entre uno y otro (como mucho 3 por segundo).
// sinCara: ya no está la carita rosa. mano: sombra de una mano agarrando la tarjeta. golpeteo: golpes constantes.
export const STEPS = [
  { id: 'inicio', kind: 'inicio', nivel: 0 },
  { id: 'nombre', kind: 'nombre', nivel: 0, thumps: 1, delay: 1000 },
  { id: 'solas', kind: 'pregunta', nivel: 0, thumps: 1, delay: 900 },
  { id: 'sonreir', kind: 'pregunta', nivel: 0, thumps: 1, delay: 900 },
  { id: 'despertar', kind: 'pregunta', nivel: 1, thumps: 1, delay: 1000, opciones: ['bien', 'mal'] },
  { id: 'estres', kind: 'pregunta', nivel: 1, thumps: 2, delay: 1200 },
  { id: 'tipica', kind: 'cortada', nivel: 2 },
  { id: 'corre', kind: 'destellos', nivel: 2, textos: ['CORRE'], ms: 150, gap: 200 },
  { id: 'amigos', kind: 'pregunta', nivel: 3, thumps: 2, delay: 1600 },
  { id: 'familia', kind: 'pregunta', nivel: 3, thumps: 2, delay: 1800 },
  { id: 'rayado', kind: 'rayado', nivel: 3 },
  { id: 'madre', kind: 'pregunta', nivel: 3, thumps: 2, delay: 2000 },
  { id: 'ente', kind: 'ente', nivel: 3 },
  { id: 'morir', kind: 'pregunta', nivel: 4, thumps: 3, delay: 2400, sinCara: true },
  { id: 'buscan', kind: 'destellos', nivel: 4, textos: ['TE BUSCAN'], ms: 70, gap: 200 },
  { id: 'lugar', kind: 'pregunta', nivel: 4, thumps: 3, delay: 2800, sinCara: true, mano: true, gritos: true },
  { id: 'aqui', kind: 'destellos', nivel: 5, textos: ['ESTÁ AQUÍ', 'CORRE', 'ESTÁ AQUÍ'], ms: 80, gap: 260 },
  { id: 'final', kind: 'final', nivel: 4, sinCara: true, golpeteo: true },
];

const AUTO = new Set(['cortada', 'destellos', 'ente', 'rayado']);
const NUMERADOS = new Set(['pregunta', 'cortada', 'final']);

export function createSurvey() {
  return { index: 0, loop: 1, locked: false, ended: null, nombre: '' };
}

export function currentStep(s) {
  return STEPS[s.index];
}

export function isAuto(step) {
  return AUTO.has(step.kind);
}

// Número que enseña el contador «pregunta N de 3».
export function questionNumber(s) {
  return STEPS.slice(0, s.index + 1).filter((x) => NUMERADOS.has(x.kind)).length;
}

const next = (s, locked) => ({ ...s, index: Math.min(s.index + 1, STEPS.length - 1), locked });

export function answer(s, value) {
  if (s.locked || s.ended) return s;
  const step = currentStep(s);
  switch (step.kind) {
    case 'inicio':
      return next(s, false);
    case 'nombre': {
      const nombre = [...String(value ?? '').trim()].slice(0, MAX_NOMBRE).join('');
      if (!nombre) return s;
      return { ...next(s, true), nombre };
    }
    case 'pregunta':
      return next(s, true);
    case 'final':
      if (value === 'si') return { ...s, ended: s.loop === 1 ? 'final2' : 'pasillo' };
      return { ...s, loop: Math.min(s.loop + 1, MAX_LOOP), locked: false };
    default:
      return s;
  }
}

export function advance(s) {
  if (!isAuto(currentStep(s))) return s;
  return next(s, false);
}

export function unlock(s) {
  return { ...s, locked: false };
}

export function glitchLevel(s) {
  const step = currentStep(s);
  if (step.kind === 'final') return Math.min(step.nivel + s.loop - 1, 5);
  return step.nivel;
}
