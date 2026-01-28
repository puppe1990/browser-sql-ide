'use client';

import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type CompareKeyModalProps = {
  open: boolean;
  compareKeys: string[];
  commonColumns: string[];
  onCompareKeyChange: (value: string[]) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function CompareKeyModal({
  open,
  compareKeys,
  commonColumns,
  onCompareKeyChange,
  onCancel,
  onConfirm,
}: CompareKeyModalProps) {
  if (!open) return null;

  const [searchValue, setSearchValue] = useState('');
  useEffect(() => {
    if (open) {
      setSearchValue('');
    }
  }, [open]);

  const filteredColumns = useMemo(() => {
    if (!searchValue.trim()) return commonColumns;
    const normalized = searchValue.trim().toLowerCase();
    return commonColumns.filter((col) => col.toLowerCase().includes(normalized));
  }, [commonColumns, searchValue]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            Select Compare Keys
          </h3>
          <button
            onClick={onCancel}
            className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Choose one or more columns to compare by (order defines priority):
          </label>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search keys"
            className="mb-2 w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="max-h-64 overflow-y-auto border border-slate-300 dark:border-slate-600 rounded-lg p-2 space-y-2">
            {filteredColumns.map((col) => (
              <label key={col} className="flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 p-2 rounded">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={compareKeys.includes(col)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onCompareKeyChange([...compareKeys, col]);
                      } else {
                        onCompareKeyChange(compareKeys.filter((key) => key !== col));
                      }
                    }}
                    className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{col}</span>
                </div>
                {compareKeys.includes(col) && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    #{compareKeys.indexOf(col) + 1}
                  </span>
                )}
              </label>
            ))}
            {commonColumns.length === 0 && (
              <p className="text-xs text-red-500 p-2">
                No common columns found between the two results.
              </p>
            )}
            {commonColumns.length > 0 && filteredColumns.length === 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400 p-2">
                No keys match your search.
              </p>
            )}
          </div>
          {compareKeys.length > 0 && (
            <div className="mt-3">
              <div className="text-xs font-medium text-slate-600 dark:text-slate-300">Priority order:</div>
              <div className="flex flex-wrap gap-2 mt-2">
                {compareKeys.map((key, index) => (
                  <span key={key} className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                    {index + 1}. {key}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => onCompareKeyChange([])}
                className="mt-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                Clear selection
              </button>
            </div>
          )}
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={compareKeys.length === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Compare
          </button>
        </div>
      </div>
    </div>
  );
}
