import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOptionalPositiveIntParam, parsePositiveIntRouteParam } from '../src/lib/route-params.ts';

test('parsePositiveIntRouteParam accepts positive integer strings', () => {
  const parsed = parsePositiveIntRouteParam('42', 'Connection ID');

  assert.equal(parsed.value, 42);
  assert.equal(parsed.error, undefined);
});

test('parsePositiveIntRouteParam trims surrounding whitespace', () => {
  const parsed = parsePositiveIntRouteParam('  7  ', 'Connection ID');

  assert.equal(parsed.value, 7);
  assert.equal(parsed.error, undefined);
});

test('parsePositiveIntRouteParam rejects non-digit strings', () => {
  assert.equal(
    parsePositiveIntRouteParam('1abc', 'Connection ID').error,
    'Connection ID must be a positive integer'
  );
  assert.equal(
    parsePositiveIntRouteParam('3.14', 'Connection ID').error,
    'Connection ID must be a positive integer'
  );
  assert.equal(
    parsePositiveIntRouteParam('-1', 'Connection ID').error,
    'Connection ID must be a positive integer'
  );
});

test('parsePositiveIntRouteParam rejects zero and unsafe integers', () => {
  assert.equal(
    parsePositiveIntRouteParam('0', 'Connection ID').error,
    'Connection ID must be a positive integer'
  );
  assert.equal(
    parsePositiveIntRouteParam('9007199254740992', 'Connection ID').error,
    'Connection ID must be a positive integer'
  );
});

test('parsePositiveIntRouteParam rejects non-string values', () => {
  assert.equal(
    parsePositiveIntRouteParam(undefined, 'Connection ID').error,
    'Connection ID must be a positive integer'
  );
  assert.equal(
    parsePositiveIntRouteParam(12, 'Connection ID').error,
    'Connection ID must be a positive integer'
  );
});

test('parsePositiveIntRouteParam uses provided param name in errors', () => {
  const parsed = parsePositiveIntRouteParam('1abc', 'Query ID');
  assert.equal(parsed.error, 'Query ID must be a positive integer');
});

test('parseOptionalPositiveIntParam allows missing or blank values', () => {
  assert.deepEqual(parseOptionalPositiveIntParam(undefined, 'Connection ID'), {});
  assert.deepEqual(parseOptionalPositiveIntParam(null, 'Connection ID'), {});
  assert.deepEqual(parseOptionalPositiveIntParam('', 'Connection ID'), {});
  assert.deepEqual(parseOptionalPositiveIntParam('   ', 'Connection ID'), {});
});

test('parseOptionalPositiveIntParam parses valid values and rejects invalid ones', () => {
  assert.equal(parseOptionalPositiveIntParam('9', 'Connection ID').value, 9);
  assert.equal(
    parseOptionalPositiveIntParam('1abc', 'Connection ID').error,
    'Connection ID must be a positive integer'
  );
});
