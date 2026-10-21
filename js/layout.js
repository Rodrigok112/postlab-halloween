// Tamaño y comportamiento de los botones Sí / No en cada vuelta de la última pregunta.

const BUTTONS = {
  1: { si: { size: 'normal' }, no: { scale: 1, mode: 'huye' } },
  2: { si: { size: 'grande' }, no: { scale: 1, mode: 'movido' } },
  3: { si: { size: 'mayor' }, no: { scale: 0.7, mode: 'chico' } },
  4: { si: { size: 'media' }, no: { scale: 0.4, mode: 'esquina' } },
  5: { si: { size: 'completa' }, no: { scale: 0, mode: 'oculto' } },
};

export function buttonsFor(loop) {
  const row = BUTTONS[Math.max(1, Math.min(loop, 5))];
  return { si: { ...row.si }, no: { ...row.no } };
}

// La tabla de vueltas solo aplica a la pregunta final; en las demás los botones son normales.
export function buttonsForStep(esFinal, loop) {
  return esFinal ? buttonsFor(loop) : { si: { size: 'normal' }, no: { scale: 1, mode: 'normal' } };
}

const MIN_DIST = 120;
const TRIES = 20;

// Nueva esquina superior izquierda del botón: dentro de pantalla y lejos del puntero.
export function fleePosition(viewport, button, pointer, rng) {
  const maxX = Math.max(0, viewport.w - button.w);
  const maxY = Math.max(0, viewport.h - button.h);
  const dist = (p) => Math.hypot(p.x + button.w / 2 - pointer.x, p.y + button.h / 2 - pointer.y);
  for (let i = 0; i < TRIES; i++) {
    const p = { x: rng() * maxX, y: rng() * maxY };
    if (dist(p) >= MIN_DIST) return p;
  }
  const corners = [{ x: 0, y: 0 }, { x: maxX, y: 0 }, { x: 0, y: maxY }, { x: maxX, y: maxY }];
  return corners.reduce((best, c) => (dist(c) > dist(best) ? c : best));
}

// Cuántas veces puede huir el No y con qué separación mínima: así cada huida se nota y luego se deja tocar.
export function createFleeBudget(max = 3, cooldownMs = 300) {
  let count = 0;
  let last = -Infinity;
  return {
    tryFlee(nowMs) {
      if (count >= max || nowMs - last < cooldownMs) return false;
      count++;
      last = nowMs;
      return true;
    },
    // Hasta que no ha huido todas las veces, no se deja tocar.
    agotado() {
      return count >= max;
    },
  };
}
