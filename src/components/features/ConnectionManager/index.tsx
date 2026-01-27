'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Database, Plus, Edit, Trash2, TestTube, X, Upload, Download, Star } from 'lucide-react';
import { getErrorMessage } from '@/lib/utils';

interface Connection {
  id: number;
  name: string;
  type: string;
  host: string;
  port: number;
  database: string;
  username: string;
  ssl: boolean;
  created_at: string;
  updated_at: string;
}

interface ConnectionManagerProps {
  onConnectionSelect: (connection: Connection) => void;
  selectedConnectionId?: number;
}

const DEFAULT_CONNECTION_KEY = 'browser-sql-ide-default-connection';

export default function ConnectionManager({
  onConnectionSelect,
  selectedConnectionId,
}: ConnectionManagerProps) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [defaultConnectionId, setDefaultConnectionId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null);
  const [testing, setTesting] = useState<number | null>(null);
  const [testingForm, setTestingForm] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [importJson, setImportJson] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'postgresql',
    host: '',
    port: 5432,
    database: '',
    username: '',
    password: '',
    ssl: false,
  });

  const loadConnections = useCallback(async () => {
    try {
      const response = await fetch('/api/connections');
      const data = await response.json();
      const loadedConnections = data.connections || [];
      setConnections(loadedConnections);
      if (defaultConnectionId !== null) {
        const exists = loadedConnections.some((conn: Connection) => conn.id === defaultConnectionId);
        if (!exists) {
          localStorage.removeItem(DEFAULT_CONNECTION_KEY);
          setDefaultConnectionId(null);
          window.dispatchEvent(new CustomEvent('default-connection-updated'));
        }
      }
    } catch (error) {
      console.error('Failed to load connections:', error);
    }
  }, [defaultConnectionId]);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedDefaultId = localStorage.getItem(DEFAULT_CONNECTION_KEY);
    if (storedDefaultId) {
      const parsed = parseInt(storedDefaultId, 10);
      setDefaultConnectionId(Number.isFinite(parsed) ? parsed : null);
    }
  }, []);

  const handleSetDefault = (connectionId: number) => {
    if (typeof window === 'undefined') return;
    const isDefault = defaultConnectionId === connectionId;
    if (isDefault) {
      localStorage.removeItem(DEFAULT_CONNECTION_KEY);
      setDefaultConnectionId(null);
    } else {
      localStorage.setItem(DEFAULT_CONNECTION_KEY, String(connectionId));
      setDefaultConnectionId(connectionId);
    }
    window.dispatchEvent(new CustomEvent('default-connection-updated'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingConnection
        ? `/api/connections/${editingConnection.id}`
        : '/api/connections';
      const method = editingConnection ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await loadConnections();
        window.dispatchEvent(new CustomEvent('connections-updated'));
        setShowModal(false);
        resetForm();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save connection');
      }
    } catch (error) {
      console.error('Failed to save connection:', error);
      alert('Failed to save connection');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this connection?')) return;

    try {
      const response = await fetch(`/api/connections/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadConnections();
        window.dispatchEvent(new CustomEvent('connections-updated'));
      } else {
        alert('Failed to delete connection');
      }
    } catch (error) {
      console.error('Failed to delete connection:', error);
      alert('Failed to delete connection');
    }
  };

  const handleTest = async (connection: Connection) => {
    setTesting(connection.id);
    try {
      const response = await fetch(`/api/connections/${connection.id}/test`, {
        method: 'POST',
      });

      const data = await response.json();
      if (data.success) {
        alert('✅ Connection test successful!');
      } else {
        alert(`❌ Connection test failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error: unknown) {
      alert(`❌ Connection test failed: ${getErrorMessage(error) || 'Unknown error'}`);
    } finally {
      setTesting(null);
    }
  };

  const handleTestForm = async () => {
    // Validate required fields
    if (!formData.host || !formData.port || !formData.database || !formData.username || !formData.password) {
      setTestResult({ 
        success: false, 
        message: 'Please fill in all required fields (host, port, database, username, password)' 
      });
      return;
    }

    setTestingForm(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/connections/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        setTestResult({ success: true, message: data.message || 'Connection test successful!' });
      } else {
        setTestResult({ success: false, message: data.error || 'Connection test failed' });
      }
    } catch (error: unknown) {
      setTestResult({ success: false, message: getErrorMessage(error) || 'Connection test failed' });
    } finally {
      setTestingForm(false);
    }
  };

  const handleEdit = (connection: Connection) => {
    setEditingConnection(connection);
    setFormData({
      name: connection.name,
      type: connection.type,
      host: connection.host,
      port: connection.port,
      database: connection.database,
      username: connection.username,
      password: '', // Don't pre-fill password
      ssl: connection.ssl,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'postgresql',
      host: '',
      port: 5432,
      database: '',
      username: '',
      password: '',
      ssl: false,
    });
    setEditingConnection(null);
    setTestResult(null);
  };

  const handleExport = () => {
    const exportData = connections.map((conn) => ({
      name: conn.name,
      type: conn.type,
      host: conn.host,
      port: conn.port,
      database: conn.database,
      username: conn.username,
      ssl: conn.ssl,
      // Note: Passwords are not exported for security reasons
      // Users will need to re-enter passwords when importing
    }));

    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `database-connections-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportJson(content);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importJson.trim()) {
      alert('Please provide JSON data or select a file');
      return;
    }

    try {
      const connectionsToImport = JSON.parse(importJson);

      if (!Array.isArray(connectionsToImport)) {
        alert('Invalid JSON format. Expected an array of connections.');
        return;
      }

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const conn of connectionsToImport) {
        // Validate required fields
        if (!conn.name || !conn.host || !conn.port || !conn.database || !conn.username) {
          errors.push(`Connection "${conn.name || 'Unnamed'}" is missing required fields`);
          errorCount++;
          continue;
        }

        try {
          const response = await fetch('/api/connections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: conn.name,
              type: conn.type || 'postgresql',
              host: conn.host,
              port: conn.port,
              database: conn.database,
              username: conn.username,
              password: conn.password || '', // User will need to set password
              ssl: conn.ssl || false,
            }),
          });

          if (response.ok) {
            successCount++;
          } else {
            const error = await response.json();
            errors.push(`Failed to import "${conn.name}": ${error.error || 'Unknown error'}`);
            errorCount++;
          }
        } catch (error: unknown) {
          errors.push(`Failed to import "${conn.name}": ${getErrorMessage(error)}`);
          errorCount++;
        }
      }

      await loadConnections();
      window.dispatchEvent(new CustomEvent('connections-updated'));
      setShowImportModal(false);
      setImportJson('');

      let message = `Import completed: ${successCount} successful`;
      if (errorCount > 0) {
        message += `, ${errorCount} failed`;
        if (errors.length > 0) {
          message += '\n\nErrors:\n' + errors.slice(0, 5).join('\n');
          if (errors.length > 5) {
            message += `\n... and ${errors.length - 5} more errors`;
          }
        }
      }
      alert(message);
    } catch (error: unknown) {
      alert(`Failed to parse JSON: ${getErrorMessage(error)}`);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
            Connections
          </h2>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
            title="New Connection"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-1">
          <button
            onClick={handleExport}
            disabled={connections.length === 0}
            className="flex-1 px-2 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export connections to JSON"
          >
            <Download className="w-3.5 h-3.5 inline mr-1" />
            Export
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex-1 px-2 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
            title="Import connections from JSON"
          >
            <Upload className="w-3.5 h-3.5 inline mr-1" />
            Import
          </button>
        </div>
      </div>

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
              onClick={() => onConnectionSelect(connection)}
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
                      handleSetDefault(connection.id);
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
                      handleTest(connection);
                    }}
                    disabled={testing === connection.id}
                    className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors disabled:opacity-50"
                    title="Test Connection"
                  >
                    <TestTube
                      className={`w-3.5 h-3.5 ${testing === connection.id ? 'animate-spin' : ''}`}
                    />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(connection);
                    }}
                    className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                    title="Edit Connection"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(connection.id);
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

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                {editingConnection ? 'Edit Connection' : 'New Connection'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
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
                    onChange={(e) =>
                      setFormData({ ...formData, host: e.target.value })
                    }
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
                    onChange={(e) =>
                      setFormData({ ...formData, port: parseInt(e.target.value) })
                    }
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
                  onChange={(e) =>
                    setFormData({ ...formData, database: e.target.value })
                  }
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
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
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
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder={editingConnection ? 'Leave empty to keep current' : ''}
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="ssl"
                  checked={formData.ssl}
                  onChange={(e) =>
                    setFormData({ ...formData, ssl: e.target.checked })
                  }
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <label
                  htmlFor="ssl"
                  className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  Enable SSL
                </label>
              </div>

              {/* Test Connection Button and Result */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleTestForm}
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
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                    setTestResult(null);
                  }}
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
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                Import Connections from JSON
              </h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportJson('');
                }}
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
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Or paste JSON data
                </label>
                <textarea
                  value={importJson}
                  onChange={(e) => setImportJson(e.target.value)}
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
                  onClick={() => {
                    setShowImportModal(false);
                    setImportJson('');
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={!importJson.trim()}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
