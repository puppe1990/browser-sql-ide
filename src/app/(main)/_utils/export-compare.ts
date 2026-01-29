import type { ComparisonResult } from '@/types';
import type { QueryResultWithMeta } from '../types';

type ExportCompareParams = {
  comparedResults: ComparisonResult[];
  compareKeys: string[];
  compareFields: string[];
  queryResult: QueryResultWithMeta | null;
  queryResult2: QueryResultWithMeta | null;
};

export function exportComparedResultsToCsv({
  comparedResults,
  compareKeys,
  compareFields,
  queryResult,
  queryResult2,
}: ExportCompareParams) {
  const parseNumericValue = (value: unknown) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return null;
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  };

  const headers = [
    ...(compareKeys.length > 0 ? compareKeys.map((key) => `Key: ${key}`) : ['Key Value']),
    'Status',
    'Left Count',
    'Right Count',
  ];

  if (compareFields.length > 0) {
    compareFields.forEach((field) => {
      headers.push(`${field} (Left)`, `${field} (Right)`, `${field} (Match)`, `${field} (Diff)`);
    });
  } else {
    const allColumns = new Set<string>();
    if (queryResult && queryResult2) {
      queryResult.columns.forEach((col) => allColumns.add(col));
      queryResult2.columns.forEach((col) => allColumns.add(col));
    }
    allColumns.forEach((col) => {
      headers.push(`${col} (Left)`, `${col} (Right)`, `${col} (Diff)`);
    });
  }

  const rows = comparedResults.map((item) => {
    const row: string[] = [
      ...(compareKeys.length > 0
        ? item.keyValues.map((value) => String(value || '(null)'))
        : [String(item.key || '(null)')]),
      item.status,
      String(item.leftRows.length),
      String(item.rightRows.length),
    ];

    if (compareFields.length > 0) {
      compareFields.forEach((field) => {
        const comparison = item.fieldComparisons?.[field];
        if (comparison) {
          const leftValue = comparison.left ?? 'NULL';
          const rightValue = comparison.right ?? 'NULL';
          const match = comparison.match ? 'Yes' : 'No';
          const leftNumber = parseNumericValue(leftValue);
          const rightNumber = parseNumericValue(rightValue);
          const diff = leftNumber !== null && rightNumber !== null ? String(leftNumber - rightNumber) : 'N/A';
          row.push(
            String(leftValue).replace(/"/g, '""'),
            String(rightValue).replace(/"/g, '""'),
            match,
            diff,
          );
        } else {
          row.push('N/A', 'N/A', 'N/A', 'N/A');
        }
      });
    } else {
      const allColumns = new Set<string>();
      if (queryResult && queryResult2) {
        queryResult.columns.forEach((col) => allColumns.add(col));
        queryResult2.columns.forEach((col) => allColumns.add(col));
      }
      allColumns.forEach((col) => {
        const leftValue = item.leftRows[0]?.[col] ?? 'NULL';
        const rightValue = item.rightRows[0]?.[col] ?? 'NULL';
        const leftNumber = parseNumericValue(leftValue);
        const rightNumber = parseNumericValue(rightValue);
        const diff = leftNumber !== null && rightNumber !== null ? String(leftNumber - rightNumber) : 'N/A';
        row.push(
          String(leftValue).replace(/"/g, '""'),
          String(rightValue).replace(/"/g, '""'),
          diff,
        );
      });
    }

    return row;
  });

  const csvContent = [
    headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `comparison_${compareKeys.join('_') || 'keys'}_${Date.now()}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}
