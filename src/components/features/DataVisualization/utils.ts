import type { RowData } from '@/types';

export function exportToCsv(columns: string[], rows: RowData[]) {
  if (!rows.length) return;

  const headers = columns.join(',');
  const lines = rows.map((row) =>
    columns.map((col) => {
      const value = row[col];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value).replace(/"/g, '""');
    }).join(',')
  );

  const csv = [headers, ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `query_result_${Date.now()}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}

export function extractTableName(query?: string): string {
  if (!query) return 'table_name';

  const upperQuery = query.trim().toUpperCase();
  if (!upperQuery.startsWith('SELECT')) return 'table_name';

  const schemaTableMatch = query.match(/\bFROM\s+([a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*)/i);
  if (schemaTableMatch && schemaTableMatch[1]) {
    return schemaTableMatch[1];
  }

  const fromMatch = query.match(/\bFROM\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
  if (fromMatch && fromMatch[1]) {
    return fromMatch[1];
  }

  return 'table_name';
}

export function escapeSqlValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'object') {
    const jsonStr = JSON.stringify(value);
    return `'${jsonStr.replace(/'/g, "''")}'`;
  }

  const str = String(value);
  return `'${str.replace(/'/g, "''")}'`;
}

export function exportToInsertStatements(
  columns: string[],
  rows: RowData[],
  query?: string
) {
  if (!rows.length) return;

  const tableName = extractTableName(query);
  const inserts = rows.map((row) => {
    const values = columns.map((col) => escapeSqlValue(row[col]));
    return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});`;
  });

  const sqlContent = inserts.join('\n');
  const blob = new Blob([sqlContent], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `inserts_${tableName}_${Date.now()}.sql`;
  a.click();
  window.URL.revokeObjectURL(url);
}

export function buildInsertQuery(
  columns: string[],
  rows: RowData[],
  tableName: string
): string {
  if (!rows.length) return '';

  const values = rows.map((row) => {
    const escapedValues = columns.map((col) => escapeSqlValue(row[col]));
    return `(${escapedValues.join(', ')})`;
  });

  return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES\n${values.join(',\n')};`;
}


export function formatCellValue(value: unknown) {
  if (value === null || value === undefined) {
    return { displayValue: 'NULL', cellClass: 'text-slate-400 dark:text-slate-500 italic' };
  }

  if (typeof value === 'object') {
    return { displayValue: JSON.stringify(value), cellClass: 'font-mono' };
  }

  return { displayValue: String(value), cellClass: '' };
}

export function getRowCountText(totalCount: number | undefined, currentRows: number) {
  const total = totalCount !== undefined && totalCount >= 0 ? ` / ${totalCount}` : '';
  const plural = (totalCount !== undefined && totalCount !== 1) || currentRows !== 1 ? 's' : '';
  return `${currentRows}${total} row${plural}`;
}

type EmptyResultFeedback = {
  title: string;
  detail?: string;
};

function stripSqlComments(query: string) {
  const withoutBlock = query.replace(/\/\*[\s\S]*?\*\//g, ' ');
  return withoutBlock.replace(/--.*$/gm, ' ');
}

function getFirstStatement(query: string) {
  const cleaned = stripSqlComments(query);
  const statements = cleaned
    .split(/;+/)
    .map((statement) => statement.trim())
    .filter(Boolean);
  return statements[0] ?? '';
}

function formatRowCount(rowCount: number) {
  return `${rowCount} row${rowCount !== 1 ? 's' : ''} affected`;
}

function extractRefreshedMaterializedView(statement: string) {
  const remainder = statement.replace(/^REFRESH\s+MATERIALIZED\s+VIEW\s+/i, '');
  const withoutConcurrent = remainder.replace(/^\s*CONCURRENTLY\s+/i, '');
  const withoutWith = withoutConcurrent.split(/\s+WITH\s+/i)[0] ?? '';
  const cleaned = withoutWith.replace(/;$/, '').trim();
  return cleaned || null;
}

export function getEmptyResultFeedback(
  query?: string,
  rowCount: number = 0
): EmptyResultFeedback | null {
  if (!query) return null;
  const statement = getFirstStatement(query);
  if (!statement) return null;
  const upperStatement = statement.trim().toUpperCase();

  if (upperStatement.startsWith('UPDATE')) {
    return { title: 'Update executed successfully', detail: formatRowCount(rowCount) };
  }

  if (upperStatement.startsWith('DELETE')) {
    return { title: 'Delete executed successfully', detail: formatRowCount(rowCount) };
  }

  if (/^REFRESH\s+MATERIALIZED\s+VIEW\b/.test(upperStatement)) {
    const viewName = extractRefreshedMaterializedView(statement);
    return {
      title: 'Materialized view refreshed successfully',
      detail: viewName ? `View: ${viewName}` : undefined,
    };
  }

  return null;
}

export function parseInsertStatements(sqlContent: string): string[] {
  // Remove comments (-- and /* */)
  let cleaned = sqlContent.replace(/--.*$/gm, '');
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Split by semicolon and filter out empty lines
  const statements = cleaned
    .split(';')
    .map((stmt) => stmt.trim())
    .filter((stmt) => stmt.length > 0 && stmt.toUpperCase().startsWith('INSERT'));
  
  return statements;
}
