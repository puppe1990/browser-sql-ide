import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildConnectionNameMap,
  fetchConnections,
  parseConnectionsResponse,
  resolveSelectedConnectionId,
} from '../src/lib/client-connections.ts';

test('parseConnectionsResponse keeps only valid connection objects', () => {
  const parsed = parseConnectionsResponse({
    connections: [
      { id: 1, name: 'Main', type: 'postgresql' },
      { id: '2', name: 'Replica' },
      { id: 0, name: 'Invalid id' },
      { id: 3, name: 123 },
      null,
    ],
  });

  assert.deepEqual(parsed, [
    { id: 1, name: 'Main', type: 'postgresql' },
    { id: 2, name: 'Replica' },
  ]);
});

test('parseConnectionsResponse returns empty for malformed payload', () => {
  assert.deepEqual(parseConnectionsResponse(null), []);
  assert.deepEqual(parseConnectionsResponse({}), []);
  assert.deepEqual(parseConnectionsResponse({ connections: 'invalid' }), []);
});

test('buildConnectionNameMap creates id to name lookup', () => {
  const map = buildConnectionNameMap([
    { id: 1, name: 'Main' },
    { id: 2, name: 'Analytics' },
  ]);
  assert.deepEqual(map, {
    1: 'Main',
    2: 'Analytics',
  });
});

test('resolveSelectedConnectionId preserves current selection when present', () => {
  const connections = [
    { id: 1, name: 'Main' },
    { id: 2, name: 'Analytics' },
  ];

  assert.equal(resolveSelectedConnectionId(2, connections), 2);
  assert.equal(resolveSelectedConnectionId(3, connections), 1);
  assert.equal(resolveSelectedConnectionId(undefined, connections), 1);
  assert.equal(resolveSelectedConnectionId(undefined, []), undefined);
});

test('fetchConnections parses response payload', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => ({
    json: async () => ({
      connections: [
        { id: 1, name: 'Main' },
        { id: '2', name: 'Replica' },
        { id: 'bad', name: 'Invalid' },
      ],
    }),
  })) as typeof fetch;

  try {
    const connections = await fetchConnections();
    assert.deepEqual(connections, [
      { id: 1, name: 'Main' },
      { id: 2, name: 'Replica' },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
