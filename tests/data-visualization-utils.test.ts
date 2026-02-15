import test from 'node:test';
import assert from 'node:assert/strict';
import {
  coerceEditedCellValue,
  parseEditedRowIndexKey,
} from '../src/components/features/DataVisualization/utils.ts';

test('coerceEditedCellValue keeps strict decimal behavior for numeric originals', () => {
  assert.equal(coerceEditedCellValue('42', 1), 42);
  assert.equal(coerceEditedCellValue(' 3.5 ', 1), 3.5);
  assert.equal(coerceEditedCellValue('1e2', 1), 100);

  assert.equal(coerceEditedCellValue('0x10', 1), '0x10');
  assert.equal(coerceEditedCellValue('Infinity', 1), 'Infinity');
  assert.equal(coerceEditedCellValue('12abc', 1), '12abc');
});

test('coerceEditedCellValue preserves boolean/object/string semantics', () => {
  assert.equal(coerceEditedCellValue('true', false), true);
  assert.equal(coerceEditedCellValue('FALSE', true), false);
  assert.equal(coerceEditedCellValue('maybe', true), 'maybe');

  assert.deepEqual(coerceEditedCellValue('{"a":1}', { a: 0 }), { a: 1 });
  assert.equal(coerceEditedCellValue('{invalid}', { a: 0 }), '{invalid}');

  assert.equal(coerceEditedCellValue(null, 'x'), null);
  assert.equal(coerceEditedCellValue('value', undefined), 'value');
  assert.equal(coerceEditedCellValue(123, 'x'), 123);
});

test('parseEditedRowIndexKey accepts non-negative decimal integer strings', () => {
  assert.equal(parseEditedRowIndexKey('0'), 0);
  assert.equal(parseEditedRowIndexKey(' 12 '), 12);
  assert.equal(parseEditedRowIndexKey('001'), 1);
});

test('parseEditedRowIndexKey rejects malformed or unsafe values', () => {
  assert.equal(parseEditedRowIndexKey(''), null);
  assert.equal(parseEditedRowIndexKey('  '), null);
  assert.equal(parseEditedRowIndexKey('1.5'), null);
  assert.equal(parseEditedRowIndexKey('-1'), null);
  assert.equal(parseEditedRowIndexKey('0x10'), null);
  assert.equal(parseEditedRowIndexKey('1abc'), null);
  assert.equal(parseEditedRowIndexKey('9007199254740992'), null);
});
