// Grito sintetizado, degradado como una muestra de PS1: varias voces en diente de sierra que suben y caen,
// con vibrato y aspereza, más ruido; después baja tasa de muestreo (retención) y 5 bits.

export const HOLD = 6;
const VOCES = 6;
const NIVELES = 16; // 5 bits: valores de -16/16 a 16/16

export function screamSamples(sampleRate, seconds, rng) {
  const n = Math.round(sampleRate * seconds);
  const out = new Float32Array(n);

  for (let v = 0; v < VOCES; v++) {
    const base = 500 + rng() * 300;
    const pico = 1.25 + rng() * 0.3;
    const vibF = 6 + rng() * 3;
    const vibD = 0.03 + rng() * 0.04;
    const rasp = 30 + rng() * 25;
    const retraso = rng() * 0.15 * seconds;
    let fase = rng();
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const u = Math.max(0, t - retraso) / seconds;
      // Sube hasta el pico al 30 % y cae por debajo del tono base al final.
      const curva = u < 0.3 ? 1 + (pico - 1) * (u / 0.3) : pico - (pico - 0.8) * ((u - 0.3) / 0.7);
      const f = base * curva * (1 + vibD * Math.sin(2 * Math.PI * vibF * t));
      fase = (fase + f / sampleRate) % 1;
      const sierra = fase * 2 - 1;
      const aspereza = 0.6 + 0.4 * Math.sin(2 * Math.PI * rasp * t);
      const env = t < retraso ? 0 : Math.min(1, (t - retraso) / 0.06) * Math.min(1, (seconds - t) / 0.4);
      out[i] += sierra * aspereza * env;
    }
  }

  let pico = 0;
  for (let i = 0; i < n; i++) {
    out[i] += (rng() * 2 - 1) * 0.6;
    pico = Math.max(pico, Math.abs(out[i]));
  }
  const escala = pico > 0 ? 0.95 / pico : 0;

  for (let i = 0; i < n; i += HOLD) {
    const q = Math.round(out[i] * escala * NIVELES) / NIVELES;
    for (let k = 0; k < HOLD && i + k < n; k++) out[i + k] = q;
  }
  return out;
}
