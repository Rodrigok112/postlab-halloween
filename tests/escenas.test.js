import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CAMARA, ENTE, ACCIONES, DURACION, ZOOM, MANO } from '../js/juego/escenas.js';
import { muestrear, valorEn } from '../js/juego/linea.js';

const CAMINOS = ['final2', 'pasillo'];
const cuando = (camino, que) => ACCIONES[camino].find((a) => a.que === que)?.t;
// Hacia dónde mira la cámara en t: el monitor está en −z; la puerta del ente en +x; la del pasillo en −x.
const mira = (camino, t) => muestrear(CAMARA[camino], t).mira;

test('las claves y acciones van en orden y caben en la duración', () => {
  for (const c of CAMINOS) {
    for (const lista of [CAMARA[c], ENTE[c], ACCIONES[c]]) {
      lista.forEach((k, i) => { if (i) assert.ok(k.t >= lista[i - 1].t, `${c}: ${k.t}`); });
      assert.ok(lista.at(-1).t <= DURACION[c], `${c}: ${lista.at(-1).t} > ${DURACION[c]}`);
    }
  }
});

test('mirando la pantalla se oye romperse la puerta; luego giras y la mano ya está fuera', () => {
  for (const c of CAMINOS) {
    const rompe = cuando(c, 'rompe');
    const apagado = ACCIONES[c].find((a) => a.que === 'pantalla' && a.valor === null).t;
    assert.ok(rompe - apagado >= 2.5, 'silencio largo antes');
    assert.ok(mira(c, rompe)[2] < -1, 'aún mira al monitor');
    const girado = CAMARA[c].find((k) => k.mira[0] > 3).t;
    assert.ok(girado > rompe, 'gira después del golpe');
    assert.ok(MANO.saleDesde > girado, 'al girar, la mano sigue fuera');
  }
});

test('la mano se mete, se abren los ojos y habla; luego estalla la puerta', () => {
  for (const c of CAMINOS) {
    assert.ok(MANO.saleHasta < cuando(c, 'ojos'));
    assert.ok(cuando(c, 'ojos') < cuando(c, 'dialogo'));
    assert.ok(cuando(c, 'callar') <= cuando(c, 'explota'));
  }
});

test('tras estallar no sale nada durante un segundo; luego sale despacio y suena grave, sin gritar', () => {
  for (const c of CAMINOS) {
    const explota = cuando(c, 'explota');
    const sale = cuando(c, 'sale');
    assert.ok(sale - explota >= 1);
    assert.ok(cuando(c, 'encontrado') > sale);
    const llega = ENTE[c].find((k) => k.t > sale && k.pos[0] < 4).t;
    assert.ok(llega - sale >= 2.5, `sale en ${llega - sale} s`);
    const grito = cuando(c, 'grito');
    assert.ok(grito === undefined || grito > llega);
  }
});

test('la cámara se acerca despacio a la puerta (zoom) y vuelve a abrirse al estallar', () => {
  const explota = cuando('final2', 'explota');
  assert.ok(valorEn(ZOOM, explota - 0.1) < valorEn(ZOOM, 8.5) - 15);
  assert.ok(valorEn(ZOOM, explota) > valorEn(ZOOM, explota - 0.1));
});

test('final 2: tras salir, una pausa y se lanza rápido a la cámara: susto y grito', () => {
  const lanza = cuando('final2', 'lanza');
  const quieto = ENTE.final2.filter((k) => k.t < lanza).at(-1).t;
  assert.ok(lanza - quieto >= 0.4, 'pausa antes');
  const encima = ENTE.final2.find((k) => k.t > lanza);
  // Los pies a 2 m bastan: inclinado, su cara queda 1,6 m por delante de ellos, a un palmo de la tuya.
  assert.ok(encima.t - lanza <= 0.5 && encima.pos[0] <= 2.05, 'rápido y hasta tu cara');
  assert.ok(cuando('final2', 'grito') >= lanza);
});

test('pasillo: corres, cruzas, cierras la puerta, golpes, y acabas en el cruce listo para elegir', () => {
  const cierra = cuando('pasillo', 'cierra');
  assert.ok(muestrear(CAMARA.pasillo, cierra).pos[0] < -3.6, 'ya al otro lado de la puerta');
  assert.ok(mira('pasillo', cierra)[0] > -4, 'mirando hacia la habitación al cerrar');
  assert.ok(cuando('pasillo', 'golpes') > cierra);
  assert.ok(ACCIONES.pasillo.some((a) => a.que === 'pasoEnte' && a.t < cierra), 'se le oye acercarse');
  assert.ok(CAMARA.pasillo.at(-1).pos[0] < -4, 'termina en el cruce');
});
