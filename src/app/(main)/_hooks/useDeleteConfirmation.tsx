import { useState } from 'react';
import type { ReactNode } from 'react';
import { getDeleteConfirmationInfo } from '@/lib/query-utils';

export type DeleteConfirmState = {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  confirmTone: 'primary' | 'danger';
  onConfirm: (() => void | Promise<void>) | null;
};

export function useDeleteConfirmation() {
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({
    open: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    confirmTone: 'primary',
    onConfirm: null,
  });

  const closeDeleteConfirm = () => {
    setDeleteConfirm((prev) => ({ ...prev, open: false, onConfirm: null }));
  };

  const requestDeleteConfirmation = (
    queries: string[],
    onConfirm: () => void,
    connectionNames: string[] = [],
  ) => {
    const deleteInfo = getDeleteConfirmationInfo(queries.join(';\n'));
    if (!deleteInfo.hasDelete) return false;

    const uniqueNames = connectionNames
      .filter(Boolean)
      .filter((name, index, arr) => arr.indexOf(name) === index);
    const hasTables = deleteInfo.tableNames.length > 0;
    const tableLabel = deleteInfo.tableNames.length > 1 ? 'Tables' : 'Table';
    const tableText = deleteInfo.tableNames.join(', ');
    const message = uniqueNames.length > 0 || hasTables ? (
      <div>
        <div>{deleteInfo.message}</div>
        {hasTables && (
          <div className="mt-2 text-sm font-medium text-white">
            {tableLabel}: {tableText}
          </div>
        )}
        {uniqueNames.length > 0 && (
          <div className={`${hasTables ? 'mt-1' : 'mt-2'} text-sm font-medium text-white`}>
            Connection{uniqueNames.length > 1 ? 's' : ''}: {uniqueNames.join(', ')}
          </div>
        )}
      </div>
    ) : (
      deleteInfo.message
    );

    setDeleteConfirm({
      open: true,
      title: deleteInfo.title,
      message,
      confirmLabel: deleteInfo.hasDeleteWithoutWhere
        ? 'Yes, delete all rows'
        : 'Yes, run DELETE',
      confirmTone: 'danger',
      onConfirm,
    });

    return true;
  };

  return { deleteConfirm, closeDeleteConfirm, requestDeleteConfirmation };
}
