import type { ComparisonResult, RowData } from '@/types';
import type { QueryResultWithMeta } from '../types';

type BuildComparedResultsParams = {
  compareMode: boolean;
  compareKeys: string[];
  compareFields: string[];
  queryResult: QueryResultWithMeta | null;
  queryResult2: QueryResultWithMeta | null;
  compareRows1: RowData[] | null;
  compareRows2: RowData[] | null;
  isComparingAllRows: boolean;
};

export function buildComparedResults({
  compareMode,
  compareKeys,
  compareFields,
  queryResult,
  queryResult2,
  compareRows1,
  compareRows2,
  isComparingAllRows,
}: BuildComparedResultsParams): ComparisonResult[] | null {
  if (!compareMode || compareKeys.length === 0 || !queryResult || !queryResult2 || isComparingAllRows) {
    return null;
  }

  const needsFullRows = Boolean(queryResult.hasMore || queryResult2.hasMore);
  if (needsFullRows && (compareRows1 === null || compareRows2 === null)) {
    return null;
  }

  const leftRows = compareRows1 ?? queryResult.rows;
  const rightRows = compareRows2 ?? queryResult2.rows;

  const result1Map = new Map<string, { keyValues: string[]; rows: RowData[] }>();
  const result2Map = new Map<string, { keyValues: string[]; rows: RowData[] }>();

  const buildKeyValues = (row: RowData) => compareKeys.map((key) => String(row[key] ?? ''));
  const addRowToMap = (
    target: Map<string, { keyValues: string[]; rows: RowData[] }>,
    keyValues: string[],
    row: RowData,
  ) => {
    const signature = JSON.stringify(keyValues);
    if (!target.has(signature)) {
      target.set(signature, { keyValues, rows: [] });
    }
    target.get(signature)?.rows.push(row);
  };

  leftRows.forEach((row: RowData) => {
    const keyValues = buildKeyValues(row);
    addRowToMap(result1Map, keyValues, row);
  });

  rightRows.forEach((row: RowData) => {
    const keyValues = buildKeyValues(row);
    addRowToMap(result2Map, keyValues, row);
  });

  const allKeys = new Set([...result1Map.keys(), ...result2Map.keys()]);

  const compared: ComparisonResult[] = [];
  allKeys.forEach((signature) => {
    const leftEntry = result1Map.get(signature);
    const rightEntry = result2Map.get(signature);
    const rows1 = (leftEntry?.rows || []) as RowData[];
    const rows2 = (rightEntry?.rows || []) as RowData[];
    const keyValues = leftEntry?.keyValues || rightEntry?.keyValues || [];
    const keyDisplay =
      compareKeys.length > 0
        ? compareKeys.map((key, idx) => `${key}=${keyValues[idx] ?? ''}`).join(' | ')
        : '';

    const fieldComparisons: ComparisonResult['fieldComparisons'] = {};
    if (compareFields.length > 0 && rows1.length > 0 && rows2.length > 0) {
      compareFields.forEach((field) => {
        const leftValue = rows1[0][field];
        const rightValue = rows2[0][field];
        fieldComparisons[field] = {
          left: leftValue,
          right: rightValue,
          match: String(leftValue ?? '') === String(rightValue ?? ''),
        };
      });
    }

    compared.push({
      key: keyDisplay,
      keyValues,
      leftRows: rows1,
      rightRows: rows2,
      status:
        rows1.length > 0 && rows2.length > 0
          ? 'match'
          : rows1.length > 0
            ? 'left-only'
            : 'right-only',
      fieldComparisons,
    });
  });

  return compared;
}
