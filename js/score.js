// Partitura original de la música de la encuesta (fa mayor, 112 bpm, corcheas) y cuánto se distorsiona por nivel.
// Notas en MIDI. melody: 8 corcheas por compás, null = silencio.

const F = [53, 57, 60];
const C = [52, 55, 60];
const DM = [50, 53, 57];
const BB = [50, 53, 58];

export const SCORE = {
  bpm: 112,
  bars: [
    { chord: F, bass: 41, melody: [69, null, 72, 69, 67, 65, 67, 69] },
    { chord: C, bass: 48, melody: [67, null, 64, 67, 72, null, 70, 69] },
    { chord: DM, bass: 50, melody: [65, null, 69, 74, 72, 69, 67, 65] },
    { chord: BB, bass: 46, melody: [70, 69, 67, 65, 67, null, null, null] },
    { chord: F, bass: 41, melody: [69, null, 72, 77, 76, 74, 72, 69] },
    { chord: C, bass: 48, melody: [67, null, 72, 76, 74, 72, 70, 67] },
    { chord: BB, bass: 46, melody: [65, 67, 69, 70, 72, null, 74, 72] },
    { chord: C, bass: 48, melody: [72, 70, 69, 67, 64, null, null, null] },
  ],
};

// bpm: tempo. detune: desafinado aleatorio por nota (cents). wobble: vaivén de afinación (cents).
// bits: reducción de bits (0 = sin efecto). dropout: probabilidad de que se pierda una nota. lowpass: filtro (Hz).
const NIVELES = [
  { bpm: 112, detune: 0, wobble: 0, bits: 0, dropout: 0, lowpass: 12000 },
  { bpm: 108, detune: 8, wobble: 6, bits: 0, dropout: 0, lowpass: 9000 },
  { bpm: 100, detune: 20, wobble: 15, bits: 8, dropout: 0.05, lowpass: 6000 },
  { bpm: 90, detune: 40, wobble: 30, bits: 6, dropout: 0.12, lowpass: 4000 },
  { bpm: 78, detune: 70, wobble: 50, bits: 5, dropout: 0.2, lowpass: 2500 },
  { bpm: 66, detune: 120, wobble: 80, bits: 4, dropout: 0.3, lowpass: 1600 },
];

export function distortionFor(level) {
  return { ...NIVELES[Math.max(0, Math.min(Math.round(level), 5))] };
}
