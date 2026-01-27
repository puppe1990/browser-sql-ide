'use client';

import { Database, Edit, Star, TestTube, Trash2 } from 'lucide-react';
import type { Connection } from '../types';

type ConnectionListProps = {
  connections: Connection[];
  selectedConnectionId?: number;
  defaultConnectionId: number | null;
  testingId: number | null;
  onSelect: (connection: Connection) => void;
  onSetDefault: (connectionId: number) => void;
  onTest: (connection: Connection) => void;
  onEdit: (connection: Connection) => void;
  onDelete: (connectionId: number) => void;
};

export default function ConnectionList({
  connections,
  selectedConnectionId,
  defaultConnectionId,
  testingId,
  onSelect,
  onSetDefault,
  onTest,
  onEdit,
  onDelete,
}: ConnectionListProps) {
  return (
    <div className="flex-1 overflow-auto p-2 space-y-1">
      {connections.length === 0 ? (
        <div className="text-center py-12 px-4">
          <Database className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No connections yet
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Create your first connection
          </p>
        </div>
      ) : (
        connections.map((connection) => (
          <div
            key={connection.id}
            className={`group relative p-3 rounded-lg cursor-pointer transition-all ${
              selectedConnectionId === connection.id
                ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'
            }`}
            onClick={() => onSelect(connection)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {connection.name}
                  </h3>
                  {defaultConnectionId === connection.id && (
                    <span className="text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 px-1.5 py-0.5 rounded-full flex-shrink-0">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono truncate">
                  {connection.type}://{connection.username}@{connection.host}:{connection.port}/{connection.database}
                </p>
              </div>
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetDefault(connection.id);
                  }}
                  className={`p-1.5 rounded transition-colors ${
                    defaultConnectionId === connection.id
                      ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                  title={
                    defaultConnectionId === connection.id
                      ? 'Unset default connection'
                      : 'Set as default connection'
                  }
                >
                  <Star
                    className="w-3.5 h-3.5"
                    fill={defaultConnectionId === connection.id ? 'currentColor' : 'none'}
                  />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTest(connection);
                  }}
                  disabled={testingId === connection.id}
                  className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors disabled:opacity-50"
                  title="Test Connection"
                >
                  <TestTube
                    className={`w-3.5 h-3.5 ${testingId === connection.id ? 'animate-spin' : ''}`}
                  />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(connection);
                  }}
                  className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                  title="Edit Connection"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(connection.id);
                  }}
                  className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  title="Delete Connection"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
