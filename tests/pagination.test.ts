import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addPaginationToQuery,
  isRowReturningQuery,
  removePaginationFromQuery,
} from '../src/lib/database-connectors/pagination.ts';

test('isRowReturningQuery returns true for SELECT query', () => {
  assert.equal(isRowReturningQuery('SELECT * FROM users'), true);
});

test('isRowReturningQuery returns true for BOM-prefixed SELECT query', () => {
  assert.equal(isRowReturningQuery('\uFEFFSELECT * FROM users'), true);
});

test('isRowReturningQuery handles CR-terminated leading line comments', () => {
  const query = '-- comment with CR terminator\rSELECT * FROM users';
  assert.equal(isRowReturningQuery(query), true);
});

test('isRowReturningQuery handles hash-prefixed leading line comments', () => {
  const query = '# comment with hash prefix\nSELECT * FROM users';
  assert.equal(isRowReturningQuery(query), true);
});

test('isRowReturningQuery handles Unicode line-separator terminated comments', () => {
  const query = '-- comment with unicode terminator\u2028SELECT * FROM users';
  assert.equal(isRowReturningQuery(query), true);
});

test('isRowReturningQuery handles leading semicolons before SELECT', () => {
  const query = ' ; ; SELECT * FROM users';
  assert.equal(isRowReturningQuery(query), true);
});

test('isRowReturningQuery handles comment-only preamble mixed with semicolon chain before SELECT', () => {
  const query = `
    -- first comment
    /* second comment */
    ; ; ;
    SELECT * FROM users
  `;
  assert.equal(isRowReturningQuery(query), true);
});

test('isRowReturningQuery returns false for unterminated leading block comment', () => {
  const query = '/* unterminated comment SELECT * FROM users';
  assert.equal(isRowReturningQuery(query), false);
});

test('isRowReturningQuery returns true for WITH ... SELECT query', () => {
  const query = `
    WITH recent_users AS (
      SELECT id, email
      FROM users
      WHERE created_at > NOW() - INTERVAL '7 days'
    )
    SELECT * FROM recent_users
  `;

  assert.equal(isRowReturningQuery(query), true);
});

test('isRowReturningQuery returns true when CTE name contains "as"', () => {
  const query = `
    WITH myascte AS (
      SELECT id FROM users
    )
    SELECT * FROM myascte
  `;

  assert.equal(isRowReturningQuery(query), true);
});

test('isRowReturningQuery returns false for WITH ... INSERT query', () => {
  const query = `
    WITH inserted AS (
      INSERT INTO audit_log(event) VALUES ('created')
      RETURNING id
    )
    INSERT INTO event_log(audit_id)
    SELECT id FROM inserted
  `;

  assert.equal(isRowReturningQuery(query), false);
});

test('isRowReturningQuery returns false for invalid WITH AS quoted-text then paren pattern', () => {
  const query = `
    WITH bad_cte AS 'not-a-body' (SELECT 1)
    SELECT * FROM bad_cte
  `;

  assert.equal(isRowReturningQuery(query), false);
});

test('isRowReturningQuery returns true for VALUES query', () => {
  assert.equal(isRowReturningQuery('VALUES (1), (2), (3)'), true);
});

test('isRowReturningQuery returns true for TABLE query', () => {
  assert.equal(isRowReturningQuery('TABLE users'), true);
});

test('isRowReturningQuery returns true for WITH ... VALUES query', () => {
  const query = `
    WITH seed AS (
      SELECT 1 as id
    )
    VALUES ((SELECT id FROM seed));
  `;

  assert.equal(isRowReturningQuery(query), true);
});

test('isRowReturningQuery handles comments between AS and opening paren in CTE', () => {
  const query = `
    WITH seed AS /* as-comment */ (
      SELECT 1 as id
    )
    SELECT * FROM seed
  `;

  assert.equal(isRowReturningQuery(query), true);
});

test('isRowReturningQuery handles comments between CTE close and next token', () => {
  const query = `
    WITH first_cte AS (SELECT 1 id) /* mid-comment */, second_cte AS (SELECT 2 id)
    -- comment before main query
    SELECT * FROM second_cte
  `;

  assert.equal(isRowReturningQuery(query), true);
});

test('isRowReturningQuery handles mixed comment dialects around WITH boundaries', () => {
  const query = `
    WITH first_cte AS # hash before body
    (
      SELECT 1 id
    ) -- dash after body
    /* block before comma */
    , second_cte AS (
      SELECT id FROM first_cte
    )
    # hash before main statement
    SELECT * FROM second_cte
  `;

  assert.equal(isRowReturningQuery(query), true);
});

test('isRowReturningQuery handles WITH RECURSIVE with mixed comment trivia', () => {
  const query = `
    WITH RECURSIVE -- recursive keyword comment
    seq AS /* body comment */ (
      SELECT 1 AS n
      UNION ALL
      SELECT n + 1 FROM seq WHERE n < 3
    )
    # hash before main select
    SELECT * FROM seq
  `;

  assert.equal(isRowReturningQuery(query), true);
});

test('isRowReturningQuery returns true for control-prefixed WITH ... VALUES query', () => {
  const query = '\u0000\u001F WITH seed AS (SELECT 1 as id) VALUES ((SELECT id FROM seed));';
  assert.equal(isRowReturningQuery(query), true);
});

test('isRowReturningQuery handles ) inside dollar-quoted CTE content', () => {
  const query = `
    WITH cfg AS (
      SELECT $$contains ) parenthesis$$ AS txt
    )
    SELECT * FROM cfg
  `;

  assert.equal(isRowReturningQuery(query), true);
});

test('isRowReturningQuery ignores ) inside line comments in CTE body', () => {
  const query = `
    WITH cfg AS (
      SELECT 1 -- ) comment should not close CTE
    )
    SELECT * FROM cfg
  `;

  assert.equal(isRowReturningQuery(query), true);
});

test('isRowReturningQuery ignores ) inside block comments in CTE body', () => {
  const query = `
    WITH cfg AS (
      SELECT 1 /* ) comment should not close CTE */
    )
    SELECT * FROM cfg
  `;

  assert.equal(isRowReturningQuery(query), true);
});

test('isRowReturningQuery ignores ) inside nested block comments in CTE body', () => {
  const query = `
    WITH cfg AS (
      SELECT 1 /* outer /* inner ) */ still comment */
    )
    SELECT * FROM cfg
  `;

  assert.equal(isRowReturningQuery(query), true);
});

test('isRowReturningQuery ignores ) inside bracket-quoted identifiers', () => {
  const query = `
    WITH cfg AS (
      SELECT [column ) name] AS v
    )
    SELECT * FROM cfg
  `;

  assert.equal(isRowReturningQuery(query), true);
});

test('isRowReturningQuery ignores ) inside double-quoted identifiers with escaped quotes', () => {
  const query = `
    WITH cfg AS (
      SELECT "col"" ) name" AS v
    )
    SELECT * FROM cfg
  `;

  assert.equal(isRowReturningQuery(query), true);
});

test('isRowReturningQuery ignores ) inside backtick identifiers with escaped backticks', () => {
  const query = `
    WITH cfg AS (
      SELECT \`col\`\` ) name\` AS v
    )
    SELECT * FROM cfg
  `;

  assert.equal(isRowReturningQuery(query), true);
});

test('isRowReturningQuery tolerates unterminated dollar-quote in CTE body', () => {
  const query = `
    WITH cfg AS (
      SELECT $tag$unterminated
    )
    SELECT * FROM cfg
  `;

  assert.equal(isRowReturningQuery(query), true);
});

test('addPaginationToQuery applies pagination to WITH ... SELECT query', () => {
  const query = `
    WITH active_users AS (
      SELECT id, email
      FROM users
      WHERE active = true
    )
    SELECT * FROM active_users;
  `;

  const paginated = addPaginationToQuery(query, 50, 25);

  assert.match(paginated, /LIMIT 25 OFFSET 50;/);
});

test('addPaginationToQuery applies pagination when CTE name contains "as"', () => {
  const query = `
    WITH myascte AS (
      SELECT id FROM users
    )
    SELECT * FROM myascte;
  `;
  const paginated = addPaginationToQuery(query, 0, 10);

  assert.match(paginated, /LIMIT 10;/);
});

test('addPaginationToQuery handles comments around CTE boundaries', () => {
  const query = `
    WITH first_cte AS /* comment before body */ (
      SELECT 1 id
    ) /* comment after body */, second_cte AS (SELECT id FROM first_cte)
    SELECT * FROM second_cte;
  `;
  const paginated = addPaginationToQuery(query, 0, 8);

  assert.match(paginated, /LIMIT 8;/);
});

test('addPaginationToQuery handles mixed comment dialects around WITH boundaries', () => {
  const query = `
    WITH first_cte AS # hash before body
    (
      SELECT 1 id
    ) -- dash after body
    /* block before comma */
    , second_cte AS (
      SELECT id FROM first_cte
    )
    # hash before main statement
    SELECT * FROM second_cte;
  `;
  const paginated = addPaginationToQuery(query, 0, 11);

  assert.match(paginated, /LIMIT 11;/);
});

test('addPaginationToQuery handles WITH RECURSIVE with mixed comment trivia', () => {
  const query = `
    WITH RECURSIVE -- recursive keyword comment
    seq AS /* body comment */ (
      SELECT 1 AS n
      UNION ALL
      SELECT n + 1 FROM seq WHERE n < 3
    )
    # hash before main select
    SELECT * FROM seq;
  `;
  const paginated = addPaginationToQuery(query, 0, 12);

  assert.match(paginated, /LIMIT 12;/);
});

test('addPaginationToQuery handles ) inside dollar-quoted CTE content', () => {
  const query = `
    WITH cfg AS (
      SELECT $$contains ) parenthesis$$ AS txt
    )
    SELECT * FROM cfg;
  `;
  const paginated = addPaginationToQuery(query, 0, 5);

  assert.match(paginated, /LIMIT 5;/);
});

test('addPaginationToQuery ignores ) inside comments in CTE body', () => {
  const query = `
    WITH cfg AS (
      SELECT 1 -- ) comment should not close CTE
    )
    SELECT * FROM cfg;
  `;
  const paginated = addPaginationToQuery(query, 0, 7);

  assert.match(paginated, /LIMIT 7;/);
});

test('addPaginationToQuery handles CR-terminated line comments in CTE body', () => {
  const query = 'WITH cfg AS (SELECT 1 -- ) comment\r) SELECT * FROM cfg;';
  const paginated = addPaginationToQuery(query, 0, 6);

  assert.match(paginated, /LIMIT 6;/);
});

test('addPaginationToQuery handles bracket-quoted identifiers with ) in CTE body', () => {
  const query = `
    WITH cfg AS (
      SELECT [column ) name] AS v
    )
    SELECT * FROM cfg;
  `;
  const paginated = addPaginationToQuery(query, 0, 4);

  assert.match(paginated, /LIMIT 4;/);
});

test('addPaginationToQuery applies pagination to VALUES query', () => {
  const query = 'VALUES (1), (2), (3)';
  const paginated = addPaginationToQuery(query, 1, 1);

  assert.equal(paginated, 'VALUES (1), (2), (3) LIMIT 1 OFFSET 1');
});

test('addPaginationToQuery applies pagination to BOM-prefixed SELECT query', () => {
  const query = '\uFEFFSELECT * FROM users';
  const paginated = addPaginationToQuery(query, 5, 10);

  assert.equal(paginated, 'SELECT * FROM users LIMIT 10 OFFSET 5');
});

test('addPaginationToQuery handles leading semicolons before SELECT', () => {
  const query = '; ; SELECT * FROM users';
  const paginated = addPaginationToQuery(query, 0, 3);

  assert.equal(paginated, '; ; SELECT * FROM users LIMIT 3');
});

test('addPaginationToQuery handles comment-only preamble mixed with semicolon chain before WITH', () => {
  const query = `
    -- lead comment
    ; ; /* separator */
    WITH cte AS (SELECT 1 AS id)
    SELECT * FROM cte;
  `;
  const paginated = addPaginationToQuery(query, 0, 2);

  assert.match(paginated, /LIMIT 2;/);
});

test('addPaginationToQuery leaves query unchanged for unterminated leading block comment', () => {
  const query = '/* unterminated comment SELECT * FROM users';
  const paginated = addPaginationToQuery(query, 0, 10);

  assert.equal(paginated, query);
});

test('addPaginationToQuery does not modify WITH ... INSERT query', () => {
  const query = `
    WITH candidate AS (
      SELECT email FROM users WHERE active = true
    )
    INSERT INTO newsletter(email)
    SELECT email FROM candidate;
  `;

  const paginated = addPaginationToQuery(query, 0, 100);

  assert.equal(paginated, query);
});

test('addPaginationToQuery does not modify invalid WITH AS quoted-text then paren pattern', () => {
  const query = `
    WITH bad_cte AS 'not-a-body' (SELECT 1)
    SELECT * FROM bad_cte
  `;
  const paginated = addPaginationToQuery(query, 0, 10);

  assert.equal(paginated, query);
});

test('malformed WITH boundary matrix stays non-row-returning and unmodified', () => {
  const cases = [
    `
      WITH bad_cte AS
      SELECT 1
      SELECT * FROM bad_cte
    `,
    `
      WITH bad_cte AS /* comment */ SELECT 1
      SELECT * FROM bad_cte
    `,
    `
      WITH bad_cte AS # hash comment
      SELECT 1
      SELECT * FROM bad_cte
    `,
    `
      WITH bad_cte AS -- dash comment
      SELECT 1
      SELECT * FROM bad_cte
    `,
    `
      WITH bad_cte AS [not-a-body] (SELECT 1)
      SELECT * FROM bad_cte
    `,
    `
      WITH bad_cte AS $$not-a-body$$ (SELECT 1)
      SELECT * FROM bad_cte
    `,
  ];

  for (const query of cases) {
    assert.equal(isRowReturningQuery(query), false);
    assert.equal(addPaginationToQuery(query, 0, 5), query);
  }
});

test('removePaginationFromQuery keeps nested LIMIT and removes only trailing pagination', () => {
  const query = `
    SELECT *
    FROM (
      SELECT id FROM users LIMIT 5
    ) as nested_users
    LIMIT 10 OFFSET 20;
  `;

  const cleaned = removePaginationFromQuery(query);

  assert.match(cleaned, /SELECT id FROM users LIMIT 5/);
  assert.doesNotMatch(cleaned, /\sLIMIT 10\sOFFSET 20/i);
  assert.equal(cleaned.trim().endsWith(';'), true);
});

test('removePaginationFromQuery does not strip LIMIT text literals', () => {
  const query = "SELECT 'LIMIT 99 OFFSET 1' AS txt, id FROM users LIMIT 10";
  const cleaned = removePaginationFromQuery(query);

  assert.match(cleaned, /'LIMIT 99 OFFSET 1'/);
  assert.equal(cleaned, "SELECT 'LIMIT 99 OFFSET 1' AS txt, id FROM users");
});

test('removePaginationFromQuery ignores LIMIT/OFFSET inside $$ dollar-quoted strings', () => {
  const query = "SELECT $$LIMIT 99 OFFSET 1$$ AS txt, id FROM users LIMIT 10";
  const cleaned = removePaginationFromQuery(query);

  assert.match(cleaned, /\$\$LIMIT 99 OFFSET 1\$\$/);
  assert.equal(cleaned, 'SELECT $$LIMIT 99 OFFSET 1$$ AS txt, id FROM users');
});

test('removePaginationFromQuery ignores LIMIT/OFFSET inside tagged dollar-quoted strings', () => {
  const query = 'SELECT $tag$OFFSET 22 LIMIT 3$tag$ AS txt, id FROM users LIMIT 5 OFFSET 2';
  const cleaned = removePaginationFromQuery(query);

  assert.match(cleaned, /\$tag\$OFFSET 22 LIMIT 3\$tag\$/);
  assert.equal(cleaned, 'SELECT $tag$OFFSET 22 LIMIT 3$tag$ AS txt, id FROM users');
});

test('removePaginationFromQuery ignores LIMIT/OFFSET inside nested block comments', () => {
  const query = `
    SELECT id /* outer LIMIT 8 /* inner OFFSET 2 */ still comment */
    FROM users
    LIMIT 10 OFFSET 4
  `;
  const cleaned = removePaginationFromQuery(query);

  assert.match(cleaned, /outer LIMIT 8/);
  assert.match(cleaned, /inner OFFSET 2/);
  assert.doesNotMatch(cleaned, /\sLIMIT 10\sOFFSET 4/i);
});

test('removePaginationFromQuery handles CR-terminated line comments with LIMIT text', () => {
  const query = 'SELECT id -- LIMIT 999\rFROM users LIMIT 10';
  const cleaned = removePaginationFromQuery(query);

  assert.match(cleaned, /-- LIMIT 999/);
  assert.equal(cleaned, 'SELECT id -- LIMIT 999\rFROM users');
});

test('removePaginationFromQuery handles Unicode line-separator terminated comments with LIMIT text', () => {
  const query = 'SELECT id -- LIMIT 999\u2029FROM users LIMIT 10';
  const cleaned = removePaginationFromQuery(query);

  assert.match(cleaned, /-- LIMIT 999/);
  assert.equal(cleaned, 'SELECT id -- LIMIT 999\u2029FROM users');
});

test('removePaginationFromQuery handles hash-prefixed comments with LIMIT text', () => {
  const query = 'SELECT id # LIMIT 999\nFROM users LIMIT 10';
  const cleaned = removePaginationFromQuery(query);

  assert.match(cleaned, /# LIMIT 999/);
  assert.equal(cleaned, 'SELECT id # LIMIT 999\nFROM users');
});

test('removePaginationFromQuery ignores LIMIT text inside bracket-quoted identifiers', () => {
  const query = 'SELECT [LIMIT]]name] AS col, id FROM users LIMIT 10 OFFSET 3';
  const cleaned = removePaginationFromQuery(query);

  assert.match(cleaned, /\[LIMIT\]\]name\]/);
  assert.equal(cleaned, 'SELECT [LIMIT]]name] AS col, id FROM users');
});

test('removePaginationFromQuery ignores LIMIT text inside double-quoted identifiers with escaped quotes', () => {
  const query = 'SELECT "col""LIMIT" AS col, id FROM users LIMIT 10';
  const cleaned = removePaginationFromQuery(query);

  assert.match(cleaned, /"col""LIMIT"/);
  assert.equal(cleaned, 'SELECT "col""LIMIT" AS col, id FROM users');
});

test('removePaginationFromQuery ignores LIMIT text inside backtick identifiers with escaped backticks', () => {
  const query = 'SELECT `col``LIMIT` AS col, id FROM users LIMIT 10';
  const cleaned = removePaginationFromQuery(query);

  assert.match(cleaned, /`col``LIMIT`/);
  assert.equal(cleaned, 'SELECT `col``LIMIT` AS col, id FROM users');
});

test('removePaginationFromQuery still strips trailing LIMIT when dollar-quote is unterminated', () => {
  const query = 'SELECT $tag$unterminated FROM users LIMIT 10';
  const cleaned = removePaginationFromQuery(query);

  assert.equal(cleaned, 'SELECT $tag$unterminated FROM users');
});

test('removePaginationFromQuery does not treat LIMIT/OFFSET followed by digits as keywords', () => {
  const query = 'SELECT LIMIT2 AS x, OFFSET3 AS y FROM metrics';
  const cleaned = removePaginationFromQuery(query);

  assert.equal(cleaned, query);
});

test('removePaginationFromQuery does not treat LIMIT/OFFSET inside unicode identifiers as keywords', () => {
  const query = 'SELECT ÅLIMIT AS x, ÜOFFSET AS y FROM metrics';
  const cleaned = removePaginationFromQuery(query);

  assert.equal(cleaned, query);
});

test('removePaginationFromQuery strips trailing pagination with comment+semicolon preamble', () => {
  const query = `
    -- preamble
    ; ; ;
    SELECT * FROM users LIMIT 9 OFFSET 4;
  `;
  const cleaned = removePaginationFromQuery(query);

  assert.doesNotMatch(cleaned, /\sLIMIT 9\sOFFSET 4/i);
  assert.match(cleaned, /SELECT \* FROM users/);
});

test('removePaginationFromQuery strips OFFSET ... LIMIT with mixed comment trivia', () => {
  const query = `
    SELECT *
    FROM users
    OFFSET 5
    -- swap order comment
    LIMIT 10
  `;
  const cleaned = removePaginationFromQuery(query);

  assert.equal(cleaned.trim(), 'SELECT *\n    FROM users');
});

test('removePaginationFromQuery strips trailing LIMIT ALL with optional OFFSET', () => {
  const query = 'SELECT * FROM users LIMIT ALL OFFSET 5';
  const cleaned = removePaginationFromQuery(query);

  assert.equal(cleaned, 'SELECT * FROM users');
});

test('removePaginationFromQuery strips trailing LIMIT NULL with optional OFFSET', () => {
  const query = 'SELECT * FROM users LIMIT NULL OFFSET 5';
  const cleaned = removePaginationFromQuery(query);

  assert.equal(cleaned, 'SELECT * FROM users');
});

test('removePaginationFromQuery strips trailing OFFSET ... LIMIT ALL', () => {
  const query = 'SELECT * FROM users OFFSET 5 LIMIT ALL';
  const cleaned = removePaginationFromQuery(query);

  assert.equal(cleaned, 'SELECT * FROM users');
});

test('removePaginationFromQuery strips trailing parameterized LIMIT/OFFSET', () => {
  const query = 'SELECT * FROM users LIMIT $1 OFFSET $2';
  const cleaned = removePaginationFromQuery(query);

  assert.equal(cleaned, 'SELECT * FROM users');
});

test('removePaginationFromQuery strips trailing parameterized OFFSET ... LIMIT', () => {
  const query = 'SELECT * FROM users OFFSET ? LIMIT ?';
  const cleaned = removePaginationFromQuery(query);

  assert.equal(cleaned, 'SELECT * FROM users');
});

test('removePaginationFromQuery strips trailing MySQL/SQLite LIMIT offset,count form', () => {
  const query = 'SELECT * FROM users LIMIT 5, 10';
  const cleaned = removePaginationFromQuery(query);

  assert.equal(cleaned, 'SELECT * FROM users');
});

test('removePaginationFromQuery strips trailing parameterized LIMIT offset,count form', () => {
  const query = 'SELECT * FROM users LIMIT $1, ?';
  const cleaned = removePaginationFromQuery(query);

  assert.equal(cleaned, 'SELECT * FROM users');
});

test('removePaginationFromQuery strips trailing parenthesized LIMIT offset,count form', () => {
  const query = 'SELECT * FROM users LIMIT ($1), (10)';
  const cleaned = removePaginationFromQuery(query);

  assert.equal(cleaned, 'SELECT * FROM users');
});

test('removePaginationFromQuery strips parenthesized trailing LIMIT/OFFSET values', () => {
  const query = 'SELECT * FROM users LIMIT (10) OFFSET ($2)';
  const cleaned = removePaginationFromQuery(query);

  assert.equal(cleaned, 'SELECT * FROM users');
});

test('removePaginationFromQuery strips trailing FETCH FIRST ... ROWS ONLY', () => {
  const query = 'SELECT * FROM users FETCH FIRST 10 ROWS ONLY';
  const cleaned = removePaginationFromQuery(query);

  assert.equal(cleaned, 'SELECT * FROM users');
});

test('removePaginationFromQuery strips trailing FETCH FIRST ROW ONLY without explicit count', () => {
  const query = 'SELECT * FROM users FETCH FIRST ROW ONLY';
  const cleaned = removePaginationFromQuery(query);

  assert.equal(cleaned, 'SELECT * FROM users');
});

test('removePaginationFromQuery strips trailing FETCH FIRST ... WITH TIES', () => {
  const query = 'SELECT * FROM users FETCH FIRST 10 ROWS WITH TIES';
  const cleaned = removePaginationFromQuery(query);

  assert.equal(cleaned, 'SELECT * FROM users');
});

test('removePaginationFromQuery strips trailing FETCH ... PERCENT ... ONLY', () => {
  const query = 'SELECT * FROM users FETCH FIRST 10 PERCENT ROWS ONLY';
  const cleaned = removePaginationFromQuery(query);

  assert.equal(cleaned, 'SELECT * FROM users');
});

test('removePaginationFromQuery strips trailing OFFSET ... ROWS FETCH NEXT ... ONLY', () => {
  const query = 'SELECT * FROM users OFFSET $1 ROWS FETCH NEXT (10) ROWS ONLY';
  const cleaned = removePaginationFromQuery(query);

  assert.equal(cleaned, 'SELECT * FROM users');
});

test('removePaginationFromQuery strips standalone SQL-standard OFFSET ... ROW', () => {
  const query = 'SELECT * FROM users OFFSET 7 ROW';
  const cleaned = removePaginationFromQuery(query);

  assert.equal(cleaned, 'SELECT * FROM users');
});

test('removePaginationFromQuery strips FETCH with mixed comment trivia between tokens', () => {
  const query = `
    SELECT * FROM users
    FETCH /* c1 */ NEXT -- c2
    10 /* c3 */ ROWS /* c4 */ ONLY
  `;
  const cleaned = removePaginationFromQuery(query);

  assert.equal(cleaned.trim(), 'SELECT * FROM users');
});

test('addPaginationToQuery replaces trailing OFFSET ... LIMIT with canonical LIMIT ... OFFSET', () => {
  const query = `
    SELECT *
    FROM users
    OFFSET 5 /* existing offset */
    LIMIT 10;
  `;
  const paginated = addPaginationToQuery(query, 2, 7);

  assert.match(paginated, /LIMIT 7 OFFSET 2;/);
  assert.doesNotMatch(paginated, /\bOFFSET 5\b/);
});

test('addPaginationToQuery replaces trailing LIMIT ALL with canonical LIMIT/OFFSET', () => {
  const query = 'SELECT * FROM users LIMIT ALL OFFSET 10';
  const paginated = addPaginationToQuery(query, 3, 8);

  assert.equal(paginated, 'SELECT * FROM users LIMIT 8 OFFSET 3');
});

test('addPaginationToQuery replaces trailing LIMIT NULL with canonical LIMIT/OFFSET', () => {
  const query = 'SELECT * FROM users LIMIT NULL OFFSET 10';
  const paginated = addPaginationToQuery(query, 3, 8);

  assert.equal(paginated, 'SELECT * FROM users LIMIT 8 OFFSET 3');
});

test('addPaginationToQuery replaces trailing parameterized LIMIT/OFFSET', () => {
  const query = 'SELECT * FROM users LIMIT $1 OFFSET $2';
  const paginated = addPaginationToQuery(query, 4, 9);

  assert.equal(paginated, 'SELECT * FROM users LIMIT 9 OFFSET 4');
});

test('addPaginationToQuery replaces trailing parenthesized LIMIT/OFFSET', () => {
  const query = 'SELECT * FROM users OFFSET (?) LIMIT (ALL)';
  const paginated = addPaginationToQuery(query, 6, 13);

  assert.equal(paginated, 'SELECT * FROM users LIMIT 13 OFFSET 6');
});

test('addPaginationToQuery replaces trailing FETCH pagination with canonical LIMIT/OFFSET', () => {
  const query = 'SELECT * FROM users OFFSET 5 ROWS FETCH NEXT ? ROWS ONLY';
  const paginated = addPaginationToQuery(query, 2, 7);

  assert.equal(paginated, 'SELECT * FROM users LIMIT 7 OFFSET 2');
});

test('addPaginationToQuery replaces standalone SQL-standard OFFSET ... ROW', () => {
  const query = 'SELECT * FROM users OFFSET 5 ROW';
  const paginated = addPaginationToQuery(query, 3, 9);

  assert.equal(paginated, 'SELECT * FROM users LIMIT 9 OFFSET 3');
});

test('addPaginationToQuery replaces FETCH with mixed comment trivia between tokens', () => {
  const query = `
    SELECT * FROM users
    FETCH /* c1 */ FIRST
    -- c2
    ROW /* c3 */ ONLY
  `;
  const paginated = addPaginationToQuery(query, 4, 8);

  assert.equal(paginated, 'SELECT * FROM users LIMIT 8 OFFSET 4');
});

test('addPaginationToQuery replaces trailing FETCH FIRST ROW ONLY without explicit count', () => {
  const query = 'SELECT * FROM users FETCH FIRST ROW ONLY';
  const paginated = addPaginationToQuery(query, 1, 6);

  assert.equal(paginated, 'SELECT * FROM users LIMIT 6 OFFSET 1');
});

test('addPaginationToQuery replaces trailing FETCH ... WITH TIES with canonical LIMIT/OFFSET', () => {
  const query = 'SELECT * FROM users OFFSET 5 ROWS FETCH NEXT 20 ROWS WITH TIES';
  const paginated = addPaginationToQuery(query, 2, 7);

  assert.equal(paginated, 'SELECT * FROM users LIMIT 7 OFFSET 2');
});

test('addPaginationToQuery leaves FETCH pagination unchanged when followed by FOR UPDATE', () => {
  const query = 'SELECT * FROM users FETCH FIRST 10 ROWS ONLY FOR UPDATE';
  const paginated = addPaginationToQuery(query, 2, 7);

  assert.equal(paginated, query);
});

test('addPaginationToQuery leaves LIMIT pagination unchanged when followed by FOR UPDATE', () => {
  const query = 'SELECT * FROM users LIMIT 10 FOR UPDATE';
  const paginated = addPaginationToQuery(query, 2, 7);

  assert.equal(paginated, query);
});

test('addPaginationToQuery replaces trailing FETCH ... PERCENT with canonical LIMIT/OFFSET', () => {
  const query = 'SELECT * FROM users OFFSET 5 ROWS FETCH NEXT ? PERCENT ROWS ONLY';
  const paginated = addPaginationToQuery(query, 1, 4);

  assert.equal(paginated, 'SELECT * FROM users LIMIT 4 OFFSET 1');
});

test('removePaginationFromQuery leaves query unchanged for unterminated leading block comment', () => {
  const query = '/* unterminated comment SELECT * FROM users LIMIT 10';
  const cleaned = removePaginationFromQuery(query);

  assert.equal(cleaned, query);
});
