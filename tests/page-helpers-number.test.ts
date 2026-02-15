import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNumberInRange } from '../src/app/(main)/_utils/page-helpers.ts';

test('parseNumberInRange parses decimal numeric forms and applies range rules', () => {
  assert.equal(parseNumberInRange('42'), 42);
  assert.equal(parseNumberInRange(' 3.5 '), 3.5);
  assert.equal(parseNumberInRange('.25'), 0.25);
  assert.equal(parseNumberInRange('1e2', { minExclusive: 50 }), 100);
  assert.equal(parseNumberInRange('50', { minInclusive: 50, maxInclusive: 50 }), 50);
  assert.equal(parseNumberInRange('50', { minExclusive: 50 }), undefined);
  assert.equal(parseNumberInRange('50', { maxExclusive: 50 }), undefined);
});

test('parseNumberInRange rejects non-decimal and non-finite forms', () => {
  assert.equal(parseNumberInRange(''), undefined);
  assert.equal(parseNumberInRange('   '), undefined);
  assert.equal(parseNumberInRange('0x20'), undefined);
  assert.equal(parseNumberInRange('0b1010'), undefined);
  assert.equal(parseNumberInRange('Infinity'), undefined);
  assert.equal(parseNumberInRange('NaN'), undefined);
  assert.equal(parseNumberInRange('12abc'), undefined);
});
