import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseConnectionPayloadObject,
  parseMultipartConnectionPayload,
} from '../src/lib/connection-payload-parser.ts';

test('parseConnectionPayloadObject accepts valid JSON payload values', () => {
  const parsed = parseConnectionPayloadObject({
    name: 'Main DB',
    type: 'postgresql',
    host: 'localhost',
    port: 5432,
    database: 'app',
    username: 'user',
    password: 'secret',
    ssl: true,
    color: '#22c55e',
  });

  assert.equal(parsed.error, undefined);
  assert.deepEqual(parsed.value, {
    name: 'Main DB',
    type: 'postgresql',
    host: 'localhost',
    port: 5432,
    database: 'app',
    username: 'user',
    password: 'secret',
    ssl: true,
    color: '#22c55e',
  });
});

test('parseConnectionPayloadObject rejects invalid field types', () => {
  const parsedName = parseConnectionPayloadObject({ name: 123 });
  assert.equal(parsedName.error, 'Name must be a string');

  const parsedPort = parseConnectionPayloadObject({ port: true });
  assert.equal(parsedPort.error, 'Port must be a string or number');

  const parsedSsl = parseConnectionPayloadObject({ ssl: 'true' });
  assert.equal(parsedSsl.error, 'SSL must be a boolean');
});

test('parseConnectionPayloadObject rejects unsupported connection type', () => {
  const parsed = parseConnectionPayloadObject({ type: 'mysql' });

  assert.equal(parsed.error, 'Type must be one of: postgresql, sqlite, turso');
  assert.equal(parsed.status, 400);
});

test('parseConnectionPayloadObject rejects blank connection type values', () => {
  const parsedEmpty = parseConnectionPayloadObject({ type: '' });
  const parsedWhitespace = parseConnectionPayloadObject({ type: '   ' });

  assert.equal(parsedEmpty.error, 'Type must be one of: postgresql, sqlite, turso');
  assert.equal(parsedWhitespace.error, 'Type must be one of: postgresql, sqlite, turso');
  assert.equal(parsedEmpty.status, 400);
  assert.equal(parsedWhitespace.status, 400);
});

test('parseConnectionPayloadObject trims valid connection type values', () => {
  const parsed = parseConnectionPayloadObject({ type: '  sqlite  ' });

  assert.equal(parsed.error, undefined);
  assert.equal(parsed.value?.type, 'sqlite');
});

test('parseMultipartConnectionPayload parses multipart payload and sqlite file', () => {
  const form = new FormData();
  form.set('name', 'SQLite Local');
  form.set('type', 'sqlite');
  form.set('port', '0');
  form.set('ssl', 'true');
  form.set('sqliteFile', new File(['select 1;'], 'local.db', { type: 'application/octet-stream' }));

  const parsed = parseMultipartConnectionPayload(form);

  assert.equal(parsed.error, undefined);
  assert.equal(parsed.value?.name, 'SQLite Local');
  assert.equal(parsed.value?.type, 'sqlite');
  assert.equal(parsed.value?.port, '0');
  assert.equal(parsed.value?.ssl, true);
  assert.equal(parsed.value?.sqliteFile instanceof File, true);
});

test('parseMultipartConnectionPayload accepts explicit false ssl value', () => {
  const form = new FormData();
  form.set('name', 'Main');
  form.set('ssl', 'false');

  const parsed = parseMultipartConnectionPayload(form);

  assert.equal(parsed.error, undefined);
  assert.equal(parsed.value?.ssl, false);
});

test('parseMultipartConnectionPayload rejects non-string multipart fields', () => {
  const form = new FormData();
  form.set('name', new File(['name'], 'name.txt', { type: 'text/plain' }));

  const parsed = parseMultipartConnectionPayload(form);

  assert.equal(parsed.error, 'Name must be a string');
  assert.equal(parsed.status, 400);
});

test('parseMultipartConnectionPayload rejects invalid ssl string values', () => {
  const form = new FormData();
  form.set('ssl', 'yes');

  const parsed = parseMultipartConnectionPayload(form);

  assert.equal(parsed.error, 'SSL must be "true" or "false"');
  assert.equal(parsed.status, 400);
});

test('parseMultipartConnectionPayload rejects unsupported connection type', () => {
  const form = new FormData();
  form.set('type', 'mysql');

  const parsed = parseMultipartConnectionPayload(form);

  assert.equal(parsed.error, 'Type must be one of: postgresql, sqlite, turso');
  assert.equal(parsed.status, 400);
});

test('parseMultipartConnectionPayload rejects blank connection type values', () => {
  const formEmpty = new FormData();
  formEmpty.set('type', '');
  const parsedEmpty = parseMultipartConnectionPayload(formEmpty);

  const formWhitespace = new FormData();
  formWhitespace.set('type', '   ');
  const parsedWhitespace = parseMultipartConnectionPayload(formWhitespace);

  assert.equal(parsedEmpty.error, 'Type must be one of: postgresql, sqlite, turso');
  assert.equal(parsedWhitespace.error, 'Type must be one of: postgresql, sqlite, turso');
  assert.equal(parsedEmpty.status, 400);
  assert.equal(parsedWhitespace.status, 400);
});

test('parseMultipartConnectionPayload trims valid connection type values', () => {
  const form = new FormData();
  form.set('type', '  turso  ');

  const parsed = parseMultipartConnectionPayload(form);

  assert.equal(parsed.error, undefined);
  assert.equal(parsed.value?.type, 'turso');
});
