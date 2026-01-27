'use client';

import { X } from 'lucide-react';
import type { FormEvent } from 'react';
import type { Connection } from '@/components/features/QueryEditor/types';

type InsertIntoConnectionModalProps = {
  open: boolean;
  connections: Connection[];
  selectedConnectionId?: number;
  tableName: string;
  rowCount: number;
  isSubmitting: boolean;
  onConnectionChange: (connectionId: number) => void;
  onTableNameChange: (tableName: string) => void;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
};

export default function InsertIntoConnectionModal({
  open,
  connections,
  selectedConnectionId,
  tableName,
  rowCount,
  isSubmitting,
  onConnectionChange,
  onTableNameChange,
  onSubmit,
  onClose,
}: InsertIntoConnectionModalProps) {
  if (!open) return null;

  const hasConnections = connections.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-xl max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">
            Insert Results Into Connection
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Target Connection
            </label>
            {hasConnections ? (
              <select
                value={selectedConnectionId ?? ''}
                onChange={(event) => onConnectionChange(parseInt(event.target.value, 10))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                {connections.map((connection) => (
                  <option key={connection.id} value={connection.id}>
                    {connection.name} ({connection.type})
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No connections available. Add a connection first.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Target Table
            </label>
            <input
              type="text"
              required
              value={tableName}
              onChange={(event) => onTableNameChange(event.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="schema.table or table_name"
            />
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Fetches all rows from the query and inserts them into the selected connection.
          </p>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!hasConnections || rowCount === 0 || isSubmitting}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Inserting...' : 'Insert'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
