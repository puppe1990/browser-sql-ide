'use client';

import { useState, useEffect, useCallback } from 'react';
import type { FormEvent } from 'react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import SavedQueriesHeader from './_components/SavedQueriesHeader';
import SavedQueriesList from './_components/SavedQueriesList';
import SavedQueryModal from './_components/SavedQueryModal';
import type { SavedQuery, SavedQueryFormData } from './types';
import { groupQueriesByFolder } from './utils';

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
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; queryId: number | null }>({
    open: false,
    queryId: null,
  });
  const [formData, setFormData] = useState<SavedQueryFormData>({
    name: '',
    query: '',
    description: '',
    folder: '',
  });

  const loadQueries = useCallback(async () => {
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
  }, [connectionId]);

  useEffect(() => {
    loadQueries();
  }, [loadQueries]);

  const handleSubmit = async (e: FormEvent) => {
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

  const requestDelete = (id: number) => {
    setDeleteConfirm({ open: true, queryId: id });
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirm({ open: false, queryId: null });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.queryId) {
      closeDeleteConfirm();
      return;
    }

    const id = deleteConfirm.queryId;
    closeDeleteConfirm();
    await handleDelete(id);
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

  const handleDuplicate = async (query: SavedQuery) => {
    try {
      // Create a new query with a modified name
      const duplicateName = `${query.name} (Copy)`;
      
      const response = await fetch('/api/queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: duplicateName,
          query: query.query,
          description: query.description || '',
          folder: query.folder || '',
          connectionId: query.connection_id || connectionId || null,
        }),
      });

      if (response.ok) {
        await loadQueries();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to duplicate query');
      }
    } catch (error) {
      console.error('Failed to duplicate query:', error);
      alert('Failed to duplicate query');
    }
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

  const groupedQueries = groupQueriesByFolder(queries);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900">
      <SavedQueriesHeader
        onNew={() => {
          resetForm();
          setShowModal(true);
        }}
      />

      <SavedQueriesList
        groupedQueries={groupedQueries}
        onQuerySelect={onQuerySelect}
        onQueryExecute={onQueryExecute}
        onEdit={handleEdit}
        onDuplicate={handleDuplicate}
        onDelete={requestDelete}
      />

      <SavedQueryModal
        open={showModal}
        editingQuery={editingQuery}
        formData={formData}
        onChange={setFormData}
        onSubmit={handleSubmit}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
      />

      <ConfirmModal
        open={deleteConfirm.open}
        title="Delete saved query?"
        message="This saved query will be permanently removed. Are you sure you want to continue?"
        confirmLabel="Delete query"
        confirmTone="danger"
        onCancel={closeDeleteConfirm}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
