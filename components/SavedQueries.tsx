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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Saved Queries
        </h2>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          New
        </button>
      </div>

      <div className="flex-1 overflow-auto space-y-4">
        {Object.keys(groupedQueries).length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No saved queries yet.
          </p>
        ) : (
          Object.entries(groupedQueries).map(([folder, folderQueries]) => (
            <div key={folder}>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Folder className="w-4 h-4" />
                {folder}
              </h3>
              <div className="space-y-1">
                {folderQueries.map((query) => (
                  <div
                    key={query.id}
                    className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-800 dark:text-white text-sm">
                        {query.name}
                      </h4>
                      <div className="flex gap-1">
                        {onQueryExecute && (
                          <button
                            onClick={() => onQueryExecute(query.query)}
                            className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                            title="Execute Query"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onQuerySelect(query.query)}
                          className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                          title="Load Query"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleEdit(query)}
                          className="p-1 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                          title="Edit Query"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(query.id)}
                          className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          title="Delete Query"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {query.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                        {query.description}
                      </p>
                    )}
                    <pre className="text-xs text-gray-500 dark:text-gray-500 bg-gray-50 dark:bg-gray-900 p-2 rounded mt-2 overflow-x-auto">
                      {query.query.substring(0, 100)}
                      {query.query.length > 100 ? '...' : ''}
                    </pre>
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
