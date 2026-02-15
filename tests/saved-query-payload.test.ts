import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseSavedQueryCreatePayload,
  parseSavedQueryUpdatePayload,
} from '../src/lib/saved-query-payload.ts';

test('parseSavedQueryUpdatePayload trims and normalizes valid fields', () => {
  const parsed = parseSavedQueryUpdatePayload({
    name: '  My Query  ',
    query: '  SELECT 1  ',
    description: '  sample  ',
    folder: '  reports  ',
  });

  assert.equal(parsed.error, undefined);
  assert.deepEqual(parsed, {
    name: 'My Query',
    query: 'SELECT 1',
    description: 'sample',
    folder: 'reports',
  });
});

test('parseSavedQueryUpdatePayload normalizes empty description/folder strings to null', () => {
  const parsed = parseSavedQueryUpdatePayload({
    description: '   ',
    folder: '',
  });

  assert.equal(parsed.error, undefined);
  assert.deepEqual(parsed, {
    description: null,
    folder: null,
  });
});

test('parseSavedQueryUpdatePayload rejects invalid name/query values', () => {
  assert.equal(
    parseSavedQueryUpdatePayload({ name: '' }).error,
    'Name must be a non-empty string'
  );
  assert.equal(
    parseSavedQueryUpdatePayload({ name: 123 }).error,
    'Name must be a non-empty string'
  );
  assert.equal(
    parseSavedQueryUpdatePayload({ query: '   ' }).error,
    'Query must be a non-empty string'
  );
  assert.equal(
    parseSavedQueryUpdatePayload({ query: false }).error,
    'Query must be a non-empty string'
  );
});

test('parseSavedQueryUpdatePayload rejects invalid description/folder values', () => {
  assert.equal(
    parseSavedQueryUpdatePayload({ description: 42 }).error,
    'Description must be a string or null'
  );
  assert.equal(
    parseSavedQueryUpdatePayload({ folder: true }).error,
    'Folder must be a string or null'
  );
});

test('parseSavedQueryCreatePayload validates and normalizes valid payload', () => {
  const parsed = parseSavedQueryCreatePayload({
    connectionId: 3,
    name: '  New Query  ',
    query: '  SELECT * FROM users  ',
    description: '  summary  ',
    folder: '  admin  ',
  });

  assert.equal(parsed.error, undefined);
  assert.deepEqual(parsed, {
    connectionId: 3,
    name: 'New Query',
    query: 'SELECT * FROM users',
    description: 'summary',
    folder: 'admin',
  });
});

test('parseSavedQueryCreatePayload requires non-empty name/query', () => {
  assert.equal(
    parseSavedQueryCreatePayload({ query: 'SELECT 1' }).error,
    'Name and query are required'
  );
  assert.equal(
    parseSavedQueryCreatePayload({ name: 'Test', query: '   ' }).error,
    'Name and query are required'
  );
});

test('parseSavedQueryCreatePayload validates connectionId and optional text fields', () => {
  assert.equal(
    parseSavedQueryCreatePayload({
      name: 'Q',
      query: 'SELECT 1',
      connectionId: '1',
    }).error,
    'Connection ID must be a positive integer when provided'
  );

  assert.equal(
    parseSavedQueryCreatePayload({
      name: 'Q',
      query: 'SELECT 1',
      description: 1,
    }).error,
    'Description must be a string or null'
  );

  assert.equal(
    parseSavedQueryCreatePayload({
      name: 'Q',
      query: 'SELECT 1',
      folder: false,
    }).error,
    'Folder must be a string or null'
  );
});
