import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CAMARA, ENTE, ACCIONES, DURACION } from '../js/juego/escenas.js';

const CAMINOS = ['final2', 'pasillo'];
const cuando = (camino, que) => ACCIONES[camino].find((a) => a.que === que)?.t;

test('las claves y acciones van en orden y caben en la duración', () => {
  for (const c of CAMINOS) {
    for (const lista of [CAMARA[c], ENTE[c], ACCIONES[c]]) {
      lista.forEach((k, i) => { if (i) assert.ok(k.t >= lista[i - 1].t, `${c}: ${k.t}`); });
      assert.ok(lista.at(-1).t <= DURACION[c], `${c}: ${lista.at(-1).t} > ${DURACION[c]}`);
    }
  }
});

test('silencio largo tras apagarse el monitor, un golpe, y luego boquete, ojos y «ahí estás»', () => {
  for (const c of CAMINOS) {
    const apagado = ACCIONES[c].find((a) => a.que === 'pantalla' && a.valor === null).t;
    const boquete = cuando(c, 'boquete');
    assert.ok(boquete - apagado >= 3, `${c}: silencio de ${boquete - apagado} s`);
    assert.equal(ACCIONES[c].filter((a) => a.t > apagado && a.t < boquete).length, 0, 'nada durante el silencio');
    assert.ok(boquete < cuando(c, 'ojos') && cuando(c, 'ojos') < cuando(c, 'dialogo'));
  }
});

test('final 2: la puerta revienta tras el diálogo y el grito llega al final', () => {
  assert.ok(cuando('final2', 'revienta') > cuando('final2', 'dialogo'));
  assert.ok(cuando('final2', 'grito') > cuando('final2', 'revienta'));
});

test('pasillo: la puerta izquierda se abre del todo y la escena acaba en el cruce, lista para elegir', () => {
  assert.ok(cuando('pasillo', 'abrePuerta') > cuando('pasillo', 'dialogo'));
  assert.equal(cuando('pasillo', 'revienta'), undefined);
  const ultima = CAMARA.pasillo.at(-1);
  assert.ok(ultima.pos[0] < -2.5, 'la cámara termina al otro lado de la puerta');
});
