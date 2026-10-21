// Utilidades de glitch: aleatorio determinista, texto corrupto y límite de destellos.

const GLYPHS = [...'█▓▒░#@¿?ÿ§'];

// mulberry32: rápido, determinista y suficiente para efectos visuales.
export function createRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Reemplaza una fracción level * 0.08 de los caracteres que no son espacios.
export function corrupt(text, level, rng) {
  const chars = [...text];
  const fraction = Math.max(0, Math.min(level, 5)) * 0.08;
  if (fraction === 0) return text;
  const positions = chars.map((ch, i) => (ch === ' ' ? -1 : i)).filter((i) => i >= 0);
  const count = Math.max(1, Math.round(positions.length * fraction));
  for (let n = 0; n < count && positions.length > 0; n++) {
    const pick = positions.splice(Math.floor(rng() * positions.length), 1)[0];
    let glyph = GLYPHS[Math.floor(rng() * GLYPHS.length)];
    if (glyph === chars[pick]) glyph = GLYPHS[(GLYPHS.indexOf(glyph) + 1) % GLYPHS.length];
    chars[pick] = glyph;
  }
  return chars.join('');
}

// Ventana deslizante de 1000 ms: como máximo maxPerSecond destellos.
export function createFlashGuard(maxPerSecond = 3) {
  const times = [];
  return {
    tryFlash(nowMs) {
      while (times.length > 0 && nowMs - times[0] >= 1000) times.shift();
      if (times.length >= maxPerSecond) return false;
      times.push(nowMs);
      return true;
    },
  };
}
