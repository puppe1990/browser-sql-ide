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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">No data to display</p>
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden ${
        expanded ? 'fixed inset-4 z-50' : ''
      }`}
    >
      <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            Query Results
          </h3>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {result.rowCount} row{result.rowCount !== 1 ? 's' : ''} • {result.executionTime}ms
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title={expanded ? 'Minimize' : 'Maximize'}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={exportToCSV}
            className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Export to CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="overflow-auto" style={{ maxHeight: expanded ? 'calc(100vh - 120px)' : '600px' }}>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900">
              {result.columns.map((column) => (
                <th
                  key={column}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-gray-50 dark:bg-gray-900"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {result.rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {result.columns.map((column) => {
                  const value = row[column];
                  let displayValue: string;
                  let cellClass = 'px-4 py-3 text-sm text-gray-900 dark:text-gray-100';

                  if (value === null || value === undefined) {
                    displayValue = 'NULL';
                    cellClass += ' text-gray-400 italic';
                  } else if (typeof value === 'object') {
                    displayValue = JSON.stringify(value);
                    cellClass += ' font-mono text-xs';
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
