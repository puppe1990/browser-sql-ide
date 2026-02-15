import test from 'node:test';
import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import { getTotalCount, parseQueryTotalCount } from '../src/lib/database-connectors/pagination.ts';
import type { DatabaseConnection } from '../src/lib/database-connectors.ts';

function createConnectionFixture(): DatabaseConnection {
  return {
    id: 1,
    name: 'fixture',
    type: 'postgresql',
    host: 'localhost',
    port: 5432,
    database: 'db',
    username: 'user',
    password: 'pw',
  };
}

test('parseQueryTotalCount accepts non-negative safe integers from supported scalar types', () => {
  assert.equal(parseQueryTotalCount(0), 0);
  assert.equal(parseQueryTotalCount(12), 12);
  assert.equal(parseQueryTotalCount(' 34 '), 34);
  assert.equal(parseQueryTotalCount(56n), 56);
});

test('parseQueryTotalCount rejects malformed, fractional, negative, and unsafe values', () => {
  assert.equal(parseQueryTotalCount(''), null);
  assert.equal(parseQueryTotalCount('1e3'), null);
  assert.equal(parseQueryTotalCount('0x10'), null);
  assert.equal(parseQueryTotalCount('12abc'), null);
  assert.equal(parseQueryTotalCount(-1), null);
  assert.equal(parseQueryTotalCount(1.5), null);
  assert.equal(parseQueryTotalCount(Number.POSITIVE_INFINITY), null);
  assert.equal(parseQueryTotalCount(BigInt(Number.MAX_SAFE_INTEGER) + 1n), null);
});

test('getTotalCount returns parsed total for row-returning queries', async () => {
  let released = false;
  const mockPool = {
    connect: async () => ({
      query: async () => ({ rows: [{ total: '42' }] }),
      release: () => {
        released = true;
      },
    }),
  } as unknown as Pool;
  const connect = async () => mockPool;

  const totalCount = await getTotalCount(connect, createConnectionFixture(), 'SELECT * FROM users');

  assert.equal(totalCount, 42);
  assert.equal(released, true);
});

test('getTotalCount returns -1 when count result is not a strict non-negative integer', async () => {
  const mockPool = {
    connect: async () => ({
      query: async () => ({ rows: [{ total: '1e3' }] }),
      release: () => undefined,
    }),
  } as unknown as Pool;
  const connect = async () => mockPool;

  const totalCount = await getTotalCount(connect, createConnectionFixture(), 'SELECT * FROM users');

  assert.equal(totalCount, -1);
});
