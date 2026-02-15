import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePaginationLimit, parsePaginationOffset } from '../src/lib/pagination-params.ts';

test('parsePaginationOffset accepts non-negative integers', () => {
  assert.equal(parsePaginationOffset(0).value, 0);
  assert.equal(parsePaginationOffset(25).value, 25);
});

test('parsePaginationOffset defaults missing value to zero', () => {
  assert.equal(parsePaginationOffset(undefined).value, 0);
  assert.equal(parsePaginationOffset(null).value, 0);
  assert.equal(parsePaginationOffset('').value, 0);
  assert.equal(parsePaginationOffset('   ').value, 0);
});

test('parsePaginationOffset accepts integer strings', () => {
  assert.equal(parsePaginationOffset('0').value, 0);
  assert.equal(parsePaginationOffset('42').value, 42);
});

test('parsePaginationOffset rejects negative and non-integer values', () => {
  assert.equal(parsePaginationOffset(-1).error, 'Offset must be a non-negative integer');
  assert.equal(parsePaginationOffset('3.14').error, 'Offset must be a non-negative integer');
  assert.equal(parsePaginationOffset('abc').error, 'Offset must be a non-negative integer');
  assert.equal(parsePaginationOffset(Number.MAX_SAFE_INTEGER + 1).error, 'Offset must be a non-negative integer');
});

test('parsePaginationLimit returns default for missing value', () => {
  assert.equal(parsePaginationLimit(undefined).value, 100);
  assert.equal(parsePaginationLimit(null).value, 100);
  assert.equal(parsePaginationLimit('').value, 100);
  assert.equal(parsePaginationLimit('   ').value, 100);
});

test('parsePaginationLimit accepts positive integers and integer strings', () => {
  assert.equal(parsePaginationLimit(1).value, 1);
  assert.equal(parsePaginationLimit(100).value, 100);
  assert.equal(parsePaginationLimit('250').value, 250);
});

test('parsePaginationLimit caps large values to max limit', () => {
  assert.equal(parsePaginationLimit(1001).value, 1000);
  assert.equal(parsePaginationLimit('99999').value, 1000);
});

test('parsePaginationLimit rejects zero, negative, and non-integer values', () => {
  assert.equal(parsePaginationLimit(0).error, 'Limit must be a positive integer');
  assert.equal(parsePaginationLimit(-5).error, 'Limit must be a positive integer');
  assert.equal(parsePaginationLimit('2.5').error, 'Limit must be a positive integer');
  assert.equal(parsePaginationLimit('abc').error, 'Limit must be a positive integer');
  assert.equal(parsePaginationLimit(Number.MAX_SAFE_INTEGER + 1).error, 'Limit must be a positive integer');
});
