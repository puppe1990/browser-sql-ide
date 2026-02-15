import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDatabaseInitError } from '../src/lib/db.ts';

test('formatDatabaseInitError explains NODE_MODULE_VERSION mismatch with rebuild hint', () => {
  const message = formatDatabaseInitError(
    new Error('compiled against NODE_MODULE_VERSION 127 but current requires 131')
  );

  assert.match(message, /better-sqlite3 native binding is compiled for a different Node\.js version/i);
  assert.match(message, /npm rebuild better-sqlite3/i);
  assert.match(message, /NODE_MODULE_VERSION 127/i);
});

test('formatDatabaseInitError returns generic message for non-ABI errors', () => {
  const message = formatDatabaseInitError(new Error('Permission denied'));
  assert.equal(message, 'Failed to initialize database: Permission denied');
});
