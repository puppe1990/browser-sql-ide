import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStrictPositiveInt } from '../src/lib/strict-positive-int.ts';

test('parseStrictPositiveInt parses valid positive integer strings', () => {
  assert.equal(parseStrictPositiveInt('1'), 1);
  assert.equal(parseStrictPositiveInt(' 42 '), 42);
  assert.equal(parseStrictPositiveInt('0007'), 7);
});

test('parseStrictPositiveInt accepts safe positive integer numbers', () => {
  assert.equal(parseStrictPositiveInt(9), 9);
});

test('parseStrictPositiveInt rejects non-integer or malformed values', () => {
  assert.equal(parseStrictPositiveInt('1abc'), undefined);
  assert.equal(parseStrictPositiveInt('3.14'), undefined);
  assert.equal(parseStrictPositiveInt('1e3'), undefined);
  assert.equal(parseStrictPositiveInt('-1'), undefined);
  assert.equal(parseStrictPositiveInt(''), undefined);
  assert.equal(parseStrictPositiveInt('   '), undefined);
});

test('parseStrictPositiveInt rejects unsafe, zero, and non-string/number values', () => {
  assert.equal(parseStrictPositiveInt('0'), undefined);
  assert.equal(parseStrictPositiveInt(0), undefined);
  assert.equal(parseStrictPositiveInt(Number.MAX_SAFE_INTEGER + 1), undefined);
  assert.equal(parseStrictPositiveInt('9007199254740992'), undefined);
  assert.equal(parseStrictPositiveInt(undefined), undefined);
  assert.equal(parseStrictPositiveInt(null), undefined);
  assert.equal(parseStrictPositiveInt({}), undefined);
});
