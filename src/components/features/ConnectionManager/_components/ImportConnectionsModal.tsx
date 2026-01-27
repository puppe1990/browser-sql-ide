'use client';

import { X } from 'lucide-react';
import type { ChangeEvent } from 'react';

type ImportConnectionsModalProps = {
  open: boolean;
  importJson: string;
  onImportJsonChange: (value: string) => void;
  onFileSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  onCancel: () => void;
  onImport: () => void;
};

export default function ImportConnectionsModal({
  open,
  importJson,
  onImportJsonChange,
  onFileSelect,
  onCancel,
  onImport,
}: ImportConnectionsModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">
            Import Connections from JSON
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select JSON file
            </label>
            <input
              type="file"
              accept=".json"
              onChange={onFileSelect}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Or paste JSON data
            </label>
            <textarea
              value={importJson}
              onChange={(e) => onImportJsonChange(e.target.value)}
              placeholder={`[\n  {\n    "name": "My Database",\n    "type": "postgresql",\n    "host": "localhost",\n    "port": 5432,\n    "database": "mydb",\n    "username": "user",\n    "password": "password",\n    "ssl": false\n  }\n]`}
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> Passwords in exported JSON files are not included for security.
              You may need to add passwords manually to the JSON before importing, or update them after import.
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onImport}
              disabled={!importJson.trim()}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
