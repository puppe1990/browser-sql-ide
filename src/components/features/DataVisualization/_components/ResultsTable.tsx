'use client';

import { Loader2 } from 'lucide-react';
import type { QueryResult, RowData } from '@/types';
import { formatCellValue } from '../utils';

type ResultsTableProps = {
  columns: QueryResult['columns'];
  rows: RowData[];
  isLoadingMore: boolean;
  hasMore: boolean;
};

export default function ResultsTable({
  columns,
  rows,
  isLoadingMore,
  hasMore,
}: ResultsTableProps) {
  return (
    <div className="flex-1 overflow-auto relative">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 z-20">
          <tr className="bg-slate-50 dark:bg-slate-800">
            {columns.map((column) => (
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
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              {columns.map((column) => {
                const value = row[column];
                const { displayValue, cellClass } = formatCellValue(value);
                const className = `px-3 py-2 text-xs text-slate-900 dark:text-slate-100 ${cellClass}`.trim();

                return (
                  <td key={column} className={className}>
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
      {!hasMore && rows.length > 0 && (
        <div className="flex justify-center items-center py-4">
          <span className="text-xs text-slate-500 dark:text-slate-400">No more data to load</span>
        </div>
      )}
    </div>
  );
}
