import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CAMARA, ENTE, ACCIONES, DURACION, ZOOM, MANO } from '../js/juego/escenas.js';
import { valorEn } from '../js/juego/linea.js';

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

test('como en la referencia: primero los ojos (y «ahí estás»), luego la mano, luego la puerta estalla', () => {
  for (const c of CAMINOS) {
    assert.ok(cuando(c, 'ojos') < cuando(c, 'dialogo'));
    assert.ok(cuando(c, 'callar') <= MANO.entraDesde, `${c}: la mano entra cuando ya ha hablado`);
    assert.ok(MANO.entraDesde === cuando(c, 'mano') && MANO.entraHasta < cuando(c, 'explota'));
  }
});

test('la cámara se acerca despacio a la puerta (zoom) y vuelve a abrirse al estallar', () => {
  const fov = (t) => valorEn(ZOOM, t);
  assert.ok(fov(cuando('final2', 'explota') - 0.1) < fov(8.4) - 15, 'zoom hacia la puerta');
  assert.ok(fov(cuando('final2', 'explota')) > fov(cuando('final2', 'explota') - 0.1), 'se abre al estallar');
});

test('final 2: tras estallar, el grito llega al final', () => {
  assert.ok(cuando('final2', 'grito') > cuando('final2', 'explota'));
});

test('pasillo: la puerta izquierda se abre del todo y la escena acaba en el cruce, lista para elegir', () => {
  assert.ok(cuando('pasillo', 'abrePuerta') > cuando('pasillo', 'explota'));
  const ultima = CAMARA.pasillo.at(-1);
  assert.ok(ultima.pos[0] < -2.5, 'la cámara termina al otro lado de la puerta');
});
