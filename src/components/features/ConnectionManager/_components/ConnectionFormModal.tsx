'use client';

import { TestTube, X } from 'lucide-react';
import type { FormEvent } from 'react';
import type { Connection, ConnectionFormData, TestResult } from '../types';

type ConnectionFormModalProps = {
  open: boolean;
  editingConnection: Connection | null;
  formData: ConnectionFormData;
  testingForm: boolean;
  testResult: TestResult;
  onChange: (next: ConnectionFormData) => void;
  onSubmit: (e: FormEvent) => void;
  onTest: () => void;
  onClose: () => void;
};

export default function ConnectionFormModal({
  open,
  editingConnection,
  formData,
  testingForm,
  testResult,
  onChange,
  onSubmit,
  onTest,
  onClose,
}: ConnectionFormModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">
            {editingConnection ? 'Edit Connection' : 'New Connection'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => onChange({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => onChange({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="postgresql">PostgreSQL</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Host
              </label>
              <input
                type="text"
                required
                value={formData.host}
                onChange={(e) => onChange({ ...formData, host: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Port
              </label>
              <input
                type="number"
                required
                value={formData.port}
                onChange={(e) => onChange({ ...formData, port: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Database
            </label>
            <input
              type="text"
              required
              value={formData.database}
              onChange={(e) => onChange({ ...formData, database: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Username
            </label>
            <input
              type="text"
              required
              value={formData.username}
              onChange={(e) => onChange({ ...formData, username: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <input
              type="password"
              required={!editingConnection}
              value={formData.password}
              onChange={(e) => onChange({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder={editingConnection ? 'Leave empty to keep current' : ''}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="ssl"
              checked={formData.ssl}
              onChange={(e) => onChange({ ...formData, ssl: e.target.checked })}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <label
              htmlFor="ssl"
              className="ml-2 text-sm text-gray-700 dark:text-gray-300"
            >
              Enable SSL
            </label>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={onTest}
              disabled={testingForm || !formData.host || !formData.port || !formData.database || !formData.username || !formData.password}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testingForm ? (
                <>
                  <TestTube className="w-4 h-4 animate-spin" />
                  Testing Connection...
                </>
              ) : (
                <>
                  <TestTube className="w-4 h-4" />
                  Test Connection
                </>
              )}
            </button>

            {testResult && (
              <div
                className={`p-3 rounded-lg ${
                  testResult.success
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                }`}
              >
                <p
                  className={`text-sm ${
                    testResult.success
                      ? 'text-green-800 dark:text-green-200'
                      : 'text-red-800 dark:text-red-200'
                  }`}
                >
                  {testResult.message}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
            >
              {editingConnection ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
