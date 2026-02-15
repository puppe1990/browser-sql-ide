import test from 'node:test';
import assert from 'node:assert/strict';
import { parseComparableNumber } from '../src/lib/compare-number.ts';

test('parseComparableNumber accepts finite numbers and decimal numeric strings', () => {
  assert.equal(parseComparableNumber(10), 10);
  assert.equal(parseComparableNumber('42'), 42);
  assert.equal(parseComparableNumber(' 3.14 '), 3.14);
  assert.equal(parseComparableNumber('-2.5'), -2.5);
  assert.equal(parseComparableNumber('.75'), 0.75);
  assert.equal(parseComparableNumber('1e3'), 1000);
});

test('parseComparableNumber rejects non-decimal, blank, and non-finite values', () => {
  assert.equal(parseComparableNumber(''), null);
  assert.equal(parseComparableNumber('   '), null);
  assert.equal(parseComparableNumber('0x10'), null);
  assert.equal(parseComparableNumber('Infinity'), null);
  assert.equal(parseComparableNumber('NaN'), null);
  assert.equal(parseComparableNumber(Number.NaN), null);
  assert.equal(parseComparableNumber(Number.POSITIVE_INFINITY), null);
  assert.equal(parseComparableNumber({}), null);
});
