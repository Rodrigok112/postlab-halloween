import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCORE, distortionFor } from '../js/score.js';

test('la partitura tiene 8 compases de 8 corcheas en un rango razonable', () => {
  assert.equal(SCORE.bpm, 112);
  assert.equal(SCORE.bars.length, 8);
  for (const bar of SCORE.bars) {
    assert.equal(bar.melody.length, 8);
    for (const n of [...bar.melody.filter((x) => x !== null), ...bar.chord, bar.bass]) {
      assert.ok(Number.isInteger(n) && n >= 36 && n <= 84, `nota fuera de rango: ${n}`);
    }
    assert.equal(bar.chord.length, 3);
  }
});

test('nivel 0 suena limpio', () => {
  const d = distortionFor(0);
  assert.equal(d.bpm, 112);
  assert.equal(d.detune, 0);
  assert.equal(d.wobble, 0);
  assert.equal(d.bits, 0);
  assert.equal(d.dropout, 0);
});

test('la distorsión empeora con cada nivel', () => {
  for (let n = 1; n <= 5; n++) {
    const a = distortionFor(n - 1), b = distortionFor(n);
    assert.ok(b.bpm < a.bpm, 'bpm');
    assert.ok(b.lowpass < a.lowpass, 'lowpass');
    assert.ok(b.detune > a.detune, 'detune');
    assert.ok(b.wobble > a.wobble, 'wobble');
    assert.ok(b.dropout >= a.dropout, 'dropout');
  }
  assert.ok(distortionFor(5).bits > 0);
});

test('los niveles fuera de rango se limitan', () => {
  assert.deepEqual(distortionFor(-1), distortionFor(0));
  assert.deepEqual(distortionFor(9), distortionFor(5));
});
