// Audio sintetizado con WebAudio. Los golpes de puerta se pueden cambiar por muestras de Freesound más adelante.

let ctx = null;
let noise = null;

// Hay que llamarla dentro del manejador de un toque: los navegadores móviles no dejan sonar nada antes.
export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
}

// Golpe grave de puerta. strength de 0 a 1.
export function thump(strength) {
  if (!ctx) return;
  const s = Math.max(0, Math.min(strength, 1));
  const t = ctx.currentTime;

  const body = ctx.createOscillator();
  body.type = 'sine';
  body.frequency.setValueAtTime(62, t);
  body.frequency.exponentialRampToValueAtTime(38, t + 0.35);
  const bodyGain = ctx.createGain();
  bodyGain.gain.setValueAtTime(0.0001, t);
  bodyGain.gain.exponentialRampToValueAtTime(0.25 + 0.65 * s, t + 0.008);
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
  body.connect(bodyGain).connect(ctx.destination);
  body.start(t);
  body.stop(t + 0.6);

  const hit = ctx.createBufferSource();
  hit.buffer = noise;
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 220 + 700 * s;
  const hitGain = ctx.createGain();
  hitGain.gain.setValueAtTime(0.0001, t);
  hitGain.gain.exponentialRampToValueAtTime(0.15 + 0.5 * s, t + 0.004);
  hitGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
  hit.connect(lowpass).connect(hitGain).connect(ctx.destination);
  hit.start(t);
  hit.stop(t + 0.3);
}
