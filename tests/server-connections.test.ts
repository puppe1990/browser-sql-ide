import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hydrateConnectionRow,
  loadConnectionRowById,
  loadDecryptedConnectionById,
  toPublicConnection,
} from '../src/lib/server/connections.ts';
import type { DbConnectionRow } from '../src/types/index.ts';

function buildRow(overrides: Partial<DbConnectionRow> = {}): DbConnectionRow {
  return {
    id: 7,
    name: 'Main DB',
    type: 'postgresql',
    host: 'localhost',
    port: 5432,
    database: 'app',
    username: 'user',
    encrypted_password: 'encrypted-value',
    ssl: 1,
    ...overrides,
  };
}

test('hydrateConnectionRow maps row fields and decrypts password', () => {
  const row = buildRow();

  const connection = hydrateConnectionRow(row, (encryptedPassword) => `plain:${encryptedPassword}`);

  assert.equal(connection.id, 7);
  assert.equal(connection.name, 'Main DB');
  assert.equal(connection.type, 'postgresql');
  assert.equal(connection.host, 'localhost');
  assert.equal(connection.port, 5432);
  assert.equal(connection.database, 'app');
  assert.equal(connection.username, 'user');
  assert.equal(connection.password, 'plain:encrypted-value');
  assert.equal(connection.ssl, true);
});

test('hydrateConnectionRow normalizes ssl number to boolean false', () => {
  const row = buildRow({ ssl: 0 });

  const connection = hydrateConnectionRow(row, () => 'secret');

  assert.equal(connection.ssl, false);
});

test('loadDecryptedConnectionById returns undefined when row is not found', () => {
  let decryptCalled = false;
  const connection = loadDecryptedConnectionById(999, {
    loadRow: () => undefined,
    decryptPassword: () => {
      decryptCalled = true;
      return 'unused';
    },
  });

  assert.equal(connection, undefined);
  assert.equal(decryptCalled, false);
});

test('loadDecryptedConnectionById uses injected loader and decryptor', () => {
  let loadedId: number | undefined;
  let decryptedValue: string | undefined;
  const row = buildRow({ id: 23, encrypted_password: 'cipher' });

  const connection = loadDecryptedConnectionById(23, {
    loadRow: (connectionId) => {
      loadedId = connectionId;
      return row;
    },
    decryptPassword: (encryptedPassword) => {
      decryptedValue = encryptedPassword;
      return 'plain-text';
    },
  });

  assert.equal(loadedId, 23);
  assert.equal(decryptedValue, 'cipher');
  assert.equal(connection?.id, 23);
  assert.equal(connection?.password, 'plain-text');
});

test('loadConnectionRowById uses injected loader and returns row', () => {
  let loadedId: number | undefined;
  const row = buildRow({ id: 55, type: 'sqlite' });

  const loadedRow = loadConnectionRowById(55, {
    loadRow: (connectionId) => {
      loadedId = connectionId;
      return row;
    },
  });

  assert.equal(loadedId, 55);
  assert.deepEqual(loadedRow, row);
});

test('loadConnectionRowById returns undefined when injected loader does not find row', () => {
  const loadedRow = loadConnectionRowById(999, {
    loadRow: () => undefined,
  });

  assert.equal(loadedRow, undefined);
});

test('toPublicConnection omits encrypted password and preserves public fields', () => {
  const row = buildRow({
    color: '#22c55e',
    created_at: '2026-02-15T00:00:00.000Z',
    updated_at: '2026-02-15T01:00:00.000Z',
  });

  const publicConnection = toPublicConnection(row);

  assert.deepEqual(publicConnection, {
    id: 7,
    name: 'Main DB',
    type: 'postgresql',
    host: 'localhost',
    port: 5432,
    database: 'app',
    username: 'user',
    ssl: 1,
    color: '#22c55e',
    created_at: '2026-02-15T00:00:00.000Z',
    updated_at: '2026-02-15T01:00:00.000Z',
  });
});
