'use client';

import { X } from 'lucide-react';

type CompareKeyModalProps = {
  open: boolean;
  compareKey: string;
  commonColumns: string[];
  onCompareKeyChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function CompareKeyModal({
  open,
  compareKey,
  commonColumns,
  onCompareKeyChange,
  onCancel,
  onConfirm,
}: CompareKeyModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            Select Compare Key
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
            Choose a column to compare by:
          </label>
          <select
            value={compareKey}
            onChange={(e) => onCompareKeyChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
          >
            <option value="">-- Select Column --</option>
            {commonColumns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
          {commonColumns.length === 0 && (
            <p className="text-xs text-red-500 mt-2">
              No common columns found between the two results.
            </p>
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
            disabled={!compareKey}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Compare
          </button>
        </div>
      </div>
    </div>
  );
}
