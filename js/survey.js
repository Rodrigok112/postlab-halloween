// Máquina de estados de la encuesta. Funciones puras: cada una devuelve un estado nuevo.

export const MAX_LOOP = 5;
export const DELAY_MS = { q1: 600, q2: 1200, q3: 2000, q4: 2800 };
export const THUMPS = { q1: 1, q2: 1, q3: 2, q4: 3 };
export const EYES_MS = 120;

const NEXT = { q1: 'q2', q2: 'ojos', q3: 'q4' };

export function createSurvey() {
  return { step: 'q1', loop: 1, locked: false, ended: null };
}

export function answer(s, value) {
  if (s.locked || s.ended) return s;
  if (s.step === 'q4') {
    if (value === 'si') return { ...s, ended: s.loop === 1 ? 'final2' : 'pasillo' };
    return { ...s, loop: Math.min(s.loop + 1, MAX_LOOP), locked: true };
  }
  const next = NEXT[s.step];
  if (!next) return s;
  return { ...s, step: next, locked: true };
}

export function unlock(s) {
  return { ...s, locked: false };
}

export function afterEyes(s) {
  if (s.step !== 'ojos') return s;
  return { ...s, step: 'q3', locked: false };
}

export function glitchLevel(s) {
  switch (s.step) {
    case 'q1': return 0;
    case 'q2': return 1;
    case 'ojos':
    case 'q3': return 2;
    default: return Math.min(3 + s.loop - 1, 5);
  }
}
