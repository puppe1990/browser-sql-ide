'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { FormEvent } from 'react';
import { Code2, Copy, Loader2, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import type { QueryResult, RowData } from '@/types';
import { memo } from 'react';
import ResultsHeader from './_components/ResultsHeader';
import ResultsTable from './_components/ResultsTable';
import type { DisplayRow, SelectedCell } from './_components/ResultsTable';
import InsertIntoConnectionModal from './_components/InsertIntoConnectionModal';
import {
  buildInsertQuery,
  escapeSqlValue,
  extractTableName,
  exportToCsv,
  exportToInsertStatements,
  getEmptyResultFeedback,
  getRowCountText,
  parseInsertStatements,
  coerceEditedCellValue,
  parseEditedRowIndexKey,
} from './utils';
import { useConnections } from '@/components/features/QueryEditor/helpers';
import Tooltip from '@/components/ui/Tooltip';

interface DataVisualizationProps {
  result: QueryResult;
  connectionId?: number;
  query?: string; // Original query for pagination
  isLoading?: boolean; // Loading state
}

function DataVisualization({ result, connectionId, query, isLoading = false }: DataVisualizationProps) {
  const [expanded, setExpanded] = useState(false);
  const [allRows, setAllRows] = useState<RowData[]>(result.rows);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(result.hasMore ?? false);
  const [totalCount, setTotalCount] = useState(result.totalCount);
  const [editMode, setEditMode] = useState(false);
  const [editedCells, setEditedCells] = useState<Record<number, RowData>>({});
  const [addedRows, setAddedRows] = useState<RowData[]>([]);
  const [deletedRowIndices, setDeletedRowIndices] = useState<number[]>([]);
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [keyColumns, setKeyColumns] = useState<string[]>([]);
  const [isSavingEdits, setIsSavingEdits] = useState(false);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [showCellEditor, setShowCellEditor] = useState(false);
  const [cellEditorValue, setCellEditorValue] = useState('');
  const [showInsertModal, setShowInsertModal] = useState(false);
  const [insertTableName, setInsertTableName] = useState('');
  const [isInserting, setIsInserting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [lastInsertedCount, setLastInsertedCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentOffset = useRef(result.rows.length);
  const originalRowsRef = useRef<RowData[]>(result.rows);
  const queryRef = useRef(query);
  const { connections, selectedConnectionId, setSelectedConnectionId } = useConnections({});
  const connectionName = useMemo(() => {
    if (result.connectionName) return result.connectionName;
    const resolvedConnectionId = result.connectionId ?? connectionId ?? selectedConnectionId;
    if (!resolvedConnectionId) return undefined;
    return connections.find((connection) => connection.id === resolvedConnectionId)?.name;
  }, [connections, connectionId, result.connectionId, result.connectionName, selectedConnectionId]);
  const tableName = useMemo(() => {
    const extractedName = extractTableName(query);
    return extractedName === 'table_name' ? undefined : extractedName;
  }, [query]);
  const sourceConnectionId = result.connectionId ?? connectionId ?? selectedConnectionId;

  // Update state when result prop changes
  useEffect(() => {
    setAllRows(result.rows);
    setHasMore(result.hasMore ?? false);
    setTotalCount(result.totalCount);
    currentOffset.current = result.rows.length;
    originalRowsRef.current = result.rows;
    // Só resetar editMode se a query mudou (não quando a paginação carrega mais dados)
    if (queryRef.current !== query) {
      queryRef.current = query;
      setEditMode(false);
      setEditedCells({});
      setAddedRows([]);
      setDeletedRowIndices([]);
      setSelectedCell(null);
      setKeyColumns([]);
      setShowScriptModal(false);
      setShowCellEditor(false);
    }
  }, [result, query]);

  useEffect(() => {
    if (!showInsertModal) {
      setInsertTableName(extractTableName(query));
      return;
    }

    setInsertTableName(extractTableName(query));
  }, [query, showInsertModal]);

  const loadMore = useCallback(async () => {
    if (!sourceConnectionId || !query || isLoadingMore || !hasMore) {
      return;
    }

    setIsLoadingMore(true);
    try {
      const response = await fetch('/api/query/paginate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId: sourceConnectionId,
          query,
          offset: currentOffset.current,
          limit: 100,
        }),
      });

      const data = await response.json();

      if (data.success && data.result) {
        const newRows = data.result.rows || [];
        setAllRows((prev) => [...prev, ...newRows]);
        originalRowsRef.current = [...originalRowsRef.current, ...newRows];
        setHasMore(data.result.hasMore ?? false);
        setTotalCount(data.result.totalCount);
        currentOffset.current += newRows.length;
      }
    } catch (error) {
      console.error('Failed to load more data:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [sourceConnectionId, query, isLoadingMore, hasMore]);

  // Handle scroll to detect when user reaches bottom
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      // Load more when user is within 100px of the bottom
      if (scrollHeight - scrollTop - clientHeight < 100 && hasMore && !isLoadingMore) {
        loadMore();
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [hasMore, isLoadingMore, loadMore]);

  const rowCountText = getRowCountText(totalCount, allRows.length);
  const canInsert = allRows.length > 0 && result.columns.length > 0;
  const insertCountIsExact = totalCount !== undefined || !hasMore;
  const insertCount = totalCount !== undefined ? totalCount : allRows.length;
  const emptyResultFeedback = useMemo(
    () => getEmptyResultFeedback(query, result.rowCount),
    [query, result.rowCount]
  );
  const overlayMessage = isExporting
    ? 'Exporting...'
    : isImporting
      ? 'Importing...'
      : isInserting
        ? 'Inserting...'
        : isSavingEdits
          ? 'Salvando...'
        : null;

  const requiresKeyColumns = Object.keys(editedCells).length > 0 || deletedRowIndices.length > 0;
  const hasEditChanges =
    Object.keys(editedCells).length > 0 || addedRows.length > 0 || deletedRowIndices.length > 0;
  const canSaveEdits =
    editMode &&
    hasEditChanges &&
    Boolean(tableName) &&
    Boolean(sourceConnectionId) &&
    (!requiresKeyColumns || keyColumns.length > 0);

  const displayedRows: DisplayRow[] = useMemo(() => {
    const baseRows = allRows.map((row, rowIndex) => {
      const edits = editedCells[rowIndex];
      const data = edits ? { ...row, ...edits } : row;
      return {
        id: `row-${rowIndex}`,
        rowIndex,
        isNew: false,
        data,
      };
    });
    const newRows = addedRows.map((row, rowIndex) => ({
      id: `new-${rowIndex}`,
      rowIndex,
      isNew: true,
      data: row,
    }));
    return [...baseRows, ...newRows];
  }, [allRows, addedRows, editedCells]);

  const handleSelectCell = useCallback((cell: SelectedCell) => {
    setSelectedCell(cell);
    if (cell.isNew) {
      const value = addedRows[cell.rowIndex]?.[cell.column];
      setCellEditorValue(value === null || value === undefined ? '' : String(value));
      return;
    }
    const original = originalRowsRef.current[cell.rowIndex]?.[cell.column];
    const edited = editedCells[cell.rowIndex]?.[cell.column];
    const value = edited !== undefined ? edited : original;
    setCellEditorValue(value === null || value === undefined ? '' : String(value));
  }, [addedRows, editedCells]);

  const handleCellChange = useCallback(
    (cell: SelectedCell, rawValue: unknown) => {
      if (cell.isNew) {
        setAddedRows((prev) => {
          const next = [...prev];
          const row = { ...(next[cell.rowIndex] ?? {}) };
          row[cell.column] = rawValue;
          next[cell.rowIndex] = row;
          return next;
        });
        return;
      }

      const originalRow = originalRowsRef.current[cell.rowIndex] ?? {};
      const parsedValue = coerceEditedCellValue(rawValue, originalRow[cell.column]);
      const originalValue = originalRow[cell.column];
      const valuesEqual =
        typeof originalValue === 'object' && typeof parsedValue === 'object'
          ? JSON.stringify(originalValue) === JSON.stringify(parsedValue)
          : Object.is(originalValue, parsedValue);

      setEditedCells((prev) => {
        const existing = prev[cell.rowIndex] ? { ...prev[cell.rowIndex] } : {};
        if (valuesEqual) {
          delete existing[cell.column];
        } else {
          existing[cell.column] = parsedValue;
        }

        if (Object.keys(existing).length === 0) {
          const next = { ...prev };
          delete next[cell.rowIndex];
          return next;
        }

        return { ...prev, [cell.rowIndex]: existing };
      });
    },
    []
  );

  const handleAddRow = useCallback(() => {
    if (result.columns.length === 0) return;
    const emptyRow = result.columns.reduce<RowData>((acc, column) => {
      acc[column] = null;
      return acc;
    }, {});
    setAddedRows((prev) => {
      const next = [...prev, emptyRow];
      const newIndex = next.length - 1;
      setSelectedCell({ rowIndex: newIndex, column: result.columns[0], isNew: true });
      setCellEditorValue('');
      return next;
    });
    setEditMode(true);
  }, [result.columns]);

  const handleDuplicateRow = useCallback(() => {
    if (!selectedCell || result.columns.length === 0) return;
    const sourceRow = selectedCell.isNew
      ? addedRows[selectedCell.rowIndex]
      : displayedRows.find((row) => row.rowIndex === selectedCell.rowIndex && !row.isNew)?.data;
    if (!sourceRow) return;
    setAddedRows((prev) => {
      const next = [...prev, { ...sourceRow }];
      const newIndex = next.length - 1;
      setSelectedCell({ rowIndex: newIndex, column: result.columns[0], isNew: true });
      return next;
    });
    setEditMode(true);
  }, [addedRows, displayedRows, result.columns, selectedCell]);

  const handleToggleDeleteRow = useCallback(() => {
    if (!selectedCell || selectedCell.isNew) {
      if (selectedCell?.isNew) {
        setAddedRows((prev) => prev.filter((_, idx) => idx !== selectedCell.rowIndex));
        setSelectedCell(null);
      }
      return;
    }

    setDeletedRowIndices((prev) => {
      if (prev.includes(selectedCell.rowIndex)) {
        return prev.filter((idx) => idx !== selectedCell.rowIndex);
      }
      return [...prev, selectedCell.rowIndex];
    });
  }, [selectedCell]);

  const handleSetNull = useCallback(() => {
    if (!selectedCell) return;
    handleCellChange(selectedCell, null);
    setCellEditorValue('');
  }, [handleCellChange, selectedCell]);

  const handleToggleKeyColumn = useCallback((column: string) => {
    setKeyColumns((prev) => (prev.includes(column) ? prev.filter((col) => col !== column) : [...prev, column]));
  }, []);



  const buildWhereClause = useCallback(
    (row: RowData) => {
      if (keyColumns.length === 0) return null;
      const clauses = keyColumns.map((col) => {
        const value = row[col];
        if (value === null || value === undefined) {
          return `${col} IS NULL`;
        }
        return `${col} = ${escapeSqlValue(value)}`;
      });
      return clauses.join(' AND ');
    },
    [keyColumns]
  );

  const buildChangeScript = useCallback(() => {
    if (!tableName) {
      return { statements: [], errors: ['Não foi possível identificar a tabela a partir da query.'] };
    }

    const statements: string[] = [];
    const errors: string[] = [];

    deletedRowIndices.forEach((rowIndex) => {
      const originalRow = originalRowsRef.current[rowIndex];
      if (!originalRow) return;
      const whereClause = buildWhereClause(originalRow);
      if (!whereClause) {
        errors.push('Defina ao menos uma coluna chave para remover linhas.');
        return;
      }
      statements.push(`DELETE FROM ${tableName} WHERE ${whereClause};`);
    });

    Object.entries(editedCells).forEach(([rowIndexKey, changes]) => {
      const rowIndex = parseEditedRowIndexKey(rowIndexKey);
      if (rowIndex === null) return;
      if (deletedRowIndices.includes(rowIndex)) return;
      const originalRow = originalRowsRef.current[rowIndex];
      if (!originalRow) return;
      const columnsToUpdate = Object.keys(changes);
      if (columnsToUpdate.length === 0) return;
      const whereClause = buildWhereClause(originalRow);
      if (!whereClause) {
        errors.push('Defina ao menos uma coluna chave para atualizar linhas.');
        return;
      }
      const setClause = columnsToUpdate
        .map((col) => `${col} = ${escapeSqlValue(changes[col])}`)
        .join(', ');
      statements.push(`UPDATE ${tableName} SET ${setClause} WHERE ${whereClause};`);
    });

    addedRows.forEach((row) => {
      const values = result.columns.map((col) => escapeSqlValue(row[col]));
      statements.push(`INSERT INTO ${tableName} (${result.columns.join(', ')}) VALUES (${values.join(', ')});`);
    });

    return { statements, errors };
  }, [addedRows, buildWhereClause, deletedRowIndices, editedCells, result.columns, tableName]);

  const applyChangesToRows = useCallback(
    (baseRows: RowData[]) => {
      let nextRows = [...baseRows];
      Object.entries(editedCells).forEach(([rowIndexKey, changes]) => {
        const rowIndex = parseEditedRowIndexKey(rowIndexKey);
        if (rowIndex === null) return;
        if (deletedRowIndices.includes(rowIndex)) return;
        if (!nextRows[rowIndex]) return;
        nextRows[rowIndex] = { ...nextRows[rowIndex], ...changes };
      });
      const sortedDeletes = [...deletedRowIndices].sort((a, b) => b - a);
      sortedDeletes.forEach((rowIndex) => {
        if (nextRows[rowIndex]) {
          nextRows.splice(rowIndex, 1);
        }
      });
      if (addedRows.length > 0) {
        nextRows = [...nextRows, ...addedRows];
      }
      return nextRows;
    },
    [addedRows, deletedRowIndices, editedCells]
  );

  const handleSaveEdits = useCallback(async () => {
    if (!sourceConnectionId) {
      alert('Selecione uma conexão antes de salvar.');
      return;
    }

    const { statements, errors } = buildChangeScript();
    if (errors.length > 0) {
      alert(errors[0]);
      return;
    }

    if (statements.length === 0) {
      alert('Nenhuma alteração para salvar.');
      return;
    }

    setIsSavingEdits(true);
    try {
      for (const statement of statements) {
        const response = await fetch('/api/query/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            connectionId: sourceConnectionId,
            query: statement,
          }),
        });
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Falha ao executar alterações');
        }
      }

      const nextRows = applyChangesToRows(allRows);
      setAllRows(nextRows);

      setTotalCount((prev) => {
        if (prev === undefined) return prev;
        return prev + addedRows.length - deletedRowIndices.length;
      });

      originalRowsRef.current = [...nextRows];
      currentOffset.current = nextRows.length;

      setEditedCells({});
      setAddedRows([]);
      setDeletedRowIndices([]);
      setSelectedCell(null);
    } catch (error) {
      console.error('Failed to save edits:', error);
      alert(error instanceof Error ? error.message : 'Falha ao salvar alterações.');
    } finally {
      setIsSavingEdits(false);
    }
  }, [
    applyChangesToRows,
    addedRows,
    allRows,
    buildChangeScript,
    deletedRowIndices,
    sourceConnectionId,
  ]);

  const handleCancelEdits = useCallback(() => {
    setEditedCells({});
    setAddedRows([]);
    setDeletedRowIndices([]);
    setSelectedCell(null);
  }, []);

  const scriptPreview = useMemo(() => {
    const { statements } = buildChangeScript();
    return statements.join('\n');
  }, [buildChangeScript]);

  const fetchAllRowsForInsert = useCallback(async () => {
    if (!hasMore) return allRows;
    if (!sourceConnectionId || !query) {
      throw new Error('Query and source connection are required to fetch all rows.');
    }

    let rows = [...allRows];
    let offset = rows.length;
    let more = true;
    let safetyCounter = 0;

    while (more) {
      const response = await fetch('/api/query/paginate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId: sourceConnectionId,
          query,
          offset,
          limit: 100,
        }),
      });

      const data = await response.json();
      if (!data.success || !data.result) {
        throw new Error(data.error || 'Failed to fetch all rows');
      }

      const newRows = data.result.rows || [];
      if (newRows.length === 0) {
        break;
      }

      rows = [...rows, ...newRows];
      offset += newRows.length;
      more = data.result.hasMore ?? false;

      safetyCounter += 1;
      if (safetyCounter > 10000) {
        throw new Error('Aborted fetching rows due to excessive pagination.');
      }
    }

    if (rows.length !== allRows.length) {
      setAllRows(rows);
      setHasMore(false);
      setTotalCount(rows.length);
    }

    return rows;
  }, [allRows, hasMore, query, sourceConnectionId]);

  const handleInsertSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();

      if (!selectedConnectionId) {
        alert('Please select a target connection');
        return;
      }

      const trimmedTable = insertTableName.trim();
      if (!trimmedTable) {
        alert('Please provide a target table name');
        return;
      }

      if (!canInsert) {
        alert('No rows available to insert');
        return;
      }

      setIsInserting(true);
      setLastInsertedCount(null);
      try {
        let rowsToInsert = allRows;

        if (hasMore) {
          try {
            rowsToInsert = await fetchAllRowsForInsert();
          } catch (error) {
            console.error('Failed to load all rows:', error);
            alert('Failed to load all rows before inserting');
            return;
          }
        }

        const insertQuery = buildInsertQuery(result.columns, rowsToInsert, trimmedTable);
        if (!insertQuery) {
          alert('Failed to build insert query');
          return;
        }

        const response = await fetch('/api/query/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            connectionId: selectedConnectionId,
            query: insertQuery,
          }),
        });

        const data = await response.json();
        if (data.success) {
          const insertedCount = data.result?.rowCount ?? rowsToInsert.length;
          setLastInsertedCount(insertedCount);
        } else {
          alert(data.error || 'Insert failed');
        }
      } catch (error) {
        console.error('Failed to insert data:', error);
        alert('Failed to insert data');
      } finally {
        setIsInserting(false);
      }
    },
    [selectedConnectionId, insertTableName, canInsert, result.columns, allRows, hasMore, fetchAllRowsForInsert]
  );

  const handleExportCsv = useCallback(async () => {
    if (!canInsert) {
      alert('Nenhuma linha disponível para exportar');
      return;
    }

    setIsExporting(true);
    try {
      let rowsToExport = allRows;
      if (hasMore) {
        try {
          rowsToExport = await fetchAllRowsForInsert();
        } catch (error) {
          console.error('Failed to load all rows:', error);
          alert('Falha ao carregar todas as linhas antes de exportar');
          return;
        }
      }

      exportToCsv(result.columns, rowsToExport);
    } finally {
      setIsExporting(false);
    }
  }, [canInsert, allRows, hasMore, fetchAllRowsForInsert, result.columns]);

  const handleExportSql = useCallback(async () => {
    if (!canInsert) {
      alert('Nenhuma linha disponível para exportar');
      return;
    }

    setIsExporting(true);
    try {
      let rowsToExport = allRows;
      if (hasMore) {
        try {
          rowsToExport = await fetchAllRowsForInsert();
        } catch (error) {
          console.error('Failed to load all rows:', error);
          alert('Falha ao carregar todas as linhas antes de exportar');
          return;
        }
      }

      exportToInsertStatements(result.columns, rowsToExport, query);
    } finally {
      setIsExporting(false);
    }
  }, [canInsert, allRows, hasMore, fetchAllRowsForInsert, result.columns, query]);

  const handleExportInsert = useCallback(async () => {
    const trimmedTable = insertTableName.trim();
    if (!trimmedTable) {
      alert('Please provide a target table name');
      return;
    }

    if (!canInsert) {
      alert('No rows available to export');
      return;
    }

    setIsExporting(true);
    try {
      let rowsToExport = allRows;
      if (hasMore) {
        try {
          rowsToExport = await fetchAllRowsForInsert();
        } catch (error) {
          console.error('Failed to load all rows:', error);
          alert('Failed to load all rows before exporting');
          return;
        }
      }

      const insertQuery = buildInsertQuery(result.columns, rowsToExport, trimmedTable);
      if (!insertQuery) {
        alert('Failed to build insert query');
        return;
      }

      const blob = new Blob([insertQuery], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inserts_${trimmedTable}_${Date.now()}.sql`;
      a.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }, [insertTableName, canInsert, allRows, hasMore, fetchAllRowsForInsert, result.columns]);

  const handleImportInserts = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      if (!sourceConnectionId) {
        alert('Por favor, selecione uma conexão primeiro');
        return;
      }

      setIsImporting(true);
      try {
        const text = await file.text();
        const statements = parseInsertStatements(text);

        if (statements.length === 0) {
          alert('Nenhum INSERT statement encontrado no arquivo');
          setIsImporting(false);
          return;
        }

        // Execute each INSERT statement
        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        for (let i = 0; i < statements.length; i++) {
          const statement = statements[i];
          try {
            const response = await fetch('/api/query/execute', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                connectionId: sourceConnectionId,
                query: statement,
              }),
            });

            const data = await response.json();
            if (data.success) {
              successCount++;
            } else {
              errorCount++;
              errors.push(`Linha ${i + 1}: ${data.error || 'Erro desconhecido'}`);
            }
          } catch (error) {
            errorCount++;
            errors.push(`Linha ${i + 1}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
          }
        }

        let message = `Importação concluída: ${successCount} INSERT${successCount !== 1 ? 's' : ''} executado${successCount !== 1 ? 's' : ''} com sucesso`;
        if (errorCount > 0) {
          message += `, ${errorCount} falha${errorCount !== 1 ? 's' : ''}`;
          if (errors.length > 0) {
            message += `\n\nErros:\n${errors.slice(0, 5).join('\n')}`;
            if (errors.length > 5) {
              message += `\n... e mais ${errors.length - 5} erro(s)`;
            }
          }
        }
        alert(message);
      } catch (error) {
        console.error('Failed to import INSERT statements:', error);
        alert(`Erro ao importar arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      } finally {
        setIsImporting(false);
      }
    },
    [sourceConnectionId]
  );

  // Show loading spinner
  if (isLoading) {
    return (
      <div className="h-full flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
        <div className="flex justify-between items-center px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              Query Results
            </h3>
            {tableName ? (
              <span className="text-xs text-slate-500 dark:text-slate-400">{tableName}</span>
            ) : null}
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">Loading results...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!result || !result.columns || result.columns.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="flex flex-col items-center gap-2">
          <p
            className={`text-sm font-medium ${
              emptyResultFeedback ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {emptyResultFeedback?.title ??
              `No data to display${connectionName ? ` for "${connectionName}"` : ''}`}
          </p>
          {emptyResultFeedback?.detail && (
            <p className="text-xs text-slate-500 dark:text-slate-400">{emptyResultFeedback.detail}</p>
          )}
          {emptyResultFeedback && connectionName && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Connection: {connectionName}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`h-full flex flex-col bg-white dark:bg-slate-900 overflow-hidden relative ${
        expanded ? 'fixed inset-4 z-50' : ''
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".sql,.txt"
        onChange={handleFileChange}
        className="hidden"
      />
      <ResultsHeader
        expanded={expanded}
        rowCountText={rowCountText}
        executionTime={result.executionTime}
        connectionName={connectionName}
        tableName={tableName}
        onToggleExpand={() => setExpanded(!expanded)}
        onExportCsv={handleExportCsv}
        onExportSql={handleExportSql}
        onImportInserts={handleImportInserts}
        onInsertToConnection={() => setShowInsertModal(true)}
        canInsert={canInsert}
        isInserting={isInserting || isImporting}
        isExporting={isExporting}
      />

      <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
          <button
            className={`inline-flex items-center gap-1.5 rounded px-2 py-1 transition-colors ${
              editMode
                ? 'bg-blue-600 text-white'
                : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            onClick={() => setEditMode((prev) => !prev)}
          >
            <Pencil className="w-3.5 h-3.5" />
            {editMode ? 'Editando' : 'Editar'}
          </button>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {tableName ? `Tabela: ${tableName}` : 'Tabela não detectada'}
          </div>
          {requiresKeyColumns && keyColumns.length === 0 && (
            <div className="text-[11px] text-amber-600 dark:text-amber-400">
              Clique no ícone 🔑 no cabeçalho da coluna ID para definir a chave primária.
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Tooltip text="Adicionar linha">
            <button
              onClick={handleAddRow}
              disabled={!editMode}
              className={`p-1.5 rounded transition-colors ${
                editMode
                  ? 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  : 'text-slate-400 dark:text-slate-600 cursor-not-allowed'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <Tooltip text="Duplicar linha selecionada">
            <button
              onClick={handleDuplicateRow}
              disabled={!editMode || !selectedCell}
              className={`p-1.5 rounded transition-colors ${
                editMode && selectedCell
                  ? 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  : 'text-slate-400 dark:text-slate-600 cursor-not-allowed'
              }`}
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <Tooltip text="Remover linha selecionada">
            <button
              onClick={handleToggleDeleteRow}
              disabled={!editMode || !selectedCell}
              className={`p-1.5 rounded transition-colors ${
                editMode && selectedCell
                  ? 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10'
                  : 'text-slate-400 dark:text-slate-600 cursor-not-allowed'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <Tooltip text="Definir célula como NULL">
            <button
              onClick={handleSetNull}
              disabled={!editMode || !selectedCell}
              className={`p-1.5 rounded transition-colors ${
                editMode && selectedCell
                  ? 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  : 'text-slate-400 dark:text-slate-600 cursor-not-allowed'
              }`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <Tooltip text="Editar célula em modal">
            <button
              onClick={() => {
                if (!selectedCell) return;
                setShowCellEditor(true);
              }}
              disabled={!editMode || !selectedCell}
              className={`p-1.5 rounded transition-colors ${
                editMode && selectedCell
                  ? 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  : 'text-slate-400 dark:text-slate-600 cursor-not-allowed'
              }`}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <Tooltip text="Ver SQL gerado">
            <button
              onClick={() => setShowScriptModal(true)}
              disabled={!editMode}
              className={`p-1.5 rounded transition-colors ${
                editMode
                  ? 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  : 'text-slate-400 dark:text-slate-600 cursor-not-allowed'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <Tooltip text="Salvar alterações">
            <button
              onClick={handleSaveEdits}
              disabled={!canSaveEdits || isSavingEdits}
              className={`p-1.5 rounded transition-colors ${
                canSaveEdits && !isSavingEdits
                  ? 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10'
                  : 'text-slate-400 dark:text-slate-600 cursor-not-allowed'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <Tooltip text="Cancelar alterações">
            <button
              onClick={handleCancelEdits}
              disabled={!editMode || !hasEditChanges}
              className={`p-1.5 rounded transition-colors ${
                editMode && hasEditChanges
                  ? 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  : 'text-slate-400 dark:text-slate-600 cursor-not-allowed'
              }`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        </div>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-auto relative">
        {allRows.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-slate-500 dark:text-slate-400">No rows returned</p>
          </div>
        ) : (
          <ResultsTable
            columns={result.columns}
            rows={displayedRows}
            isLoadingMore={isLoadingMore}
            hasMore={hasMore}
            editMode={editMode}
            selectedCell={selectedCell}
            editedCells={editedCells}
            deletedRowIndices={deletedRowIndices}
            keyColumns={keyColumns}
            onSelectCell={handleSelectCell}
            onCellChange={handleCellChange}
            onToggleKeyColumn={handleToggleKeyColumn}
          />
        )}
      </div>

      <InsertIntoConnectionModal
        open={showInsertModal}
        connections={connections}
        selectedConnectionId={selectedConnectionId}
        tableName={insertTableName}
        rowCount={allRows.length}
        insertCount={insertCount}
        insertCountIsExact={insertCountIsExact}
        insertedCount={lastInsertedCount}
        isSubmitting={isInserting}
        onConnectionChange={setSelectedConnectionId}
        onTableNameChange={setInsertTableName}
        onSubmit={handleInsertSubmit}
        onExportInsert={handleExportInsert}
        onClose={() => setShowInsertModal(false)}
      />

      {showCellEditor && selectedCell && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Editar célula • {selectedCell.column}
              </div>
              <button
                onClick={() => setShowCellEditor(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
              className="w-full min-h-[140px] text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              value={cellEditorValue}
              onChange={(event) => setCellEditorValue(event.target.value)}
            />
            <div className="flex items-center justify-end gap-2 mt-3">
              <button
                onClick={() => setShowCellEditor(false)}
                className="px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!selectedCell) return;
                  handleCellChange(selectedCell, cellEditorValue);
                  setShowCellEditor(false);
                }}
                className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {showScriptModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                SQL gerado para salvar alterações
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    if (!scriptPreview) return;
                    await navigator.clipboard.writeText(scriptPreview);
                  }}
                  className="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Copy className="w-3 h-3" />
                  Copiar
                </button>
                <button
                  onClick={() => setShowScriptModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <pre className="text-xs whitespace-pre-wrap rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 max-h-[50vh] overflow-auto">
              {scriptPreview || 'Nenhuma alteração para mostrar.'}
            </pre>
          </div>
        </div>
      )}

      {overlayMessage && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
            <p className="text-slate-600 dark:text-slate-300 text-sm">{overlayMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(DataVisualization);
