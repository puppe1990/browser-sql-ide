'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Download, Maximize2, Loader2, Database } from 'lucide-react';

interface QueryResult {
  columns: string[];
  rows: any[];
  rowCount: number;
  totalCount?: number;
  executionTime: number;
  hasMore?: boolean;
}

interface DataVisualizationProps {
  result: QueryResult;
  connectionId?: number;
  query?: string; // Original query for pagination
  isLoading?: boolean; // Loading state
}

export default function DataVisualization({ result, connectionId, query, isLoading = false }: DataVisualizationProps) {
  const [expanded, setExpanded] = useState(false);
  const [allRows, setAllRows] = useState(result.rows);
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

  const exportToCSV = () => {
    if (!allRows.length) return;

    const headers = result.columns.join(',');
    const rows = allRows.map((row) =>
      result.columns.map((col) => {
        const value = row[col];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value).replace(/"/g, '""');
      }).join(',')
    );

    const csv = [headers, ...rows.map((r) => r)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_result_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Extract table name from SELECT query (simple heuristic)
  const extractTableName = (query?: string): string => {
    if (!query) return 'table_name';
    
    const upperQuery = query.trim().toUpperCase();
    if (!upperQuery.startsWith('SELECT')) return 'table_name';
    
    // Try to find FROM clause
    const fromMatch = query.match(/\bFROM\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
    if (fromMatch && fromMatch[1]) {
      return fromMatch[1];
    }
    
    // Try to find table name after FROM with schema.table format
    const schemaTableMatch = query.match(/\bFROM\s+([a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*)/i);
    if (schemaTableMatch && schemaTableMatch[1]) {
      return schemaTableMatch[1];
    }
    
    return 'table_name';
  };

  // Escape SQL string value
  const escapeSqlValue = (value: any): string => {
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
      // Convert objects/arrays to JSON string
      const jsonStr = JSON.stringify(value);
      return `'${jsonStr.replace(/'/g, "''")}'`;
    }
    
    // Escape single quotes in strings
    const str = String(value);
    return `'${str.replace(/'/g, "''")}'`;
  };

  const exportToInserts = () => {
    if (!allRows.length) return;

    const tableName = extractTableName(query);
    const columns = result.columns;
    const inserts: string[] = [];

    allRows.forEach((row) => {
      const values = columns.map((col) => escapeSqlValue(row[col]));
      const insert = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});`;
      inserts.push(insert);
    });

    const sqlContent = inserts.join('\n');
    const blob = new Blob([sqlContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inserts_${tableName}_${Date.now()}.sql`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

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
      <div className="flex justify-between items-center px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
            Query Results
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {allRows.length}
            {totalCount !== undefined && totalCount >= 0 && ` / ${totalCount}`} row
            {(totalCount !== undefined && totalCount !== 1) || allRows.length !== 1 ? 's' : ''} • {result.executionTime}ms
          </span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
            title={expanded ? 'Minimize' : 'Maximize'}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={exportToCSV}
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
            title="Export to CSV"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={exportToInserts}
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
            title="Export as INSERT statements"
          >
            <Database className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-auto relative"
      >
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-20">
            <tr className="bg-slate-50 dark:bg-slate-800">
              {result.columns.map((column) => (
                <th
                  key={column}
                  className="px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800 relative z-0">
            {allRows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                {result.columns.map((column) => {
                  const value = row[column];
                  let displayValue: string;
                  let cellClass = 'px-3 py-2 text-xs text-slate-900 dark:text-slate-100';

                  if (value === null || value === undefined) {
                    displayValue = 'NULL';
                    cellClass += ' text-slate-400 dark:text-slate-500 italic';
                  } else if (typeof value === 'object') {
                    displayValue = JSON.stringify(value);
                    cellClass += ' font-mono';
                  } else {
                    displayValue = String(value);
                  }

                  return (
                    <td key={column} className={cellClass}>
                      <div className="max-w-xs truncate" title={displayValue}>
                        {displayValue}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {isLoadingMore && (
          <div className="flex justify-center items-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-slate-500 dark:text-slate-400" />
            <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">Loading more...</span>
          </div>
        )}
        {!hasMore && allRows.length > 0 && (
          <div className="flex justify-center items-center py-4">
            <span className="text-xs text-slate-500 dark:text-slate-400">No more data to load</span>
          </div>
        )}
      </div>
    </div>
  );
}
