'use client';

import { X } from 'lucide-react';

type CompareFieldsModalProps = {
  open: boolean;
  compareKey: string;
  commonColumns: string[];
  compareFields: string[];
  onToggleField: (field: string, checked: boolean) => void;
  onSkip: () => void;
  onDone: () => void;
  onClose: () => void;
};

export default function CompareFieldsModal({
  open,
  compareKey,
  commonColumns,
  compareFields,
  onToggleField,
  onSkip,
  onDone,
  onClose,
}: CompareFieldsModalProps) {
  if (!open) return null;

  const selectableColumns = commonColumns.filter((col) => col !== compareKey);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            Select Fields to Compare
          </h3>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Choose fields to compare values (for matching keys):
          </label>
          <div className="max-h-60 overflow-y-auto border border-slate-300 dark:border-slate-600 rounded-lg p-2 space-y-2">
            {selectableColumns.map((col) => (
              <label key={col} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 p-2 rounded">
                <input
                  type="checkbox"
                  checked={compareFields.includes(col)}
                  onChange={(e) => onToggleField(col, e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">{col}</span>
              </label>
            ))}
            {selectableColumns.length === 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400 p-2">
                No other common columns available to compare.
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onSkip}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Skip
          </button>
          <button
            onClick={onDone}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
