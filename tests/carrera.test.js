import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createCarrera, tap, update, soltar, agarrar, distancia, velEnte, PASO_M, LARGO_M, PUERTA_M, DT_MAX_S, AGARRE_TOQUES,
  VEL_ENTE, VEL_ENTE_FINAL,
} from '../js/juego/carrera.js';
import { crearRecorrido, RUTAS } from '../js/juego/recorrido.js';

const IZQ = crearRecorrido(RUTAS.izquierda).largo;
const DER = crearRecorrido(RUTAS.derecha).largo;

// Ritmo constante de toques. A PUERTA_M el ente revienta la puerta del cruce y sale desde ahí (d = 0).
function simular(toquesPorSegundo, largo, maxS = 120) {
  let c = createCarrera(largo);
  const dt = 1 / 120;
  let siguiente = 0;
  for (let t = 0; c.estado === 'corriendo' && t < maxS; t += dt) {
    if (t >= siguiente) { c = tap(c); siguiente += 1 / toquesPorSegundo; }
    if (!c.suelto && c.jugador >= PUERTA_M) c = soltar(c, 0);
    c = update(c, dt);
  }
  return c;
}

test('al empezar, el ente sigue encerrado tras la puerta: no se mueve ni atrapa', () => {
  let c = createCarrera(IZQ);
  assert.equal(c.suelto, false);
  for (let i = 0; i < 100; i++) c = update(c, 0.1);
  assert.equal(c.estado, 'corriendo');
  assert.equal(distancia(c), Infinity);
});

test('soltar coloca al ente donde revienta la puerta', () => {
  const c = soltar({ ...createCarrera(IZQ), jugador: 6 }, 0);
  assert.equal(c.suelto, true);
  assert.equal(distancia(c), 6);
});

test('cada toque avanza un paso y cuenta una vez', () => {
  const c = tap(tap(createCarrera(IZQ)));
  assert.equal(c.toques, 2);
  assert.ok(Math.abs(c.jugador - 2 * PASO_M) < 1e-9);
});

test('si un brazo te agarra, cada toque avanza la mitad hasta que te sueltas con 22 toques', () => {
  let c = agarrar(createCarrera(IZQ));
  assert.equal(c.agarre, AGARRE_TOQUES);
  assert.equal(AGARRE_TOQUES, 22);
  c = tap(c);
  assert.ok(Math.abs(c.jugador - PASO_M / 2) < 1e-9);
  for (let i = 1; i < AGARRE_TOQUES; i++) c = tap(c);
  assert.equal(c.agarre, 0);
  const antes = c.jugador;
  c = tap(c);
  assert.ok(Math.abs(c.jugador - antes - PASO_M) < 1e-9, 'suelto: paso entero');
});

test('por defecto el largo es el del camino izquierdo', () => {
  assert.equal(LARGO_M, IZQ);
});

test('el ente acelera según avanzas: de 3,6 m/s al salir a 4,4 m/s al final del recorrido', () => {
  const c = soltar(createCarrera(IZQ), 0);
  assert.equal(velEnte({ ...c, jugador: 0 }), VEL_ENTE);
  assert.equal(velEnte({ ...c, jugador: IZQ }), VEL_ENTE_FINAL);
  assert.ok(velEnte({ ...c, jugador: IZQ / 2 }) > VEL_ENTE && velEnte({ ...c, jugador: IZQ / 2 }) < VEL_ENTE_FINAL);
  assert.equal(VEL_ENTE, 3.6);
  assert.equal(VEL_ENTE_FINAL, 4.4);
});

test('extremadamente difícil, con dos pulgares: por la izquierda, a 9,6 toques/s te atrapa y a 10,3 escapas', () => {
  assert.equal(simular(9.6, IZQ).estado, 'atrapado');
  assert.equal(simular(10.3, IZQ).estado, 'escapado');
  assert.equal(simular(7, IZQ).estado, 'atrapado', 'con una mano no se puede');
});

test('por la derecha, más larga, a 9,7 toques/s te atrapa y a 10,4 escapas', () => {
  assert.equal(simular(9.7, DER).estado, 'atrapado');
  assert.equal(simular(10.4, DER).estado, 'escapado');
});

test('si no vas casi al máximo, te pilla al final del recorrido', () => {
  const c = simular(9.6, IZQ);
  assert.equal(c.estado, 'atrapado');
  assert.ok(c.jugador > IZQ * 0.6, `te pilla a los ${c.jugador.toFixed(1)} m de ${IZQ}`);
});

test('un salto de tiempo enorme (pestaña en segundo plano) avanza como mucho DT_MAX_S', () => {
  const c0 = update(soltar(createCarrera(IZQ), -6), 5);
  const c1 = update(c0, 30);
  assert.ok(c1.t - c0.t <= DT_MAX_S + 1e-9);
  assert.equal(c1.estado, 'corriendo');
});

test('fuera de «corriendo» nada cambia', () => {
  let c = createCarrera(IZQ);
  for (let i = 0; i < 400; i++) c = tap(c);
  assert.equal(c.estado, 'escapado');
  assert.equal(tap(c), c);
  assert.equal(update(c, 0.05), c);
});
