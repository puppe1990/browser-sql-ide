import { useEffect, useMemo, useRef, useState } from 'react';
import type { ComparisonResult, RowData } from '@/types';
import { getErrorMessage } from '@/lib/utils';
import type { Connection, QueryResultWithMeta } from '../types';
import { resolveConnectionIds } from '../_utils/page-helpers';
import { buildComparedResults } from '../_utils/compare';
import { exportComparedResultsToCsv } from '../_utils/export-compare';

type PendingCompareRestore = {
  compareMode: boolean;
  compareKeys: string[];
  compareFields: string[];
};

type UseCompareParams = {
  queryResult: QueryResultWithMeta | null;
  queryResult2: QueryResultWithMeta | null;
  activeConnectionId1?: number;
  activeConnectionId2?: number;
  selectedConnection: Connection | null;
  isReExecuting: boolean;
  isLoadingResult1: boolean;
  isLoadingResult2: boolean;
  pendingCompareRestore: PendingCompareRestore | null;
  setPendingCompareRestore: (value: PendingCompareRestore | null) => void;
};

export function useCompare({
  queryResult,
  queryResult2,
  activeConnectionId1,
  activeConnectionId2,
  selectedConnection,
  isReExecuting,
  isLoadingResult1,
  isLoadingResult2,
  pendingCompareRestore,
  setPendingCompareRestore,
}: UseCompareParams) {
  const [compareMode, setCompareMode] = useState(false);
  const [compareKeys, setCompareKeys] = useState<string[]>([]);
  const [compareFields, setCompareFields] = useState<string[]>([]);
  const [compareRows1, setCompareRows1] = useState<RowData[] | null>(null);
  const [compareRows2, setCompareRows2] = useState<RowData[] | null>(null);
  const [isComparingAllRows, setIsComparingAllRows] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showCompareFieldsModal, setShowCompareFieldsModal] = useState(false);
  const [isExportingCompare, setIsExportingCompare] = useState(false);

  const previousResultsRef = useRef<{ left: QueryResultWithMeta | null; right: QueryResultWithMeta | null }>({
    left: null,
    right: null,
  });

  useEffect(() => {
    if (
      pendingCompareRestore &&
      queryResult &&
      queryResult2 &&
      !isReExecuting &&
      !isLoadingResult1 &&
      !isLoadingResult2
    ) {
      requestAnimationFrame(() => {
        setCompareMode(pendingCompareRestore.compareMode);
        setCompareKeys(pendingCompareRestore.compareKeys);
        setCompareFields(pendingCompareRestore.compareFields);
        setPendingCompareRestore(null);
      });
    }
  }, [
    pendingCompareRestore,
    queryResult,
    queryResult2,
    isReExecuting,
    isLoadingResult1,
    isLoadingResult2,
    setPendingCompareRestore,
  ]);

  useEffect(() => {
    const prev = previousResultsRef.current;
    const leftChanged = prev.left !== queryResult;
    const rightChanged = prev.right !== queryResult2;

    if (leftChanged) {
      setCompareRows1(null);
    }
    if (rightChanged) {
      setCompareRows2(null);
    }

    if ((leftChanged || rightChanged) && compareMode && !isReExecuting) {
      setCompareMode(false);
      setCompareKeys([]);
      setCompareFields([]);
    }

    previousResultsRef.current = { left: queryResult, right: queryResult2 };
  }, [compareMode, isReExecuting, queryResult, queryResult2]);

  const commonColumns = useMemo(() => {
    if (!queryResult || !queryResult2) return [];
    return queryResult.columns.filter((col) => queryResult2.columns.includes(col));
  }, [queryResult, queryResult2]);

  const fetchAllRowsForCompare = async (source: QueryResultWithMeta, connectionId: number) => {
    const baseRows = [...(source.rows || [])];
    if (!source.hasMore) return baseRows;
    if (!source.query) {
      throw new Error('Could not find query text to fetch all rows.');
    }

    let rows = [...baseRows];
    let offset = rows.length;
    let more = true;
    let safetyCounter = 0;

    while (more) {
      const response = await fetch('/api/query/paginate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId,
          query: source.query,
          offset,
          limit: 100,
        }),
      });

      const data = await response.json();
      if (!data.success || !data.result) {
        throw new Error(data.error || 'Failed to fetch all rows');
      }

      const newRows = data.result.rows || [];
      if (newRows.length === 0) {
        break;
      }

      rows = [...rows, ...newRows];
      offset += newRows.length;
      more = data.result.hasMore ?? false;

      safetyCounter += 1;
      if (safetyCounter > 10000) {
        throw new Error('Aborted fetching rows due to excessive pagination.');
      }
    }

    return rows;
  };

  useEffect(() => {
    if (!compareMode || compareKeys.length === 0 || !queryResult || !queryResult2) {
      setCompareRows1(null);
      setCompareRows2(null);
      setIsComparingAllRows(false);
      return;
    }

    let cancelled = false;
    const prepareCompareRows = async () => {
      setIsComparingAllRows(true);
      try {
        let connectionId1 = queryResult.connectionId ?? activeConnectionId1 ?? selectedConnection?.id;
        let connectionId2 = queryResult2.connectionId ?? activeConnectionId2 ?? selectedConnection?.id;
        if (!connectionId1 || !connectionId2) {
          const resolved = await resolveConnectionIds({
            activeConnectionId1,
            activeConnectionId2,
            selectedConnection,
          });
          if ('error' in resolved) {
            throw new Error(resolved.error);
          }
          connectionId1 = connectionId1 ?? resolved.connectionId1;
          connectionId2 = connectionId2 ?? resolved.connectionId2;
        }

        const [rows1, rows2] = await Promise.all([
          fetchAllRowsForCompare(queryResult, connectionId1),
          fetchAllRowsForCompare(queryResult2, connectionId2),
        ]);

        if (!cancelled) {
          setCompareRows1(rows1);
          setCompareRows2(rows2);
        }
      } catch (error: unknown) {
        if (!cancelled) {
          alert(getErrorMessage(error) || 'Failed to load all rows for compare');
        }
      } finally {
        if (!cancelled) {
          setIsComparingAllRows(false);
        }
      }
    };

    prepareCompareRows();
    return () => {
      cancelled = true;
    };
  }, [
    compareMode,
    compareKeys.length,
    queryResult,
    queryResult2,
    activeConnectionId1,
    activeConnectionId2,
    selectedConnection,
  ]);

  const comparedResults = useMemo<ComparisonResult[] | null>(() => {
    return buildComparedResults({
      compareMode,
      compareKeys,
      compareFields,
      queryResult,
      queryResult2,
      compareRows1,
      compareRows2,
      isComparingAllRows,
    });
  }, [
    compareMode,
    compareKeys,
    compareFields,
    queryResult,
    queryResult2,
    compareRows1,
    compareRows2,
    isComparingAllRows,
  ]);

  const handleExportCompare = async () => {
    if (!comparedResults || comparedResults.length === 0) {
      alert('No comparison results to export');
      return;
    }

    setIsExportingCompare(true);
    await new Promise((resolve) => setTimeout(resolve, 0));

    try {
      exportComparedResultsToCsv({
        comparedResults,
        compareKeys,
        compareFields,
        queryResult,
        queryResult2,
      });
    } finally {
      setIsExportingCompare(false);
    }
  };

  return {
    compareMode,
    setCompareMode,
    compareKeys,
    setCompareKeys,
    compareFields,
    setCompareFields,
    isComparingAllRows,
    showCompareModal,
    setShowCompareModal,
    showCompareFieldsModal,
    setShowCompareFieldsModal,
    commonColumns,
    comparedResults,
    isExportingCompare,
    handleExportCompare,
  };
}
