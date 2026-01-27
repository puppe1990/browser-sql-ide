'use client';

import { FileText, Plus } from 'lucide-react';

type SavedQueriesHeaderProps = {
  onNew: () => void;
};

export default function SavedQueriesHeader({ onNew }: SavedQueriesHeaderProps) {
  return (
    <div className="flex justify-between items-center px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-2">
        <FileText className="w-4 h-4" />
        Saved Queries
      </h2>
      <button
        onClick={onNew}
        className="px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors flex items-center gap-1.5"
      >
        <Plus className="w-3.5 h-3.5" />
        New
      </button>
    </div>
  );
}
