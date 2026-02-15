import test from 'node:test';
import assert from 'node:assert/strict';
import { parseConnectionAndQueryPayload } from '../src/lib/query-request-params.ts';

test('parseConnectionAndQueryPayload accepts numeric connectionId and trims query', () => {
  const parsed = parseConnectionAndQueryPayload({
    connectionId: 7,
    query: '  SELECT 1  ',
  });

  assert.equal(parsed.connectionId, 7);
  assert.equal(parsed.query, 'SELECT 1');
  assert.equal(parsed.error, undefined);
});

test('parseConnectionAndQueryPayload accepts string connectionId', () => {
  const parsed = parseConnectionAndQueryPayload({
    connectionId: '42',
    query: 'SELECT now()',
  });

  assert.equal(parsed.connectionId, 42);
  assert.equal(parsed.query, 'SELECT now()');
});

test('parseConnectionAndQueryPayload rejects missing fields', () => {
  assert.equal(
    parseConnectionAndQueryPayload({ query: 'SELECT 1' }).error,
    'Connection ID and query are required'
  );
  assert.equal(
    parseConnectionAndQueryPayload({ connectionId: 1 }).error,
    'Connection ID and query are required'
  );
});

test('parseConnectionAndQueryPayload rejects invalid connectionId values', () => {
  assert.equal(
    parseConnectionAndQueryPayload({ connectionId: 0, query: 'SELECT 1' }).error,
    'Connection ID must be a positive integer'
  );
  assert.equal(
    parseConnectionAndQueryPayload({ connectionId: 'abc', query: 'SELECT 1' }).error,
    'Connection ID must be a positive integer'
  );
  assert.equal(
    parseConnectionAndQueryPayload({ connectionId: '3.14', query: 'SELECT 1' }).error,
    'Connection ID must be a positive integer'
  );
  assert.equal(
    parseConnectionAndQueryPayload({ connectionId: Number.MAX_SAFE_INTEGER + 1, query: 'SELECT 1' }).error,
    'Connection ID must be a positive integer'
  );
});

test('parseConnectionAndQueryPayload rejects empty or whitespace-only query', () => {
  assert.equal(
    parseConnectionAndQueryPayload({ connectionId: 1, query: '' }).error,
    'Connection ID and query are required'
  );
  assert.equal(
    parseConnectionAndQueryPayload({ connectionId: 1, query: '   ' }).error,
    'Connection ID and query are required'
  );
});

test('parseConnectionAndQueryPayload rejects non-string query values', () => {
  assert.equal(
    parseConnectionAndQueryPayload({ connectionId: 1, query: 123 }).error,
    'Query must be a string'
  );
  assert.equal(
    parseConnectionAndQueryPayload({ connectionId: 1, query: true }).error,
    'Query must be a string'
  );
  assert.equal(
    parseConnectionAndQueryPayload({ connectionId: 1, query: {} }).error,
    'Query must be a string'
  );
});

test('parseConnectionAndQueryPayload rejects non-object payloads', () => {
  assert.equal(parseConnectionAndQueryPayload(null).error, 'Connection ID and query are required');
  assert.equal(parseConnectionAndQueryPayload(123).error, 'Connection ID and query are required');
  assert.equal(parseConnectionAndQueryPayload('invalid').error, 'Connection ID and query are required');
});
