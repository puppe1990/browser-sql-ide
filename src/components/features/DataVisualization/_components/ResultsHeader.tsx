'use client';

import { Database, Download, Maximize2 } from 'lucide-react';

type ResultsHeaderProps = {
  expanded: boolean;
  rowCountText: string;
  executionTime: number;
  onToggleExpand: () => void;
  onExportCsv: () => void;
  onExportSql: () => void;
};

export default function ResultsHeader({
  expanded,
  rowCountText,
  executionTime,
  onToggleExpand,
  onExportCsv,
  onExportSql,
}: ResultsHeaderProps) {
  return (
    <div className="flex justify-between items-center px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
          Query Results
        </h3>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {rowCountText} • {executionTime}ms
        </span>
      </div>
      <div className="flex gap-1">
        <button
          onClick={onToggleExpand}
          className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
          title={expanded ? 'Minimize' : 'Maximize'}
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onExportCsv}
          className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
          title="Export to CSV"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onExportSql}
          className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
          title="Export as INSERT statements"
        >
          <Database className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
