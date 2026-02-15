import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePortInputValue } from '../src/lib/port-input.ts';

test('parsePortInputValue parses valid positive integer input', () => {
  assert.equal(parsePortInputValue('5432', 1111), 5432);
  assert.equal(parsePortInputValue(' 443 ', 1111), 443);
});

test('parsePortInputValue keeps fallback on empty or malformed input', () => {
  assert.equal(parsePortInputValue('', 5432), 5432);
  assert.equal(parsePortInputValue('   ', 5432), 5432);
  assert.equal(parsePortInputValue('5432abc', 5432), 5432);
  assert.equal(parsePortInputValue('-1', 5432), 5432);
  assert.equal(parsePortInputValue('0', 5432), 5432);
});
