/**
 * Process query to ensure complete lines are considered when ending with semicolon
 * When a line ends with semicolon, the entire line content is preserved
 */
export function processQuery(query: string): string {
  if (!query) return '';
  
  // Split by lines and process each line
  const lines = query.split('\n');
  const processedLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // If line ends with semicolon, keep the entire line content (including any trailing spaces before semicolon)
    if (trimmedLine.endsWith(';')) {
      // Find the last semicolon position in the original line
      const lastSemicolonIndex = line.lastIndexOf(';');
      if (lastSemicolonIndex !== -1) {
        // Keep everything from start to semicolon (inclusive), then trim only leading spaces
        const beforeSemicolon = line.substring(0, lastSemicolonIndex + 1);
        processedLines.push(beforeSemicolon.trimStart());
      } else {
        processedLines.push(trimmedLine);
      }
    } else if (trimmedLine) {
      // For non-empty lines without semicolon, trim normally
      processedLines.push(trimmedLine);
    } else if (i === lines.length - 1) {
      // Skip trailing empty lines
      continue;
    } else {
      // Keep empty lines in the middle
      processedLines.push('');
    }
  }
  
  // Join lines and trim only leading/trailing whitespace from the entire query
  return processedLines.join('\n').trim();
}

/**
 * Find the complete SQL statement at the cursor position (DBeaver-style)
 * Delimiters: semicolon (;) or blank lines (Smart mode)
 * Returns the statement that contains the cursor line
 */
export function findStatementAtCursor(
  fullText: string,
  cursorLineNumber: number, // 1-based line number
  useBlankLinesAsDelimiter: boolean = true // Smart mode: blank lines are delimiters
): string {
  if (!fullText) return '';
  
  const lines = fullText.split('\n');
  const cursorIndex = cursorLineNumber - 1; // Convert to 0-based
  
  if (cursorIndex < 0 || cursorIndex >= lines.length) {
    return fullText; // Invalid position, return all
  }
  
  // Find the start of the statement (search backwards from cursor)
  // Look for the last delimiter (; or blank line) BEFORE the cursor
  let startLine = 0;
  let foundDelimiterBefore = false;
  
  for (let i = cursorIndex - 1; i >= 0; i--) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Check if this line ends a statement (has semicolon)
    if (trimmedLine.endsWith(';')) {
      startLine = i + 1;
      foundDelimiterBefore = true;
      break;
    }
    
    // Check if blank line is a delimiter (Smart mode)
    if (useBlankLinesAsDelimiter && trimmedLine === '') {
      startLine = i + 1;
      foundDelimiterBefore = true;
      break;
    }
  }
  
  // If no delimiter found before cursor, start from beginning
  if (!foundDelimiterBefore) {
    startLine = 0;
  }
  
  // Find the first non-empty line from startLine (skip leading empty lines)
  for (let i = startLine; i <= cursorIndex; i++) {
    if (lines[i].trim() !== '') {
      startLine = i;
      break;
    }
  }
  
  // Find the end of the statement (search forwards from cursor)
  let endLine = lines.length - 1;
  
  for (let i = cursorIndex; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Check if this line ends a statement (has semicolon)
    if (trimmedLine.endsWith(';')) {
      endLine = i;
      break;
    }
    
    // Check if blank line is a delimiter (Smart mode)
    // Only consider blank lines AFTER the cursor line
    if (useBlankLinesAsDelimiter && trimmedLine === '' && i > cursorIndex) {
      endLine = i - 1;
      break;
    }
  }
  
  // Extract the statement
  const statementLines = lines.slice(startLine, endLine + 1);
  let statement = statementLines.join('\n');
  
  // Trim only leading/trailing whitespace, preserve internal formatting
  statement = statement.trim();
  
  // If statement is empty, return the entire text as fallback
  return statement || fullText;
}

/**
 * Add LIMIT 100 to SELECT queries that don't already have a LIMIT clause
 */
export function addDefaultLimit(query: string): string {
  if (!query) return query;
  
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return query;
  
  // Check if it's a SELECT query (case-insensitive)
  const upperQuery = trimmedQuery.toUpperCase();
  if (!upperQuery.startsWith('SELECT')) {
    return query; // Not a SELECT query, return as-is
  }
  
  // Check if query already has a LIMIT clause (case-insensitive)
  // Use regex to find LIMIT keyword, accounting for word boundaries
  const limitRegex = /\bLIMIT\s+\d+/i;
  if (limitRegex.test(trimmedQuery)) {
    return query; // Already has LIMIT, return as-is
  }
  
  // Remove trailing semicolon if present, add LIMIT 100, then add semicolon back if it was there
  const hasSemicolon = trimmedQuery.endsWith(';');
  const queryWithoutSemicolon = hasSemicolon 
    ? trimmedQuery.slice(0, -1).trim() 
    : trimmedQuery;
  
  const queryWithLimit = `${queryWithoutSemicolon} LIMIT 100`;
  
  return hasSemicolon ? `${queryWithLimit};` : queryWithLimit;
}

type DeleteConfirmationInfo = {
  hasDelete: boolean;
  hasDeleteWithoutWhere: boolean;
  title: string;
  message: string;
  tableNames: string[];
};

function stripSqlComments(query: string): string {
  const withoutBlock = query.replace(/\/\*[\s\S]*?\*\//g, ' ');
  return withoutBlock.replace(/--.*$/gm, ' ');
}

function normalizeTableName(rawName: string): string {
  return rawName.replace(/^[`"'[]|[`"'\]]$/g, '');
}

export function getDeleteConfirmationInfo(query: string): DeleteConfirmationInfo {
  if (!query) {
    return {
      hasDelete: false,
      hasDeleteWithoutWhere: false,
      title: '',
      message: '',
      tableNames: [],
    };
  }

  const normalized = stripSqlComments(query);
  const statements = normalized
    .split(/;+/)
    .map((statement) => statement.trim())
    .filter(Boolean);

  let hasDelete = false;
  let hasDeleteWithoutWhere = false;
  const tableNames = new Set<string>();

  for (const statement of statements) {
    const upperStatement = statement.toUpperCase();
    const deleteIndex = upperStatement.search(/\bDELETE\b/);
    if (deleteIndex === -1) continue;
    hasDelete = true;
    const tableMatch = statement.match(/\bDELETE\b[\s\S]*?\bFROM\b\s+([`"'[\]\w.]+)/i);
    if (tableMatch?.[1]) {
      tableNames.add(normalizeTableName(tableMatch[1]));
    }
    const afterDelete = upperStatement.slice(deleteIndex);
    if (!/\bWHERE\b/.test(afterDelete)) {
      hasDeleteWithoutWhere = true;
    }
  }

  if (!hasDelete) {
    return {
      hasDelete: false,
      hasDeleteWithoutWhere: false,
      title: '',
      message: '',
      tableNames: [],
    };
  }

  if (hasDeleteWithoutWhere) {
    return {
      hasDelete: true,
      hasDeleteWithoutWhere: true,
      title: 'Danger: DELETE without WHERE',
      message:
        'This query includes a DELETE without a WHERE clause. That will remove ALL rows from the target table. This is destructive and cannot be undone. Are you absolutely sure?',
      tableNames: Array.from(tableNames),
    };
  }

  return {
    hasDelete: true,
    hasDeleteWithoutWhere: false,
    title: 'Confirm DELETE',
    message: 'You are about to run a DELETE statement. Are you sure you want to continue?',
    tableNames: Array.from(tableNames),
  };
}
