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

  const fromMatch = query.match(/\bFROM\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
  if (fromMatch && fromMatch[1]) {
    return fromMatch[1];
  }

  const schemaTableMatch = query.match(/\bFROM\s+([a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*)/i);
  if (schemaTableMatch && schemaTableMatch[1]) {
    return schemaTableMatch[1];
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
