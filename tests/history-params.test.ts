import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_HISTORY_LIMIT, MAX_HISTORY_LIMIT, parseHistoryLimitParam } from '../src/lib/history-params.ts';

test('parseHistoryLimitParam defaults when value is missing or blank', () => {
  assert.equal(parseHistoryLimitParam(undefined).value, DEFAULT_HISTORY_LIMIT);
  assert.equal(parseHistoryLimitParam(null).value, DEFAULT_HISTORY_LIMIT);
  assert.equal(parseHistoryLimitParam('').value, DEFAULT_HISTORY_LIMIT);
  assert.equal(parseHistoryLimitParam('   ').value, DEFAULT_HISTORY_LIMIT);
});

test('parseHistoryLimitParam accepts positive integer strings', () => {
  assert.equal(parseHistoryLimitParam('25').value, 25);
  assert.equal(parseHistoryLimitParam(' 7 ').value, 7);
});

test('parseHistoryLimitParam caps values to max limit', () => {
  assert.equal(parseHistoryLimitParam(String(MAX_HISTORY_LIMIT + 1)).value, MAX_HISTORY_LIMIT);
  assert.equal(parseHistoryLimitParam('99999').value, MAX_HISTORY_LIMIT);
});

test('parseHistoryLimitParam rejects invalid values', () => {
  assert.equal(parseHistoryLimitParam('0').error, 'Limit must be a positive integer');
  assert.equal(parseHistoryLimitParam('-1').error, 'Limit must be a positive integer');
  assert.equal(parseHistoryLimitParam('3.14').error, 'Limit must be a positive integer');
  assert.equal(parseHistoryLimitParam('12abc').error, 'Limit must be a positive integer');
  assert.equal(parseHistoryLimitParam(10).error, 'Limit must be a positive integer');
});
