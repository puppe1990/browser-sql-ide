'use client';

import { Play, Save, Loader2 } from 'lucide-react';
import type { ChangeEvent } from 'react';
import type { Connection } from '../types';

type EditorHeaderProps = {
  connections: Connection[];
  selectedConnectionId?: number;
  isExecuting: boolean;
  canExecute: boolean;
  hasQuery: boolean;
  onConnectionChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  onSave: () => void;
  onExecute: () => void;
};

export default function EditorHeader({
  connections,
  selectedConnectionId,
  isExecuting,
  canExecute,
  hasQuery,
  onConnectionChange,
  onSave,
  onExecute,
}: EditorHeaderProps) {
  return (
    <div className="flex justify-between items-center px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
          Query Editor
        </h3>
        {connections.length > 0 && (
          <select
            value={selectedConnectionId || ''}
            onChange={onConnectionChange}
            className="text-xs px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          >
            {connections.map((conn) => (
              <option key={conn.id} value={conn.id}>
                {conn.name} ({conn.type})
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={!hasQuery}
          className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          <Save className="w-3.5 h-3.5" />
          Save
        </button>
        <button
          onClick={onExecute}
          disabled={isExecuting || !canExecute}
          className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          {isExecuting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          Execute
        </button>
      </div>
    </div>
  );
}
