'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Sidebar from './_components/Sidebar';
import { getErrorMessage } from '@/lib/utils';
import { getDeleteConfirmationInfo, processQuery } from '@/lib/query-utils';
import type { ComparisonResult, RowData } from '@/types';
import type { Connection, QueryResultWithMeta } from './types';
import MainContent from './_components/MainContent';
import {
  STORAGE_KEYS,
  executeQueries,
  getQueriesFromTabsStorage,
  parseBoolean,
  parseNumberInRange,
  resolveConnectionIds,
  useHorizontalResize,
  useLocalStorageState,
  useVerticalResize,
} from './_utils/page-helpers';

declare global {
  interface Window {
    addQueryToTab?: (query: string) => void;
  }
}

const parsePositiveNumber = (raw: string) => parseNumberInRange(raw, { minExclusive: 0 });
const parseSplitWidth = (raw: string) =>
  parseNumberInRange(raw, { minExclusive: 0, maxExclusive: 100 });

type DeleteConfirmState = {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  confirmTone: 'primary' | 'danger';
  onConfirm: (() => void | Promise<void>) | null;
};

export default function Home() {
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResultWithMeta | null>(null);
  const [queryResult2, setQueryResult2] = useState<QueryResultWithMeta | null>(null);
  const [sidebarOpen, setSidebarOpen] = useLocalStorageState(
    STORAGE_KEYS.SIDEBAR_OPEN,
    false,
    parseBoolean,
  );
  const [splitScreen, setSplitScreen] = useLocalStorageState(
    STORAGE_KEYS.SPLIT_SCREEN,
    false,
    parseBoolean,
  );
  const [splitScreenWidth, setSplitScreenWidth] = useLocalStorageState(
    STORAGE_KEYS.SPLIT_SCREEN_WIDTH,
    50,
    parseSplitWidth,
  ); // Percentage
  const [compareMode, setCompareMode] = useState(false);
  const [compareKey, setCompareKey] = useState<string>('');
  const [compareFields, setCompareFields] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showCompareFieldsModal, setShowCompareFieldsModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({
    open: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    confirmTone: 'primary',
    onConfirm: null,
  });
  const [isReExecuting, setIsReExecuting] = useState(false);
  const [isExecutingActiveTabs, setIsExecutingActiveTabs] = useState(false);
  const [savedQueries, setSavedQueries] = useState<{query1?: string, query2?: string}>({});
  const [activeQuery1, setActiveQuery1] = useState<string>('');
  const [activeQuery2, setActiveQuery2] = useState<string>('');
  const [activeConnectionId1, setActiveConnectionId1] = useState<number | undefined>(undefined);
  const [activeConnectionId2, setActiveConnectionId2] = useState<number | undefined>(undefined);
  const [connectionsById, setConnectionsById] = useState<Record<number, string>>({});
  const [isLoadingResult1, setIsLoadingResult1] = useState(false);
  const [isLoadingResult2, setIsLoadingResult2] = useState(false);
  const [queryResultsHeight, setQueryResultsHeight] = useLocalStorageState(
    STORAGE_KEYS.QUERY_RESULTS_HEIGHT,
    400,
    parsePositiveNumber,
  ); // Default height in pixels
  const [savedQueriesHeight, setSavedQueriesHeight] = useLocalStorageState(
    STORAGE_KEYS.SAVED_QUERIES_HEIGHT,
    320,
    parsePositiveNumber,
  ); // Default height in pixels
  const [isResizing, setIsResizing] = useState(false);
  const [isResizingSavedQueries, setIsResizingSavedQueries] = useState(false);
  const [isResizingSplit, setIsResizingSplit] = useState(false);
  const [pendingCompareRestore, setPendingCompareRestore] = useState<{
    compareMode: boolean;
    compareKey: string;
    compareFields: string[];
  } | null>(null);
  const editor1Ref = useRef<{ addQueryToTab: (query: string) => void } | null>(null);
  const editor2Ref = useRef<{ addQueryToTab: (query: string) => void } | null>(null);
  const singleEditorRef = useRef<{ addQueryToTab: (query: string) => void } | null>(null);

  useEffect(() => {
    const loadConnections = async () => {
      try {
        const response = await fetch('/api/connections');
        const data = await response.json();
        const loadedConnections = data.connections || [];
        const map: Record<number, string> = {};
        loadedConnections.forEach((connection: Connection) => {
          map[connection.id] = connection.name;
        });
        setConnectionsById(map);
      } catch (error) {
        console.error('Failed to load connections:', error);
      }
    };

    loadConnections();
    const handleConnectionsUpdated = () => {
      loadConnections();
    };
    window.addEventListener('connections-updated', handleConnectionsUpdated);
    return () => {
      window.removeEventListener('connections-updated', handleConnectionsUpdated);
    };
  }, []);

  useVerticalResize({
    isResizing,
    setIsResizing,
    onHeightChange: setQueryResultsHeight,
    minHeight: 200,
    maxHeightOffset: 200,
  });

  useVerticalResize({
    isResizing: isResizingSavedQueries,
    setIsResizing: setIsResizingSavedQueries,
    onHeightChange: setSavedQueriesHeight,
    minHeight: 150,
    maxHeightOffset: 200,
  });

  useHorizontalResize({
    isResizing: isResizingSplit,
    enabled: splitScreen,
    setIsResizing: setIsResizingSplit,
    onWidthChange: setSplitScreenWidth,
    minWidthPercent: 20,
    maxWidthPercent: 80,
  });

  // Restore compare mode after re-execute completes and results are updated
  useEffect(() => {
    if (pendingCompareRestore && queryResult && queryResult2 && !isReExecuting && !isLoadingResult1 && !isLoadingResult2) {
      // Use requestAnimationFrame to ensure state updates happen after render
      requestAnimationFrame(() => {
        setCompareMode(pendingCompareRestore.compareMode);
        setCompareKey(pendingCompareRestore.compareKey);
        setCompareFields(pendingCompareRestore.compareFields);
        setPendingCompareRestore(null);
      });
    }
  }, [queryResult, queryResult2, isReExecuting, isLoadingResult1, isLoadingResult2, pendingCompareRestore]);

  const handleConnectionSelect = (connection: Connection) => {
    setSelectedConnection(connection);
  };

  const handleQueryResult = (result: QueryResult, query?: string, isSecondEditor?: boolean) => {
    const resolvedIsSecond = typeof isSecondEditor === 'boolean'
      ? isSecondEditor
      : result.sourceEditorId === 'editor2'
        ? true
        : false;

    if (resolvedIsSecond) {
      setQueryResult2({ ...result, query });
      setIsLoadingResult2(false);
      if (query) {
        setSavedQueries(prev => ({ ...prev, query2: query }));
      }
    } else {
      setQueryResult({ ...result, query });
      setIsLoadingResult1(false);
      if (query) {
        setSavedQueries(prev => ({ ...prev, query1: query }));
      }
    }
    // Only disable compare mode when new results come in if not re-executing
    if (compareMode && !isReExecuting) {
      setCompareMode(false);
      setCompareKey('');
      setCompareFields([]);
    }
  };

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

    const uniqueNames = connectionNames.filter(Boolean).filter((name, index, arr) => arr.indexOf(name) === index);
    const message = uniqueNames.length > 0 ? (
      <div>
        <div>{deleteInfo.message}</div>
        <div className="mt-2 text-xs text-gray-500">
          Connection{uniqueNames.length > 1 ? 's' : ''}: {uniqueNames.join(', ')}
        </div>
      </div>
    ) : deleteInfo.message;

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


  // Execute queries from active tabs in split screen
  const handleExecuteActiveTabs = async () => {
    // Get queries from active tabs of each editor
    const query1 = activeQuery1?.trim();
    const query2 = activeQuery2?.trim();

    if (!query1 || !query2) {
      alert('Please write queries in both editors before executing');
      return;
    }

    const resolved = await resolveConnectionIds({
      activeConnectionId1,
      activeConnectionId2,
      selectedConnection,
    });
    if ('error' in resolved) {
      alert(resolved.error);
      return;
    }

    const executeActiveTabs = async () => {
      setIsExecutingActiveTabs(true);
      setIsLoadingResult1(true);
      setIsLoadingResult2(true);

      try {
        // Execute both queries in parallel with their respective connections
        const executedResults = await executeQueries([
          { query: query1, connectionId: resolved.connectionId1 },
          { query: query2, connectionId: resolved.connectionId2 },
        ]);
        
        // Update results
        setQueryResult(executedResults[0]);
        setQueryResult2(executedResults[1]);
        setIsLoadingResult1(false);
        setIsLoadingResult2(false);
        
        // Save queries
        setSavedQueries({ query1: executedResults[0].query, query2: executedResults[1].query });
      } catch (error: unknown) {
        setIsLoadingResult1(false);
        setIsLoadingResult2(false);
        alert(`Failed to execute queries: ${getErrorMessage(error) || 'Unknown error'}`);
      } finally {
        setIsExecutingActiveTabs(false);
      }
    };

    const connectionNames = [
      connectionsById[resolved.connectionId1],
      connectionsById[resolved.connectionId2],
    ].filter(Boolean);
    if (requestDeleteConfirmation([query1, query2], executeActiveTabs, connectionNames)) {
      return;
    }

    await executeActiveTabs();
  };

  // Re-execute both queries with same filters
  const handleReExecuteCompare = async () => {
    const resolved = await resolveConnectionIds({
      activeConnectionId1,
      activeConnectionId2,
      selectedConnection,
    });
    if ('error' in resolved) {
      alert(resolved.error);
      return;
    }

    // Try to get queries from multiple sources in order of preference
    let query1 = queryResult?.query || savedQueries.query1;
    let query2 = queryResult2?.query || savedQueries.query2;

    // If queries are still not found, try to get from tabs in localStorage
    if (!query1 || !query2) {
      const storedQueries = getQueriesFromTabsStorage();
      if (!query1) query1 = storedQueries.query1;
      if (!query2) query2 = storedQueries.query2;
    }

    if (!query1 || !query2) {
      alert('Could not find queries to re-execute. Please execute both queries first in the split screen editors.');
      return;
    }

    const reExecuteCompare = async () => {
      setIsReExecuting(true);
      setIsLoadingResult1(true);
      setIsLoadingResult2(true);
      
      // Store current filters to restore them after re-execution
      const savedCompareKey = compareKey;
      const savedCompareFields = [...compareFields];
      const savedCompareMode = compareMode;

      try {
        // Execute both queries in parallel with their respective connections
        const executedResults = await executeQueries([
          { query: query1, connectionId: resolved.connectionId1 },
          { query: query2, connectionId: resolved.connectionId2 },
        ]);
        
        // Create completely new objects with new arrays to ensure React detects the change
        const newResult1: QueryResultWithMeta = {
          ...executedResults[0],
          rows: [...executedResults[0].rows],
          columns: [...executedResults[0].columns],
        };
        const newResult2: QueryResultWithMeta = {
          ...executedResults[1],
          rows: [...executedResults[1].rows],
          columns: [...executedResults[1].columns],
        };
        
        // Update results first
        setQueryResult(newResult1);
        setQueryResult2(newResult2);
        setIsLoadingResult1(false);
        setIsLoadingResult2(false);
        
        // Store compare mode restoration to be applied after results are updated
        if (savedCompareMode) {
          setPendingCompareRestore({
            compareMode: true,
            compareKey: savedCompareKey,
            compareFields: savedCompareFields,
          });
        }
      } catch (error: unknown) {
        setIsLoadingResult1(false);
        setIsLoadingResult2(false);
        setPendingCompareRestore(null); // Clear pending restore on error
        alert(`Failed to execute query: ${getErrorMessage(error) || 'Unknown error'}`);
      } finally {
        setIsReExecuting(false);
      }
    };

    const connectionNames = [
      connectionsById[resolved.connectionId1],
      connectionsById[resolved.connectionId2],
    ].filter(Boolean);
    if (requestDeleteConfirmation([query1, query2], reExecuteCompare, connectionNames)) {
      return;
    }

    await reExecuteCompare();
  };

  // Get common columns for comparison
  const commonColumns = useMemo(() => {
    if (!queryResult || !queryResult2) return [];
    return queryResult.columns.filter(col => queryResult2.columns.includes(col));
  }, [queryResult, queryResult2]);

  // Compare results based on selected key
  const comparedResults = useMemo<ComparisonResult[] | null>(() => {
    if (!compareMode || !compareKey || !queryResult || !queryResult2) return null;

    const result1Map = new Map<string, RowData[]>();
    const result2Map = new Map<string, RowData[]>();

    // Index results by compare key
    queryResult.rows.forEach((row: RowData) => {
      const keyValue = String(row[compareKey] ?? '');
      if (!result1Map.has(keyValue)) {
        result1Map.set(keyValue, []);
      }
      result1Map.get(keyValue).push(row);
    });

    queryResult2.rows.forEach((row: RowData) => {
      const keyValue = String(row[compareKey] ?? '');
      if (!result2Map.has(keyValue)) {
        result2Map.set(keyValue, []);
      }
      result2Map.get(keyValue).push(row);
    });

    // Get all unique keys
    const allKeys = new Set([...result1Map.keys(), ...result2Map.keys()]);

    // Create comparison result
    const compared: ComparisonResult[] = [];
    allKeys.forEach(key => {
      const rows1 = (result1Map.get(key) || []) as RowData[];
      const rows2 = (result2Map.get(key) || []) as RowData[];
      
      // Compare fields if selected
      const fieldComparisons: ComparisonResult['fieldComparisons'] = {};
      if (compareFields.length > 0 && rows1.length > 0 && rows2.length > 0) {
        compareFields.forEach(field => {
          const leftValue = rows1[0][field];
          const rightValue = rows2[0][field];
          fieldComparisons[field] = {
            left: leftValue,
            right: rightValue,
            match: String(leftValue ?? '') === String(rightValue ?? '')
          };
        });
      }
      
      compared.push({
        key,
        leftRows: rows1,
        rightRows: rows2,
        status: rows1.length > 0 && rows2.length > 0 ? 'match' : 
                rows1.length > 0 ? 'left-only' : 'right-only',
        fieldComparisons
      });
    });

    return compared;
  }, [compareMode, compareKey, compareFields, queryResult, queryResult2]);

  // Export comparison results to CSV
  const handleExportCompare = () => {
    if (!comparedResults || comparedResults.length === 0) {
      alert('No comparison results to export');
      return;
    }

    // Build CSV headers
    const headers = [
      'Key Value',
      'Status',
      'Left Count',
      'Right Count'
    ];

    // Add field comparison columns if fields are selected
    if (compareFields.length > 0) {
      compareFields.forEach(field => {
        headers.push(`${field} (Left)`, `${field} (Right)`, `${field} (Match)`);
      });
    } else {
      // Add all common columns from both results
      const allColumns = new Set<string>();
      if (queryResult && queryResult2) {
        queryResult.columns.forEach(col => allColumns.add(col));
        queryResult2.columns.forEach(col => allColumns.add(col));
      }
      allColumns.forEach(col => {
        headers.push(`${col} (Left)`, `${col} (Right)`);
      });
    }

    // Build CSV rows
    const rows = comparedResults.map((item) => {
      const row: string[] = [
        String(item.key || '(null)'),
        item.status,
        String(item.leftRows.length),
        String(item.rightRows.length)
      ];

      if (compareFields.length > 0) {
        // Export field comparisons
        compareFields.forEach(field => {
          const comparison = item.fieldComparisons?.[field];
          if (comparison) {
            const leftValue = comparison.left ?? 'NULL';
            const rightValue = comparison.right ?? 'NULL';
            const match = comparison.match ? 'Yes' : 'No';
            row.push(
              String(leftValue).replace(/"/g, '""'),
              String(rightValue).replace(/"/g, '""'),
              match
            );
          } else {
            row.push('N/A', 'N/A', 'N/A');
          }
        });
      } else {
        // Export all columns from first row of each side
        const allColumns = new Set<string>();
        if (queryResult && queryResult2) {
          queryResult.columns.forEach(col => allColumns.add(col));
          queryResult2.columns.forEach(col => allColumns.add(col));
        }
        allColumns.forEach(col => {
          const leftValue = item.leftRows[0]?.[col] ?? 'NULL';
          const rightValue = item.rightRows[0]?.[col] ?? 'NULL';
          row.push(
            String(leftValue).replace(/"/g, '""'),
            String(rightValue).replace(/"/g, '""')
          );
        });
      }

      return row;
    });

    // Convert to CSV format
    const csvContent = [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison_${compareKey}_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleQuerySave = async (query: string) => {
    if (!selectedConnection) {
      alert('Please select a connection first');
      return;
    }

    const name = prompt('Enter a name for this query:');
    if (!name) return;

    try {
      const response = await fetch('/api/queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId: selectedConnection.id,
          name,
          query,
        }),
      });

      if (response.ok) {
        alert('Query saved successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save query');
      }
    } catch (error) {
      console.error('Failed to save query:', error);
      alert('Failed to save query');
    }
  };

  const handleQuerySelect = (query: string) => {
    // Add query to the active editor based on split screen mode
    if (splitScreen) {
      // In split screen, add to editor1 by default (or could be made configurable)
      if (editor1Ref.current) {
        editor1Ref.current.addQueryToTab(query);
      }
    } else {
      // In single mode, add to the single editor
      if (singleEditorRef.current) {
        singleEditorRef.current.addQueryToTab(query);
      }
    }
  };

  const handleQueryExecute = async (query: string) => {
    if (!selectedConnection) {
      alert('Please select a connection first');
      return;
    }

    const executeSavedQuery = async () => {
      // Add query to a new tab and execute it
      if (typeof window !== 'undefined' && window.addQueryToTab) {
        window.addQueryToTab(query);
      }
      
      // Process query to ensure complete lines with semicolons are considered
      const processedQuery = processQuery(query);
      
      try {
        const response = await fetch('/api/query/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            connectionId: selectedConnection.id,
            query: processedQuery,
          }),
        });

        const data = await response.json();

        if (data.success) {
          setQueryResult({ ...data.result, query: processedQuery });
        } else {
          alert(data.error || 'Query execution failed');
        }
      } catch (error: unknown) {
        alert(getErrorMessage(error) || 'Failed to execute query');
      }
    };

    const connectionNames = selectedConnection?.name ? [selectedConnection.name] : [];
    if (requestDeleteConfirmation([query], executeSavedQuery, connectionNames)) {
      return;
    }

    await executeSavedQuery();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          selectedConnectionId={selectedConnection?.id}
          onConnectionSelect={handleConnectionSelect}
        />

        <MainContent
          sidebarOpen={sidebarOpen}
          onOpenSidebar={() => setSidebarOpen(true)}
          splitScreen={splitScreen}
          onToggleSplitScreen={() => {
            setSplitScreen(!splitScreen);
            if (!splitScreen) {
              setCompareMode(false);
              setCompareKey('');
            }
          }}
          compareMode={compareMode}
          canCompare={Boolean(splitScreen && queryResult && queryResult2)}
          onToggleCompare={() => {
            if (!compareMode) {
              setShowCompareModal(true);
            } else {
              setCompareMode(false);
              setCompareKey('');
              setCompareFields([]);
            }
          }}
          queryResult={queryResult}
          queryResult2={queryResult2}
          queryResultsHeight={queryResultsHeight}
          savedQueriesHeight={savedQueriesHeight}
          splitScreenWidth={splitScreenWidth}
          isExecutingActiveTabs={isExecutingActiveTabs}
          onExecuteActiveTabs={handleExecuteActiveTabs}
          comparedResults={comparedResults}
          compareKey={compareKey}
          compareFields={compareFields}
          isReExecuting={isReExecuting}
          onExportCompare={handleExportCompare}
          onReExecuteCompare={handleReExecuteCompare}
          onOpenCompareFieldsModal={() => setShowCompareFieldsModal(true)}
          onCloseCompareResults={() => {
            setCompareMode(false);
            setCompareKey('');
            setCompareFields([]);
          }}
          isLoadingResult1={isLoadingResult1}
          isLoadingResult2={isLoadingResult2}
          onStartResizeResults={(e) => {
            e.preventDefault();
            setIsResizing(true);
          }}
          onStartResizeSavedQueries={(e) => {
            e.preventDefault();
            setIsResizingSavedQueries(true);
          }}
          onStartResizeSplit={(e) => {
            e.preventDefault();
            setIsResizingSplit(true);
          }}
          selectedConnectionId={selectedConnection?.id}
          onQuerySave={handleQuerySave}
          onQueryResult1={(result, query) => handleQueryResult(result, query, false)}
          onQueryResult2={(result, query) => handleQueryResult(result, query, true)}
          onQueryResultSingle={handleQueryResult}
          onActiveQueryChange1={setActiveQuery1}
          onActiveQueryChange2={setActiveQuery2}
          onConnectionChange1={setActiveConnectionId1}
          onConnectionChange2={setActiveConnectionId2}
          onQueryStart1={() => setIsLoadingResult1(true)}
          onQueryStart2={() => setIsLoadingResult2(true)}
          onQueryError1={() => setIsLoadingResult1(false)}
          onQueryError2={() => setIsLoadingResult2(false)}
          editorRef1={editor1Ref}
          editorRef2={editor2Ref}
          editorRefSingle={singleEditorRef}
          onQuerySelect={handleQuerySelect}
          onQueryExecute={handleQueryExecute}
          showCompareModal={showCompareModal}
          showCompareFieldsModal={showCompareFieldsModal}
          commonColumns={commonColumns}
          onCompareKeyChange={setCompareKey}
          onCancelCompareKey={() => {
            setShowCompareModal(false);
            setCompareKey('');
          }}
          onConfirmCompareKey={() => {
            if (compareKey) {
              setCompareMode(true);
              setShowCompareModal(false);
              setTimeout(() => setShowCompareFieldsModal(true), 100);
            }
          }}
          onToggleCompareField={(field, checked) => {
            if (checked) {
              setCompareFields([...compareFields, field]);
            } else {
              setCompareFields(compareFields.filter((f) => f !== field));
            }
          }}
          onSkipCompareFields={() => {
            setShowCompareFieldsModal(false);
            setCompareFields([]);
          }}
          onDoneCompareFields={() => setShowCompareFieldsModal(false)}
          onCloseCompareFields={() => setShowCompareFieldsModal(false)}
        />

        <ConfirmModal
          open={deleteConfirm.open}
          title={deleteConfirm.title}
          message={deleteConfirm.message}
          confirmLabel={deleteConfirm.confirmLabel}
          confirmTone={deleteConfirm.confirmTone}
          onCancel={closeDeleteConfirm}
          onConfirm={() => {
            const action = deleteConfirm.onConfirm;
            closeDeleteConfirm();
            if (action) {
              action();
            }
          }}
        />
      </div>
    </div>
  );
}
