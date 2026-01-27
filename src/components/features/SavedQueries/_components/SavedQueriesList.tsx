'use client';

import { Copy, Edit, FileText, Folder, Play, Trash2 } from 'lucide-react';
import type { SavedQuery } from '../types';

type SavedQueriesListProps = {
  groupedQueries: Record<string, SavedQuery[]>;
  onQuerySelect: (query: string) => void;
  onQueryExecute?: (query: string) => void;
  onEdit: (query: SavedQuery) => void;
  onDuplicate: (query: SavedQuery) => void;
  onDelete: (id: number) => void;
};

export default function SavedQueriesList({
  groupedQueries,
  onQuerySelect,
  onQueryExecute,
  onEdit,
  onDuplicate,
  onDelete,
}: SavedQueriesListProps) {
  return (
    <div className="flex-1 overflow-auto p-3 space-y-3">
      {Object.keys(groupedQueries).length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No saved queries yet
          </p>
        </div>
      ) : (
        Object.entries(groupedQueries).map(([folder, folderQueries]) => (
          <div key={folder}>
            <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
              <Folder className="w-3.5 h-3.5" />
              {folder}
            </h3>
            <div className="space-y-1.5">
              {folderQueries.map((query) => (
                <div
                  key={query.id}
                  className="group p-2.5 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-slate-900 dark:text-slate-100 text-sm truncate">
                        {query.name}
                      </h4>
                      {query.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          {query.description}
                        </p>
                      )}
                      <pre className="text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 p-1.5 rounded mt-1.5 overflow-x-auto font-mono">
                        {query.query.substring(0, 80)}
                        {query.query.length > 80 ? '...' : ''}
                      </pre>
                    </div>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onQueryExecute && (
                        <button
                          onClick={() => onQueryExecute(query.query)}
                          className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                          title="Execute Query"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => onQuerySelect(query.query)}
                        className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                        title="Load Query"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onEdit(query)}
                        className="p-1 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                        title="Edit Query"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDuplicate(query)}
                        className="p-1 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors"
                        title="Duplicate Query"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(query.id)}
                        className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Delete Query"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
