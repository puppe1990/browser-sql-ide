'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import type { QueryResult, RowData } from '@/types';
import ResultsHeader from './_components/ResultsHeader';
import ResultsTable from './_components/ResultsTable';
import {
  exportToCsv,
  exportToInsertStatements,
  getRowCountText,
} from './utils';

interface DataVisualizationProps {
  result: QueryResult;
  connectionId?: number;
  query?: string; // Original query for pagination
  isLoading?: boolean; // Loading state
}

export default function DataVisualization({ result, connectionId, query, isLoading = false }: DataVisualizationProps) {
  const [expanded, setExpanded] = useState(false);
  const [allRows, setAllRows] = useState<RowData[]>(result.rows);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(result.hasMore ?? false);
  const [totalCount, setTotalCount] = useState(result.totalCount);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentOffset = useRef(result.rows.length);

  // Update state when result prop changes
  useEffect(() => {
    setAllRows(result.rows);
    setHasMore(result.hasMore ?? false);
    setTotalCount(result.totalCount);
    currentOffset.current = result.rows.length;
  }, [result]);

  const loadMore = useCallback(async () => {
    if (!connectionId || !query || isLoadingMore || !hasMore) {
      return;
    }

    setIsLoadingMore(true);
    try {
      const response = await fetch('/api/query/paginate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId,
          query,
          offset: currentOffset.current,
          limit: 100,
        }),
      });

      const data = await response.json();

      if (data.success && data.result) {
        const newRows = data.result.rows || [];
        setAllRows((prev) => [...prev, ...newRows]);
        setHasMore(data.result.hasMore ?? false);
        setTotalCount(data.result.totalCount);
        currentOffset.current += newRows.length;
      }
    } catch (error) {
      console.error('Failed to load more data:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [connectionId, query, isLoadingMore, hasMore]);

  // Handle scroll to detect when user reaches bottom
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      // Load more when user is within 100px of the bottom
      if (scrollHeight - scrollTop - clientHeight < 100 && hasMore && !isLoadingMore) {
        loadMore();
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [hasMore, isLoadingMore, loadMore]);

  const rowCountText = getRowCountText(totalCount, allRows.length);

  // Show loading spinner
  if (isLoading) {
    return (
      <div className="h-full flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
        <div className="flex justify-between items-center px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              Query Results
            </h3>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">Loading results...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!result || !result.columns || result.columns.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-slate-900">
        <p className="text-slate-500 dark:text-slate-400 text-sm">No data to display</p>
      </div>
    );
  }

  return (
    <div
      className={`h-full flex flex-col bg-white dark:bg-slate-900 overflow-hidden ${
        expanded ? 'fixed inset-4 z-50' : ''
      }`}
    >
      <ResultsHeader
        expanded={expanded}
        rowCountText={rowCountText}
        executionTime={result.executionTime}
        onToggleExpand={() => setExpanded(!expanded)}
        onExportCsv={() => exportToCsv(result.columns, allRows)}
        onExportSql={() => exportToInsertStatements(result.columns, allRows, query)}
      />

      <div ref={scrollContainerRef} className="flex-1 overflow-auto relative">
        <ResultsTable
          columns={result.columns}
          rows={allRows}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
        />
      </div>
    </div>
  );
}
