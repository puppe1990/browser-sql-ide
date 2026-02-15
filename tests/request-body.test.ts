import test from 'node:test';
import assert from 'node:assert/strict';
import { parseJsonBody, parseJsonObjectBody } from '../src/lib/request-body.ts';

test('parseJsonBody returns parsed value when request.json resolves', async () => {
  const request = {
    json: async () => ({ connectionId: 1, query: 'SELECT 1' }),
  };

  const parsed = await parseJsonBody<{ connectionId: number; query: string }>(request);

  assert.deepEqual(parsed.value, { connectionId: 1, query: 'SELECT 1' });
  assert.equal(parsed.error, undefined);
  assert.equal(parsed.status, undefined);
});

test('parseJsonBody returns 400 error when request.json rejects', async () => {
  const request = {
    json: async () => {
      throw new SyntaxError('Unexpected token');
    },
  };

  const parsed = await parseJsonBody(request);

  assert.equal(parsed.value, undefined);
  assert.equal(parsed.error, 'Invalid JSON body');
  assert.equal(parsed.status, 400);
});

test('parseJsonObjectBody returns parsed object when body is an object', async () => {
  const request = {
    json: async () => ({ connectionId: 1, query: 'SELECT 1' }),
  };

  const parsed = await parseJsonObjectBody<{ connectionId?: number; query?: string }>(request);

  assert.deepEqual(parsed.value, { connectionId: 1, query: 'SELECT 1' });
  assert.equal(parsed.error, undefined);
});

test('parseJsonObjectBody returns 400 when body is an array', async () => {
  const request = {
    json: async () => [1, 2, 3],
  };

  const parsed = await parseJsonObjectBody<Record<string, unknown>>(request);

  assert.equal(parsed.value, undefined);
  assert.equal(parsed.error, 'JSON body must be an object');
  assert.equal(parsed.status, 400);
});

test('parseJsonObjectBody returns 400 when body is a primitive', async () => {
  const request = {
    json: async () => 42,
  };

  const parsed = await parseJsonObjectBody<Record<string, unknown>>(request);

  assert.equal(parsed.value, undefined);
  assert.equal(parsed.error, 'JSON body must be an object');
  assert.equal(parsed.status, 400);
});

test('parseJsonObjectBody returns invalid JSON error when request.json rejects', async () => {
  const request = {
    json: async () => {
      throw new SyntaxError('Unexpected token');
    },
  };

  const parsed = await parseJsonObjectBody<Record<string, unknown>>(request);

  assert.equal(parsed.value, undefined);
  assert.equal(parsed.error, 'Invalid JSON body');
  assert.equal(parsed.status, 400);
});
