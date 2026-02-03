'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Download, Plus, Upload } from 'lucide-react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { getErrorMessage } from '@/lib/utils';
import ConnectionFormModal from './_components/ConnectionFormModal';
import ConnectionList from './_components/ConnectionList';
import ImportConnectionsModal from './_components/ImportConnectionsModal';
import type { Connection, ConnectionFormData, TestResult } from './types';

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
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; connectionId: number | null }>({
    open: false,
    connectionId: null,
  });
  const [testing, setTesting] = useState<number | null>(null);
  const [testingForm, setTestingForm] = useState(false);
  const [testResult, setTestResult] = useState<TestResult>(null);
  const [importJson, setImportJson] = useState('');
  const [formData, setFormData] = useState<ConnectionFormData>({
    name: '',
    type: 'postgresql',
    host: '',
    port: 5432,
    database: '',
    username: '',
    password: '',
    ssl: false,
    color: '#3b82f6',
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

  const handleSubmit = async (e: FormEvent) => {
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

  const requestDelete = (id: number) => {
    setDeleteConfirm({ open: true, connectionId: id });
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirm({ open: false, connectionId: null });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.connectionId) {
      closeDeleteConfirm();
      return;
    }

    const id = deleteConfirm.connectionId;
    closeDeleteConfirm();
    await handleDelete(id);
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
      color: connection.color ?? '#3b82f6',
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
      color: '#3b82f6',
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
      color: conn.color ?? undefined,
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

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
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
              color: conn.color,
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

      <ConnectionList
        connections={connections}
        selectedConnectionId={selectedConnectionId}
        defaultConnectionId={defaultConnectionId}
        testingId={testing}
        onSelect={onConnectionSelect}
        onSetDefault={handleSetDefault}
        onTest={handleTest}
        onEdit={handleEdit}
        onDelete={requestDelete}
      />

      <ConnectionFormModal
        open={showModal}
        editingConnection={editingConnection}
        formData={formData}
        testingForm={testingForm}
        testResult={testResult}
        onChange={setFormData}
        onSubmit={handleSubmit}
        onTest={handleTestForm}
        onClose={() => {
          setShowModal(false);
          resetForm();
          setTestResult(null);
        }}
      />

      <ImportConnectionsModal
        open={showImportModal}
        importJson={importJson}
        onImportJsonChange={setImportJson}
        onFileSelect={handleFileSelect}
        onCancel={() => {
          setShowImportModal(false);
          setImportJson('');
        }}
        onImport={handleImport}
      />

      <ConfirmModal
        open={deleteConfirm.open}
        title="Delete connection?"
        message="This connection will be permanently removed. Are you sure you want to continue?"
        confirmLabel="Delete connection"
        confirmTone="danger"
        onCancel={closeDeleteConfirm}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
