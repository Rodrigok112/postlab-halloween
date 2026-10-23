import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearRecorrido, RUTAS, CRUCE } from '../js/juego/recorrido.js';

const cerca = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;
const izq = crearRecorrido(RUTAS.izquierda);
const der = crearRecorrido(RUTAS.derecha);

// rumbo = giro de cámara alrededor de y (convención de Three.js): mira a (-sin r, 0, -cos r).
test('la izquierda es la corta (76 m) y la derecha la larga, con más curvas (95 m)', () => {
  assert.equal(izq.largo, 76);
  assert.equal(der.largo, 95);
  assert.ok(der.esquinas.length > izq.esquinas.length);
});

test('las dos salen del cruce: la izquierda hacia +z y la derecha hacia −z', () => {
  const a = izq.poseEn(0), b = der.poseEn(0);
  assert.ok(cerca(a.x, CRUCE.x) && cerca(a.z, CRUCE.z));
  assert.ok(cerca(b.x, CRUCE.x) && cerca(b.z, CRUCE.z));
  assert.ok(cerca(-Math.cos(a.rumbo), 1), 'izquierda mira a +z');
  assert.ok(cerca(-Math.cos(b.rumbo), -1), 'derecha mira a −z');
});

test('la primera esquina: a 22 m por la izquierda (pasillo largo y tranquilo) y a 14 m por la derecha', () => {
  assert.equal(izq.esquinas[0], 22);
  assert.equal(der.esquinas[0], 14);
  const e = izq.poseEn(22);
  assert.ok(cerca(e.x, CRUCE.x) && cerca(e.z, CRUCE.z + 22));
});

test('el rumbo cambia de forma continua', () => {
  for (const r of [izq, der]) {
    for (let d = 0; d < r.largo; d += 0.1) {
      assert.ok(Math.abs(r.poseEn(d + 0.1).rumbo - r.poseEn(d).rumbo) < 0.2, `salto en ${d.toFixed(1)} m`);
    }
  }
});

test('fuera de rango se limita a los extremos', () => {
  assert.deepEqual(izq.poseEn(-5), izq.poseEn(0));
  assert.deepEqual(der.poseEn(999), der.poseEn(95));
});

test('la masa: por la izquierda en la segunda esquina; por la derecha, en la segunda parte del camino', () => {
  assert.equal(izq.esquinaRecto, izq.esquinas[1]);
  assert.equal(izq.tramoRecto, 1);
  assert.ok(der.esquinaRecto > der.largo / 2);
  assert.ok(izq.esquinas.includes(izq.esquinaRecto) && der.esquinas.includes(der.esquinaRecto));
});

test('el pasillo que sigue recto tras esa esquina continúa en la misma dirección', () => {
  for (const r of [izq, der]) {
    const e = r.poseEn(r.esquinaRecto - 2);
    const f = r.poseEn(r.esquinaRecto - 1.5);
    const dir = [(f.x - e.x) / 0.5, (f.z - e.z) / 0.5];
    const p = r.recto(5);
    const esq = r.recto(0);
    assert.ok(cerca(p.x, esq.x + dir[0] * 5, 1e-6) && cerca(p.z, esq.z + dir[1] * 5, 1e-6));
    assert.ok(r.sigueRecto >= 40);
  }
});

test('los brazos de pared: por la derecha, sueltos en la primera parte', () => {
  assert.ok(der.brazos[0] > 6 && der.brazos[0] < 12 && der.brazos[1] <= der.largo / 2, 'después de la puerta reventada');
  assert.equal(izq.brazos, null, 'por la izquierda no hay brazos sueltos');
});

test('por la izquierda, tras la esquina de la masa, salen todos los brazos a la vez y la salida está llena de ellos', () => {
  const [o0, o1] = izq.oleada;
  assert.ok(o0 > izq.esquinaRecto && o1 < izq.esquinas[2], 'la oleada, en el tramo después de la masa');
  const [s0, s1] = izq.salida;
  assert.ok(s0 > izq.esquinas[2] && s1 < izq.largo, 'la salida, en el último tramo');
  assert.equal(der.oleada, null);
  assert.equal(der.salida, null);
});

// Muestras del eje de cada pasillo, para comprobar que ninguno pisa la habitación ni a otro.
const muestras = (fn, desde, hasta) => {
  const out = [];
  for (let d = desde; d <= hasta; d += 0.5) out.push(fn(d));
  return out;
};
const minDist = (as, bs) => Math.min(...as.flatMap((a) => bs.map((b) => Math.hypot(a.x - b.x, a.z - b.z))));

test('el cruce está justo al otro lado de la puerta izquierda de la habitación de 7 m', () => {
  assert.equal(CRUCE.x, -4.3);
});

test('ningún pasillo entra en la habitación', () => {
  for (const r of [izq, der]) {
    for (const p of [...muestras(r.poseEn, 0, r.largo), ...muestras(r.recto, 0, r.sigueRecto)]) {
      const dentro = p.x > -4 && p.x < 4 && p.z > -2.15 && p.z < 2.15;
      assert.ok(!dentro, `(${p.x.toFixed(1)}, ${p.z.toFixed(1)})`);
    }
  }
});

test('los pasillos no se tocan entre sí (al menos 2,4 m entre ejes)', () => {
  const tramosIzq = muestras(izq.poseEn, 2, izq.largo);
  const tramosDer = muestras(der.poseEn, 2, der.largo);
  const rectoIzq = muestras(izq.recto, 2, izq.sigueRecto);
  const rectoDer = muestras(der.recto, 2, der.sigueRecto);
  assert.ok(minDist(tramosIzq, tramosDer) >= 2.4, 'izquierda contra derecha');
  assert.ok(minDist(rectoIzq, tramosDer) >= 2.4 && minDist(rectoDer, tramosIzq) >= 2.4, 'rectos contra el otro camino');
  // Contra su propio camino, sin contar los metros de alrededor de la esquina de la que sale.
  const lejosDe = (r) => [...muestras(r.poseEn, 0, r.esquinaRecto - 3), ...muestras(r.poseEn, r.esquinaRecto + 3, r.largo)];
  assert.ok(minDist(rectoIzq, lejosDe(izq)) >= 2.4, 'recto izquierdo contra su camino');
  assert.ok(minDist(rectoDer, lejosDe(der)) >= 2.4, 'recto derecho contra su camino');
});
