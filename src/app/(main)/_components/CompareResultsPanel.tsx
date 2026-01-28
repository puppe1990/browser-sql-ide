'use client';

import { useMemo, useState } from 'react';
import { Download, RefreshCw, X } from 'lucide-react';
import type { ComparisonResult } from '@/types';

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

type CompareResultsPanelProps = {
  height: number;
  compareKey: string;
  compareFields: string[];
  comparedResults: ComparisonResult[];
  isReExecuting: boolean;
  onExport: () => void;
  onReExecute: () => void;
  onSelectFields: () => void;
  onClose: () => void;
};

export default function CompareResultsPanel({
  height,
  compareKey,
  compareFields,
  comparedResults,
  isReExecuting,
  onExport,
  onReExecute,
  onSelectFields,
  onClose,
}: CompareResultsPanelProps) {
  const [fieldMatchFilter, setFieldMatchFilter] = useState<'all' | 'match' | 'not-match'>('all');

  const filteredResults = useMemo(() => {
    if (compareFields.length === 0 || fieldMatchFilter === 'all') {
      return comparedResults;
    }

    const isRowFieldMatch = (item: ComparisonResult) =>
      compareFields.every((field) => item.fieldComparisons?.[field]?.match === true);
    const isRowFieldNotMatch = (item: ComparisonResult) =>
      compareFields.some((field) => !item.fieldComparisons?.[field]?.match);

    return comparedResults.filter((item) => (
      fieldMatchFilter === 'match' ? isRowFieldMatch(item) : isRowFieldNotMatch(item)
    ));
  }, [compareFields, comparedResults, fieldMatchFilter]);

  const filteredCounts = useMemo(() => ({
    match: filteredResults.filter((r) => r.status === 'match').length,
    leftOnly: filteredResults.filter((r) => r.status === 'left-only').length,
    rightOnly: filteredResults.filter((r) => r.status === 'right-only').length,
  }), [filteredResults]);

  return (
    <div className="flex flex-col overflow-auto" style={{ height: `${height}px`, minHeight: '200px', flexShrink: 0 }}>
      <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Comparison Results (Key: {compareKey})
            </h3>
            {compareFields.length > 0 && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Comparing: {compareFields.join(', ')}
              </span>
            )}
            {compareFields.length > 0 && (
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-500 dark:text-slate-400">Field filter:</span>
                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-0.5">
                  <button
                    onClick={() => setFieldMatchFilter('all')}
                    className={`px-2 py-0.5 rounded ${fieldMatchFilter === 'all' ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFieldMatchFilter('match')}
                    className={`px-2 py-0.5 rounded ${fieldMatchFilter === 'match' ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
                  >
                    Match
                  </button>
                  <button
                    onClick={() => setFieldMatchFilter('not-match')}
                    className={`px-2 py-0.5 rounded ${fieldMatchFilter === 'not-match' ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
                  >
                    Not Match
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onExport}
              className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors flex items-center gap-1"
              title="Export comparison results to CSV"
            >
              <Download className="w-3 h-3" />
              Export
            </button>
            <button
              onClick={onReExecute}
              disabled={isReExecuting}
              className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Re-execute both queries with same filters"
            >
              <RefreshCw className={`w-3 h-3 ${isReExecuting ? 'animate-spin' : ''}`} />
              {isReExecuting ? 'Executing...' : 'Re-execute'}
            </button>
            <button
              onClick={onSelectFields}
              className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              title="Select fields to compare"
            >
              {compareFields.length > 0 ? 'Change Fields' : 'Select Fields'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
              title="Close comparison results"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <div className="flex gap-4 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-green-500 rounded"></span>
                Match ({filteredCounts.match})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-blue-500 rounded"></span>
                Left Only ({filteredCounts.leftOnly})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-orange-500 rounded"></span>
                Right Only ({filteredCounts.rightOnly})
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-20">
            <tr className="bg-slate-50 dark:bg-slate-800">
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">Key Value</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">Status</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">Left Count</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">Right Count</th>
              {compareFields.length > 0 && compareFields.map((field) => (
                <th key={field} className="px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                  {field}
                  <br />
                  <span className="text-xs font-normal">(Left vs Right)</span>
                </th>
              ))}
              {compareFields.length === 0 && (
                <>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">Left Data</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">Right Data</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
            {filteredResults.map((item, idx: number) => (
              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-mono">{item.key || '(null)'}</td>
                <td className="px-3 py-2 text-xs">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    item.status === 'match' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                    item.status === 'left-only' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                    'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                  }`}>
                    {item.status === 'match' ? 'Match' : item.status === 'left-only' ? 'Left Only' : 'Right Only'}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-slate-900 dark:text-slate-100">{item.leftRows.length}</td>
                <td className="px-3 py-2 text-xs text-slate-900 dark:text-slate-100">{item.rightRows.length}</td>
                {compareFields.length > 0 ? (
                  compareFields.map((field) => {
                    const comparison = item.fieldComparisons?.[field];
                    if (!comparison) {
                      return (
                        <td key={field} className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500">
                          N/A
                        </td>
                      );
                    }
                    const isMatch = comparison.match;
                    const leftNumber = parseNumericValue(comparison.left);
                    const rightNumber = parseNumericValue(comparison.right);
                    const diff = leftNumber !== null && rightNumber !== null ? leftNumber - rightNumber : null;
                    return (
                      <td key={field} className="px-3 py-2 text-xs">
                        <div className={`p-2 rounded ${isMatch ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`w-2 h-2 rounded-full ${isMatch ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            <span className={`font-medium ${isMatch ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                              {isMatch ? 'Match' : 'Different'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-slate-500 dark:text-slate-400">Left:</span>
                              <div className="font-mono mt-0.5 break-all">
                                {String(comparison.left ?? 'NULL')}
                              </div>
                            </div>
                            <div>
                              <span className="text-slate-500 dark:text-slate-400">Right:</span>
                              <div className="font-mono mt-0.5 break-all">
                                {String(comparison.right ?? 'NULL')}
                              </div>
                            </div>
                          </div>
                          {diff !== null ? (
                            <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                              <span className="text-slate-500 dark:text-slate-400">Diff (L - R):</span>
                              <span className="font-mono ml-1">{String(diff)}</span>
                            </div>
                          ) : null}
                        </div>
                      </td>
                    );
                  })
                ) : (
                  <>
                    <td className="px-3 py-2 text-xs text-slate-900 dark:text-slate-100">
                      <pre className="max-w-xs truncate font-mono text-xs bg-slate-100 dark:bg-slate-800 p-1 rounded">
                        {JSON.stringify(item.leftRows[0] || {}, null, 2).substring(0, 100)}
                        {JSON.stringify(item.leftRows[0] || {}, null, 2).length > 100 ? '...' : ''}
                      </pre>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-900 dark:text-slate-100">
                      <pre className="max-w-xs truncate font-mono text-xs bg-slate-100 dark:bg-slate-800 p-1 rounded">
                        {JSON.stringify(item.rightRows[0] || {}, null, 2).substring(0, 100)}
                        {JSON.stringify(item.rightRows[0] || {}, null, 2).length > 100 ? '...' : ''}
                      </pre>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
