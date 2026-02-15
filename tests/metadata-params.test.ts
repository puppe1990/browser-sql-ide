import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMetadataCategoryParam, parseRequiredStringParam } from '../src/lib/metadata-params.ts';

test('parseMetadataCategoryParam accepts known categories and trims whitespace', () => {
  assert.equal(parseMetadataCategoryParam('databases').value, 'databases');
  assert.equal(parseMetadataCategoryParam('  schema_objects ').value, 'schema_objects');
});

test('parseMetadataCategoryParam rejects missing and unknown categories', () => {
  assert.equal(parseMetadataCategoryParam(undefined).error, 'Missing or invalid category');
  assert.equal(parseMetadataCategoryParam(null).error, 'Missing or invalid category');
  assert.equal(parseMetadataCategoryParam('').error, 'Missing or invalid category');
  assert.equal(parseMetadataCategoryParam('   ').error, 'Missing or invalid category');
  assert.equal(parseMetadataCategoryParam('tables').error, 'Missing or invalid category');
});

test('parseRequiredStringParam returns trimmed value and rejects blank values', () => {
  assert.equal(parseRequiredStringParam(' public ', 'schema').value, 'public');
  assert.equal(parseRequiredStringParam('', 'schema').error, 'Missing schema parameter');
  assert.equal(parseRequiredStringParam('   ', 'schema').error, 'Missing schema parameter');
  assert.equal(parseRequiredStringParam(undefined, 'schema').error, 'Missing schema parameter');
});
