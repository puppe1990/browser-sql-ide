'use client';

import { useState } from 'react';
import { Download, Maximize2 } from 'lucide-react';

interface QueryResult {
  columns: string[];
  rows: any[];
  rowCount: number;
  executionTime: number;
}

interface DataVisualizationProps {
  result: QueryResult;
}

export default function DataVisualization({ result }: DataVisualizationProps) {
  const [expanded, setExpanded] = useState(false);

  const exportToCSV = () => {
    if (!result.rows.length) return;

    const headers = result.columns.join(',');
    const rows = result.rows.map((row) =>
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

  if (!result || !result.rows || result.rows.length === 0) {
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
            {result.rowCount} row{result.rowCount !== 1 ? 's' : ''} • {result.executionTime}ms
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
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50">
              {result.columns.map((column) => (
                <th
                  key={column}
                  className="px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-slate-50 dark:bg-slate-800/50 z-10"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
            {result.rows.map((row, rowIndex) => (
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
      </div>
    </div>
  );
}
