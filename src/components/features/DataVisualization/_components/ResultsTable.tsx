'use client';

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import type { KeyboardEvent } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import type { QueryResult, RowData } from '@/types';
import { formatCellValue } from '../utils';

export type SelectedCell = {
  rowIndex: number;
  column: string;
  isNew: boolean;
};

export type DisplayRow = {
  id: string;
  rowIndex: number;
  isNew: boolean;
  data: RowData;
};

type ResultsTableProps = {
  columns: QueryResult['columns'];
  rows: DisplayRow[];
  isLoadingMore: boolean;
  hasMore: boolean;
  editMode: boolean;
  selectedCell: SelectedCell | null;
  editedCells: Record<number, RowData>;
  deletedRowIndices: number[];
  keyColumns: string[];
  onSelectCell: (cell: SelectedCell) => void;
  onCellChange: (cell: SelectedCell, value: unknown) => void;
  onToggleKeyColumn: (column: string) => void;
};

export default function ResultsTable({
  columns,
  rows,
  isLoadingMore,
  hasMore,
  editMode,
  selectedCell,
  editedCells,
  deletedRowIndices,
  keyColumns,
  onSelectCell,
  onCellChange,
  onToggleKeyColumn,
}: ResultsTableProps) {
  const [editingCell, setEditingCell] = useState<SelectedCell | null>(null);
  const [draftValue, setDraftValue] = useState('');
  const ignoreBlurRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const editModeRef = useRef(editMode);
  
  useEffect(() => {
    editModeRef.current = editMode;
  }, [editMode]);

  const deletedRowLookup = useMemo(() => new Set(deletedRowIndices), [deletedRowIndices]);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const startEditing = useCallback((cell: SelectedCell, value: unknown) => {
    if (!editModeRef.current) return;
    setEditingCell(cell);
    ignoreBlurRef.current = true;
    setTimeout(() => {
      ignoreBlurRef.current = false;
    }, 100);
    if (value === null || value === undefined) {
      setDraftValue('');
      return;
    }
    setDraftValue(typeof value === 'string' ? value : JSON.stringify(value));
  }, []);

  const commitEdit = useCallback(() => {
    if (!editingCell || ignoreBlurRef.current) return;
    onCellChange(editingCell, draftValue);
    setEditingCell(null);
  }, [editingCell, draftValue, onCellChange]);

  const cancelEdit = useCallback(() => {
    setEditingCell(null);
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (!editModeRef.current || !selectedCell) return;
    if (!selectedCell.isNew && deletedRowLookup.has(selectedCell.rowIndex)) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      const row = rows.find((item) => item.rowIndex === selectedCell.rowIndex && item.isNew === selectedCell.isNew);
      const value = row?.data?.[selectedCell.column];
      startEditing(selectedCell, value);
    }
    if (event.key === 'Escape') {
      cancelEdit();
    }
  }, [selectedCell, deletedRowLookup, rows, startEditing, cancelEdit]);

  return (
    <div
      className="flex-1 overflow-auto relative"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseDown={(event) => {
        event.currentTarget.focus();
      }}
    >
      <table className="w-full border-collapse">
        <thead className="sticky top-0 z-20">
          <tr className="bg-slate-50 dark:bg-slate-800">
            <th className="px-2 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 w-12">
              #
            </th>
            {columns.map((column) => (
              <th
                key={column}
                className="px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                <div className="flex items-center gap-2">
                  <span>{column}</span>
                  <button
                    type="button"
                    onClick={() => onToggleKeyColumn(column)}
                    className={`ml-auto inline-flex items-center justify-center rounded border text-[10px] px-1.5 py-0.5 transition-colors ${
                      keyColumns.includes(column)
                        ? 'border-amber-500/60 text-amber-700 bg-amber-100 dark:bg-amber-500/20 dark:text-amber-200'
                        : 'border-transparent text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
                    }`}
                    title={keyColumns.includes(column) ? 'Remover chave' : 'Marcar como chave'}
                  >
                    <KeyRound className="w-3 h-3" />
                  </button>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800 relative z-0">
          {rows.map((row, displayIndex) => {
            const rowIsDeleted = !row.isNew && deletedRowLookup.has(row.rowIndex);
            return (
            <tr
              key={row.id}
              className={`transition-colors ${
                rowIsDeleted
                  ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <td
                className={`px-2 py-2 text-xs text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800 ${
                  row.isNew ? 'italic' : ''
                }`}
              >
                {row.isNew ? `+${row.rowIndex + 1}` : displayIndex + 1}
              </td>
              {columns.map((column) => {
                const value = row.data[column];
                const { displayValue, cellClass } = formatCellValue(value);
                const isSelected =
                  selectedCell &&
                  selectedCell.rowIndex === row.rowIndex &&
                  selectedCell.column === column &&
                  selectedCell.isNew === row.isNew;
                const isEdited =
                  !row.isNew && editedCells[row.rowIndex] && Object.prototype.hasOwnProperty.call(editedCells[row.rowIndex], column);
                const className = [
                  'px-3 py-2 text-xs text-slate-900 dark:text-slate-100',
                  cellClass,
                  isSelected ? 'ring-1 ring-blue-500/60 bg-blue-50/60 dark:bg-blue-500/10' : '',
                  isEdited ? 'bg-amber-50/70 dark:bg-amber-500/10' : '',
                  rowIsDeleted ? 'line-through' : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                const cell: SelectedCell = { rowIndex: row.rowIndex, column, isNew: row.isNew };
                const isEditing =
                  editingCell &&
                  editingCell.rowIndex === row.rowIndex &&
                  editingCell.column === column &&
                  editingCell.isNew === row.isNew;

                return (
                  <td
                    key={column}
                    className={className}
                    onClick={() => onSelectCell(cell)}
                    onDoubleClick={() => {
                      if (rowIsDeleted) return;
                      startEditing(cell, value);
                    }}
                  >
                    {isEditing ? (
                      <input
                        ref={inputRef}
                        className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        value={draftValue}
                        onChange={(event) => setDraftValue(event.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            commitEdit();
                          }
                          if (event.key === 'Escape') {
                            event.preventDefault();
                            cancelEdit();
                          }
                        }}
                      />
                    ) : (
                      <div className="max-w-xs truncate" title={displayValue}>
                        {displayValue}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
            );
          })}
        </tbody>
      </table>
      {isLoadingMore && (
        <div className="flex justify-center items-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-slate-500 dark:text-slate-400" />
          <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">Loading more...</span>
        </div>
      )}
      {!hasMore && rows.length > 0 && (
        <div className="flex justify-center items-center py-4">
          <span className="text-xs text-slate-500 dark:text-slate-400">No more data to load</span>
        </div>
      )}
    </div>
  );
}
