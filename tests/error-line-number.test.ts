import test from 'node:test';
import assert from 'node:assert/strict';
import { parseErrorLineNumber } from '../src/lib/error-line-number.ts';

test('parseErrorLineNumber returns parsed positive line numbers', () => {
  assert.equal(parseErrorLineNumber('syntax error at line 12'), 12);
  assert.equal(parseErrorLineNumber('error near position 7'), 7);
  assert.equal(parseErrorLineNumber('failed at line 3'), 3);
});

test('parseErrorLineNumber rejects missing, zero, negative-like, and unsafe values', () => {
  assert.equal(parseErrorLineNumber('syntax error'), null);
  assert.equal(parseErrorLineNumber('line 0'), null);
  assert.equal(parseErrorLineNumber('line 999999999999999999999'), null);
});
