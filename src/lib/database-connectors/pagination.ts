import type { Pool, PoolClient } from 'pg';
import type { DatabaseConnection } from '@/lib/database-connectors';

function isIgnorableLeadingChar(char: string | undefined): boolean {
  if (!char) return false;
  const code = char.charCodeAt(0);
  return /\s/.test(char) || code === 0xfeff || code <= 0x1f || code === 0x7f;
}

function isIdentifierChar(char: string | undefined): boolean {
  if (!char) return false;
  return /[\p{L}\p{N}\p{M}_$]/u.test(char);
}

function isKeywordChar(char: string | undefined): boolean {
  if (!char) return false;
  return /[A-Za-z_]/.test(char);
}

function skipBlockComment(input: string, start: number): number {
  if (input[start] !== '/' || input[start + 1] !== '*') return start;

  let index = start + 2;
  let depth = 1;

  while (index < input.length - 1) {
    if (input[index] === '/' && input[index + 1] === '*') {
      depth += 1;
      index += 2;
      continue;
    }

    if (input[index] === '*' && input[index + 1] === '/') {
      depth -= 1;
      index += 2;
      if (depth === 0) return index;
      continue;
    }

    index += 1;
  }

  return input.length;
}

function skipLineComment(input: string, start: number): number {
  const isDashComment = input[start] === '-' && input[start + 1] === '-';
  const isHashComment = input[start] === '#';
  if (!isDashComment && !isHashComment) return start;

  let index = start + (isDashComment ? 2 : 1);
  while (index < input.length) {
    const char = input[index];
    if (char === '\n' || char === '\r' || char === '\u2028' || char === '\u2029') {
      index += 1;
      if (char === '\r' && input[index] === '\n') {
        index += 1;
      }
      return index;
    }
    index += 1;
  }

  return input.length;
}

function skipBracketIdentifier(input: string, start: number): number {
  if (input[start] !== '[') return start;

  let index = start + 1;
  while (index < input.length) {
    if (input[index] === ']' && input[index + 1] === ']') {
      index += 2;
      continue;
    }

    if (input[index] === ']') {
      return index + 1;
    }

    index += 1;
  }

  return input.length;
}

function skipQuotedSegment(input: string, start: number): number {
  const quote = input[start];
  if (quote !== '\'' && quote !== '"' && quote !== '`') return start;

  let index = start + 1;
  while (index < input.length) {
    const char = input[index];

    if ((quote === '\'' || quote === '"' || quote === '`') && char === quote && input[index + 1] === quote) {
      index += 2;
      continue;
    }

    if (char === quote) {
      return index + 1;
    }

    if (char === '\\') {
      index += 2;
      continue;
    }

    index += 1;
  }

  return input.length;
}

function skipNonCodeSegment(input: string, start: number): number {
  const char = input[start];
  const next = input[start + 1];

  if (char === '-' && next === '-') return skipLineComment(input, start);
  if (char === '#') return skipLineComment(input, start);
  if (char === '/' && next === '*') return skipBlockComment(input, start);
  if (char === '[') return skipBracketIdentifier(input, start);
  if (char === '\'' || char === '"' || char === '`') return skipQuotedSegment(input, start);

  if (char === '$') {
    const tag = readDollarQuoteTag(input, start);
    if (tag) {
      const closeIndex = input.indexOf(tag, start + tag.length);
      if (closeIndex === -1) return start + 1;
      return closeIndex + tag.length;
    }
  }

  return start;
}

function skipInterTokenTrivia(input: string, start: number): number {
  let index = start;
  while (index < input.length) {
    while (index < input.length && isIgnorableLeadingChar(input[index])) {
      index += 1;
    }

    if (index >= input.length) return index;

    if (input[index] === '-' && input[index + 1] === '-') {
      index = skipLineComment(input, index);
      continue;
    }

    if (input[index] === '#') {
      index = skipLineComment(input, index);
      continue;
    }

    if (input[index] === '/' && input[index + 1] === '*') {
      index = skipBlockComment(input, index);
      continue;
    }

    return index;
  }

  return index;
}

function stripLeadingComments(query: string): string {
  let normalized = query;
  while (normalized.length > 0) {
    while (normalized.length > 0 && isIgnorableLeadingChar(normalized[0])) {
      normalized = normalized.slice(1);
    }

    if (normalized.startsWith('--') || normalized.startsWith('#')) {
      const lineEnd = skipLineComment(normalized, 0);
      if (lineEnd >= normalized.length) return '';
      normalized = normalized.slice(lineEnd);
      continue;
    }

    if (normalized.startsWith('/*')) {
      const blockEnd = skipBlockComment(normalized, 0);
      if (blockEnd >= normalized.length) return '';
      normalized = normalized.slice(blockEnd);
      continue;
    }

    // Skip empty statements before the first meaningful query.
    if (normalized[0] === ';') {
      normalized = normalized.slice(1);
      continue;
    }

    break;
  }

  return normalized;
}

function readWord(input: string, start: number): { word: string; next: number } {
  let index = start;
  while (index < input.length && isIgnorableLeadingChar(input[index])) index += 1;
  const wordStart = index;
  while (index < input.length && isIdentifierChar(input[index])) index += 1;
  return {
    word: input.slice(wordStart, index).toUpperCase(),
    next: index,
  };
}

function skipBalancedParens(input: string, start: number): number {
  if (input[start] !== '(') return start;
  let depth = 0;
  let index = start;

  while (index < input.length) {
    const char = input[index];
    const nextIndex = skipNonCodeSegment(input, index);
    if (nextIndex !== index) {
      index = nextIndex;
      continue;
    }

    if (char === '(') depth += 1;
    if (char === ')') {
      depth -= 1;
      if (depth === 0) return index + 1;
    }

    index += 1;
  }

  return input.length;
}

function findPrimaryWithKeyword(query: string): string {
  const normalized = stripLeadingComments(query);
  const first = readWord(normalized, 0);
  if (first.word !== 'WITH') return first.word;

  let index = first.next;
  const possibleRecursive = readWord(normalized, index);
  if (possibleRecursive.word === 'RECURSIVE') {
    index = possibleRecursive.next;
  }

  while (index < normalized.length) {
    const asPos = findNextTopLevelKeyword(normalized, index, 'AS');
    if (asPos === -1) return '';
    index = asPos + 2;

    index = skipInterTokenTrivia(normalized, index);
    if (normalized[index] !== '(') return '';

    index = skipBalancedParens(normalized, index);
    index = skipInterTokenTrivia(normalized, index);

    if (normalized[index] === ',') {
      index += 1;
      continue;
    }

    const keyword = readWord(normalized, index);
    return keyword.word;
  }

  return '';
}

function isWordBoundary(char: string | undefined): boolean {
  return !isIdentifierChar(char);
}

function readDollarQuoteTag(input: string, start: number): string | undefined {
  if (input[start] !== '$') return undefined;

  let index = start + 1;
  while (index < input.length && /[A-Za-z0-9_]/.test(input[index])) {
    index += 1;
  }

  if (input[index] !== '$') return undefined;
  return input.slice(start, index + 1);
}

function findNextTopLevelKeyword(query: string, start: number, keyword: string): number {
  if (start >= query.length) return -1;
  const positions = getTopLevelKeywordPositions(query.slice(start), new Set([keyword]));
  if (positions.length === 0) return -1;
  return start + positions[0].index;
}

function getTopLevelKeywordPositions(query: string, keywords: Set<string>): Array<{ word: string; index: number }> {
  const positions: Array<{ word: string; index: number }> = [];
  let depth = 0;
  let index = 0;

  while (index < query.length) {
    const char = query[index];
    const nextIndex = skipNonCodeSegment(query, index);
    if (nextIndex !== index) {
      index = nextIndex;
      continue;
    }

    if (char === '(') {
      depth += 1;
      index += 1;
      continue;
    }

    if (char === ')') {
      depth = Math.max(0, depth - 1);
      index += 1;
      continue;
    }

    if (depth === 0 && isKeywordChar(char)) {
      const start = index;
      while (index < query.length && isIdentifierChar(query[index])) index += 1;
      const word = query.slice(start, index).toUpperCase();
      const before = query[start - 1];
      const after = query[index];

      if (keywords.has(word) && isWordBoundary(before) && isWordBoundary(after)) {
        positions.push({ word, index: start });
      }

      continue;
    }

    index += 1;
  }

  return positions;
}

function readPaginationKeyword(input: string, start: number): { keyword: 'LIMIT' | 'OFFSET'; next: number } | undefined {
  const upper = input.slice(start).toUpperCase();
  if (upper.startsWith('LIMIT')) {
    const end = start + 5;
    if (isWordBoundary(input[end])) {
      return { keyword: 'LIMIT', next: end };
    }
  }

  if (upper.startsWith('OFFSET')) {
    const end = start + 6;
    if (isWordBoundary(input[end])) {
      return { keyword: 'OFFSET', next: end };
    }
  }

  return undefined;
}

function readKeyword(input: string, start: number, keyword: string): number {
  const end = start + keyword.length;
  if (input.slice(start, end).toUpperCase() !== keyword) return -1;
  if (!isWordBoundary(input[start - 1])) return -1;
  if (!isWordBoundary(input[end])) return -1;
  return end;
}

function readDigits(input: string, start: number): number {
  let index = start;
  while (index < input.length && /[0-9]/.test(input[index])) index += 1;
  return index > start ? index : -1;
}

function readParameterizedValue(input: string, start: number): number {
  if (input[start] === '?') return start + 1;

  if (input[start] === '$') {
    const digitsEnd = readDigits(input, start + 1);
    if (digitsEnd !== -1) return digitsEnd;
  }

  return -1;
}

function readBarePaginationValue(input: string, start: number, keyword: 'LIMIT' | 'OFFSET' | 'FETCH'): number {
  const digitsEnd = readDigits(input, start);
  if (digitsEnd !== -1) return digitsEnd;

  const parameterizedEnd = readParameterizedValue(input, start);
  if (parameterizedEnd !== -1) return parameterizedEnd;

  if (keyword === 'LIMIT') {
    const allEnd = readKeyword(input, start, 'ALL');
    if (allEnd !== -1) return allEnd;

    const nullEnd = readKeyword(input, start, 'NULL');
    if (nullEnd !== -1) return nullEnd;
  }

  return -1;
}

function readParenthesizedPaginationValue(input: string, start: number, keyword: 'LIMIT' | 'OFFSET' | 'FETCH'): number {
  if (input[start] !== '(') return -1;

  let index = skipInterTokenTrivia(input, start + 1);
  index = readBarePaginationValue(input, index, keyword);
  if (index === -1) return -1;

  index = skipInterTokenTrivia(input, index);
  if (input[index] !== ')') return -1;

  return index + 1;
}

function readPaginationValue(input: string, start: number, keyword: 'LIMIT' | 'OFFSET' | 'FETCH'): number {
  const bareEnd = readBarePaginationValue(input, start, keyword);
  if (bareEnd !== -1) return bareEnd;

  return readParenthesizedPaginationValue(input, start, keyword);
}

type PaginationClauseType = 'LIMIT' | 'OFFSET' | 'FETCH';

function readLimitClause(input: string, start: number): { type: PaginationClauseType; next: number } | undefined {
  const keyword = readPaginationKeyword(input, start);
  if (!keyword || keyword.keyword !== 'LIMIT') return undefined;

  let index = skipInterTokenTrivia(input, keyword.next);
  index = readPaginationValue(input, index, 'LIMIT');
  if (index === -1) return undefined;

  // MySQL/SQLite form: LIMIT <offset>, <count>
  const commaIndex = skipInterTokenTrivia(input, index);
  if (input[commaIndex] === ',') {
    index = skipInterTokenTrivia(input, commaIndex + 1);
    index = readPaginationValue(input, index, 'LIMIT');
    if (index === -1) return undefined;
  }

  return { type: 'LIMIT', next: index };
}

function readOffsetClause(input: string, start: number): { type: PaginationClauseType; next: number } | undefined {
  const keyword = readPaginationKeyword(input, start);
  if (!keyword || keyword.keyword !== 'OFFSET') return undefined;

  let index = skipInterTokenTrivia(input, keyword.next);
  index = readPaginationValue(input, index, 'OFFSET');
  if (index === -1) return undefined;

  index = skipInterTokenTrivia(input, index);
  const rowsEnd = readKeyword(input, index, 'ROWS');
  const rowEnd = readKeyword(input, index, 'ROW');
  if (rowsEnd !== -1) {
    index = rowsEnd;
  } else if (rowEnd !== -1) {
    index = rowEnd;
  }

  return { type: 'OFFSET', next: index };
}

function readFetchClause(input: string, start: number): { type: PaginationClauseType; next: number } | undefined {
  let index = readKeyword(input, start, 'FETCH');
  if (index === -1) return undefined;

  index = skipInterTokenTrivia(input, index);
  const firstEnd = readKeyword(input, index, 'FIRST');
  const nextEnd = readKeyword(input, index, 'NEXT');
  if (firstEnd === -1 && nextEnd === -1) return undefined;
  index = firstEnd !== -1 ? firstEnd : nextEnd;

  index = skipInterTokenTrivia(input, index);
  const valueEnd = readPaginationValue(input, index, 'FETCH');
  if (valueEnd !== -1) {
    index = skipInterTokenTrivia(input, valueEnd);
  }

  const percentEnd = readKeyword(input, index, 'PERCENT');
  if (percentEnd !== -1) {
    index = skipInterTokenTrivia(input, percentEnd);
  }

  const rowsEnd = readKeyword(input, index, 'ROWS');
  const rowEnd = readKeyword(input, index, 'ROW');
  if (rowsEnd === -1 && rowEnd === -1) return undefined;
  index = rowsEnd !== -1 ? rowsEnd : rowEnd;

  index = skipInterTokenTrivia(input, index);
  const onlyEnd = readKeyword(input, index, 'ONLY');
  if (onlyEnd !== -1) return { type: 'FETCH', next: onlyEnd };

  const withEnd = readKeyword(input, index, 'WITH');
  if (withEnd === -1) return undefined;
  const tiesStart = skipInterTokenTrivia(input, withEnd);
  const tiesEnd = readKeyword(input, tiesStart, 'TIES');
  if (tiesEnd === -1) return undefined;

  return { type: 'FETCH', next: tiesEnd };
}

function readPaginationClause(input: string, start: number): { type: PaginationClauseType; next: number } | undefined {
  return readLimitClause(input, start) ?? readOffsetClause(input, start) ?? readFetchClause(input, start);
}

function isTrailingPaginationSuffix(input: string, start: number): boolean {
  let index = skipInterTokenTrivia(input, start);
  const first = readPaginationClause(input, index);
  if (!first) return false;

  index = skipInterTokenTrivia(input, first.next);
  const second = readPaginationClause(input, index);
  if (!second) return index === input.length;

  if (first.type === second.type) return false;
  if (first.type === 'FETCH') return false;
  if (first.type === 'LIMIT' && second.type === 'FETCH') return false;

  index = skipInterTokenTrivia(input, second.next);
  if (readPaginationClause(input, index)) return false;
  return index === input.length;
}

function findTrailingPaginationStart(query: string): number {
  const keywords = getTopLevelKeywordPositions(query, new Set(['LIMIT', 'OFFSET', 'FETCH']));
  if (keywords.length === 0) return -1;

  let matchedStart = -1;
  for (let i = keywords.length - 1; i >= 0; i -= 1) {
    const start = keywords[i].index;
    if (isTrailingPaginationSuffix(query, start)) {
      matchedStart = start;
    }
  }

  return matchedStart;
}

function hasNonTrailingPaginationClause(query: string): boolean {
  const keywords = getTopLevelKeywordPositions(query, new Set(['LIMIT', 'OFFSET', 'FETCH']));
  for (const keyword of keywords) {
    const clause = readPaginationClause(query, keyword.index);
    if (!clause) continue;
    if (!isTrailingPaginationSuffix(query, keyword.index)) {
      return true;
    }
  }

  return false;
}

export function isRowReturningQuery(query: string): boolean {
  const keyword = findPrimaryWithKeyword(query);
  return keyword === 'SELECT' || keyword === 'VALUES' || keyword === 'TABLE';
}

export function removePaginationFromQuery(query: string): string {
  const trimmed = query.trim();
  if (!trimmed) return trimmed;

  const hasSemicolon = trimmed.endsWith(';');
  const baseQuery = hasSemicolon ? trimmed.slice(0, -1).trimEnd() : trimmed;
  const paginationStart = findTrailingPaginationStart(baseQuery);

  if (paginationStart === -1) {
    return trimmed;
  }

  const cleaned = baseQuery.slice(0, paginationStart).trimEnd();
  return hasSemicolon ? `${cleaned};` : cleaned;
}

export function addPaginationToQuery(query: string, offset: number, limit: number): string {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return query;

  if (!isRowReturningQuery(trimmedQuery)) {
    return query;
  }

  const queryWithoutPagination = removePaginationFromQuery(trimmedQuery);
  if (queryWithoutPagination === trimmedQuery && hasNonTrailingPaginationClause(trimmedQuery)) {
    return query;
  }

  const hasSemicolon = queryWithoutPagination.endsWith(';');
  const queryWithoutSemicolon = hasSemicolon
    ? queryWithoutPagination.slice(0, -1).trim()
    : queryWithoutPagination;

  let paginatedQuery = `${queryWithoutSemicolon} LIMIT ${limit}`;
  if (offset > 0) {
    paginatedQuery += ` OFFSET ${offset}`;
  }

  return hasSemicolon ? `${paginatedQuery};` : paginatedQuery;
}

export function parseQueryTotalCount(value: unknown): number | null {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 0) {
      return null;
    }
    return value;
  }

  if (typeof value === 'bigint') {
    if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) {
      return null;
    }
    return Number(value);
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!/^[0-9]+$/.test(trimmed)) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

export async function getTotalCount(
  connect: (connection: DatabaseConnection) => Promise<Pool>,
  connection: DatabaseConnection,
  query: string
): Promise<number> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return 0;

  if (!isRowReturningQuery(trimmedQuery)) {
    return 0;
  }

  const queryWithoutPagination = removePaginationFromQuery(trimmedQuery);

  try {
    const hasSemicolon = queryWithoutPagination.endsWith(';');
    const queryWithoutSemicolon = hasSemicolon
      ? queryWithoutPagination.slice(0, -1).trim()
      : queryWithoutPagination;
    const countQuery = `SELECT COUNT(*) as total FROM (${queryWithoutSemicolon}) as count_query`;

    const pool = await connect(connection);
    const client: PoolClient = await pool.connect();
    try {
      const result = await client.query(countQuery);
      const parsedCount = parseQueryTotalCount(result.rows[0]?.total);
      if (parsedCount === null) {
        return -1;
      }
      return parsedCount;
    } finally {
      client.release();
    }
  } catch {
    return -1;
  }
}
