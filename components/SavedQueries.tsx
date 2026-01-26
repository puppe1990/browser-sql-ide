'use client';

import { useState, useEffect } from 'react';
import { Folder, FileText, Edit, Trash2, Play, X, Plus } from 'lucide-react';

interface SavedQuery {
  id: number;
  connection_id: number | null;
  name: string;
  query: string;
  description: string | null;
  folder: string | null;
  created_at: string;
  updated_at: string;
}

interface SavedQueriesProps {
  connectionId?: number;
  onQuerySelect: (query: string) => void;
  onQueryExecute?: (query: string) => void;
}

export default function SavedQueries({
  connectionId,
  onQuerySelect,
  onQueryExecute,
}: SavedQueriesProps) {
  const [queries, setQueries] = useState<SavedQuery[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingQuery, setEditingQuery] = useState<SavedQuery | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    query: '',
    description: '',
    folder: '',
  });

  useEffect(() => {
    loadQueries();
  }, [connectionId]);

  const loadQueries = async () => {
    try {
      const url = connectionId
        ? `/api/queries?connectionId=${connectionId}`
        : '/api/queries';
      const response = await fetch(url);
      const data = await response.json();
      setQueries(data.queries || []);
    } catch (error) {
      console.error('Failed to load queries:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingQuery ? `/api/queries/${editingQuery.id}` : '/api/queries';
      const method = editingQuery ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          connectionId: connectionId || null,
        }),
      });

      if (response.ok) {
        await loadQueries();
        setShowModal(false);
        resetForm();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save query');
      }
    } catch (error) {
      console.error('Failed to save query:', error);
      alert('Failed to save query');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this query?')) return;

    try {
      const response = await fetch(`/api/queries/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadQueries();
      } else {
        alert('Failed to delete query');
      }
    } catch (error) {
      console.error('Failed to delete query:', error);
      alert('Failed to delete query');
    }
  };

  const handleEdit = (query: SavedQuery) => {
    setEditingQuery(query);
    setFormData({
      name: query.name,
      query: query.query,
      description: query.description || '',
      folder: query.folder || '',
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      query: '',
      description: '',
      folder: '',
    });
    setEditingQuery(null);
  };

  const groupedQueries = queries.reduce((acc, query) => {
    const folder = query.folder || 'Uncategorized';
    if (!acc[folder]) {
      acc[folder] = [];
    }
    acc[folder].push(query);
    return acc;
  }, {} as Record<string, SavedQuery[]>);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900">
      <div className="flex justify-between items-center px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Saved Queries
        </h2>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          New
        </button>
      </div>

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
                          onClick={() => handleEdit(query)}
                          className="p-1 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                          title="Edit Query"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(query.id)}
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

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                {editingQuery ? 'Edit Query' : 'New Query'}
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
                  Query
                </label>
                <textarea
                  required
                  value={formData.query}
                  onChange={(e) =>
                    setFormData({ ...formData, query: e.target.value })
                  }
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Folder (optional)
                </label>
                <input
                  type="text"
                  value={formData.folder}
                  onChange={(e) =>
                    setFormData({ ...formData, folder: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Reports, Analytics"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                >
                  {editingQuery ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
