'use client';

import type { QueryResult } from '@/types';

type EditorFooterProps = {
  error: string | null;
  errorLine: number | null;
  result: QueryResult | null;
};

export default function EditorFooter({ error, errorLine, result }: EditorFooterProps) {
  if (!error && !result) return null;

  return (
    <div className="border-t border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-900">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2">
          <p className="text-red-800 dark:text-red-200 text-xs font-semibold">Error:</p>
          <p className="text-red-700 dark:text-red-300 text-xs mt-1">
            {error}
            {errorLine && (
              <span className="block mt-1 text-red-600 dark:text-red-400 font-medium">
                → Line {errorLine}
              </span>
            )}
          </p>
        </div>
      )}
      {result && (
        <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-400">
          <span>
            {result.rowCount} row{result.rowCount !== 1 ? 's' : ''} returned
          </span>
          <span>Execution time: {result.executionTime}ms</span>
        </div>
      )}
    </div>
  );
}
