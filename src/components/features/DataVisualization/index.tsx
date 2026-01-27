'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import type { QueryResult, RowData } from '@/types';
import ResultsHeader from './_components/ResultsHeader';
import ResultsTable from './_components/ResultsTable';
import InsertIntoConnectionModal from './_components/InsertIntoConnectionModal';
import {
  buildInsertQuery,
  extractTableName,
  exportToCsv,
  exportToInsertStatements,
  getRowCountText,
  parseInsertStatements,
} from './utils';
import { useConnections } from '@/components/features/QueryEditor/helpers';

interface DataVisualizationProps {
  result: QueryResult;
  connectionId?: number;
  query?: string; // Original query for pagination
  isLoading?: boolean; // Loading state
}

export default function DataVisualization({ result, connectionId, query, isLoading = false }: DataVisualizationProps) {
  const [expanded, setExpanded] = useState(false);
  const [allRows, setAllRows] = useState<RowData[]>(result.rows);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(result.hasMore ?? false);
  const [totalCount, setTotalCount] = useState(result.totalCount);
  const [showInsertModal, setShowInsertModal] = useState(false);
  const [insertTableName, setInsertTableName] = useState('');
  const [isInserting, setIsInserting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [lastInsertedCount, setLastInsertedCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentOffset = useRef(result.rows.length);
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
  }, [result]);

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
  const overlayMessage = isExporting
    ? 'Exporting...'
    : isImporting
      ? 'Importing...'
      : isInserting
        ? 'Inserting...'
        : null;

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
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          No data to display{connectionName ? ` for "${connectionName}"` : ''}
        </p>
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

      <div ref={scrollContainerRef} className="flex-1 overflow-auto relative">
        <ResultsTable
          columns={result.columns}
          rows={allRows}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
        />
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
