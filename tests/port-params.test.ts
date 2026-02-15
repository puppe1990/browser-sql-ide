import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOptionalPositivePort } from '../src/lib/port-params.ts';

test('parseOptionalPositivePort allows missing and blank values', () => {
  assert.deepEqual(parseOptionalPositivePort(undefined), {});
  assert.deepEqual(parseOptionalPositivePort(null), {});
  assert.deepEqual(parseOptionalPositivePort(''), {});
  assert.deepEqual(parseOptionalPositivePort('   '), {});
});

test('parseOptionalPositivePort accepts positive integer strings and numbers', () => {
  assert.equal(parseOptionalPositivePort('5432').value, 5432);
  assert.equal(parseOptionalPositivePort('  3306  ').value, 3306);
  assert.equal(parseOptionalPositivePort(27017).value, 27017);
});

test('parseOptionalPositivePort rejects invalid values', () => {
  assert.equal(parseOptionalPositivePort('5432abc').error, 'Port must be a positive integer');
  assert.equal(parseOptionalPositivePort('3.14').error, 'Port must be a positive integer');
  assert.equal(parseOptionalPositivePort('1e3').error, 'Port must be a positive integer');
  assert.equal(parseOptionalPositivePort('0x10').error, 'Port must be a positive integer');
  assert.equal(parseOptionalPositivePort(0).error, 'Port must be a positive integer');
  assert.equal(parseOptionalPositivePort(-1).error, 'Port must be a positive integer');
  assert.equal(parseOptionalPositivePort(3.14).error, 'Port must be a positive integer');
  assert.equal(parseOptionalPositivePort(true).error, 'Port must be a positive integer');
});
