'use client';

import { useState, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import Editor from '@monaco-editor/react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { getErrorMessage } from '@/lib/utils';
import { getDeleteConfirmationInfo } from '@/lib/query-utils';
import type { QueryResult } from '@/types';
import type * as Monaco from 'monaco-editor';
import EditorHeader from './_components/EditorHeader';
import EditorFooter from './_components/EditorFooter';
import { findErrorLine, getQueryFromEditor } from './utils';
import {
  executeQueryRequest,
  getInitialQuery,
  QUERY_STORAGE_KEY,
  useConnections,
  useDebouncedLocalStorage,
  useErrorDecoration,
} from './helpers';

interface QueryEditorProps {
  connectionId?: number;
  initialQuery?: string;
  onQuerySave?: (query: string) => void;
  onQueryResult?: (result: QueryResult, query?: string) => void;
  onQueryChange?: (query: string) => void;
  onConnectionChange?: (connectionId: number) => void;
  onQueryStart?: () => void; // Callback when query execution starts
  onQueryError?: () => void; // Callback when query execution fails
}

export default function QueryEditor({
  connectionId,
  initialQuery = '',
  onQuerySave,
  onQueryResult,
  onQueryChange,
  onConnectionChange,
  onQueryStart,
  onQueryError,
}: QueryEditorProps) {
  const {
    connections,
    selectedConnectionId,
    handleConnectionChange,
  } = useConnections({ connectionId, onConnectionChange });

  // Load query from localStorage on mount if initialQuery is empty (fallback for non-tabbed usage)
  const [query, setQuery] = useState(() => {
    const isTabbed = onQueryChange !== undefined;
    return getInitialQuery({ initialQuery, isTabbed });
  });
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorLine, setErrorLine] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    query: string;
    title: string;
    message: ReactNode;
    confirmLabel: string;
    confirmTone: 'primary' | 'danger';
  }>({
    open: false,
    query: '',
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    confirmTone: 'primary' as 'primary' | 'danger',
  });
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const isExecutingRef = useRef(false);
  const connectionIdRef = useRef(connectionId);
  const isEditorFocusedRef = useRef(false);
  const handleExecuteRef = useRef<((queryToExecute?: string) => Promise<void>) | null>(null);
  const errorDecorationRef = useRef<string | null>(null);

  // Update query when initialQuery prop changes (always update, even if empty string)
  // Also reset result and error when switching tabs
  useEffect(() => {
    // If onQueryChange is provided, we're in tabbed mode - always sync with initialQuery
    if (onQueryChange !== undefined) {
      setQuery(initialQuery || '');
      setResult(null);
      setError(null);
      setErrorLine(null);
      // Clear error decoration when switching tabs
      if (editorRef.current && errorDecorationRef.current) {
        editorRef.current.deltaDecorations([errorDecorationRef.current], []);
        errorDecorationRef.current = null;
      }
    } else if (initialQuery !== undefined) {
      // Standalone mode - only update if initialQuery is provided
      setQuery(initialQuery);
    }
  }, [initialQuery, onQueryChange]);

  useErrorDecoration({
    error,
    errorLine,
    editorRef,
    monacoRef,
    errorDecorationRef,
  });

  // Save query to localStorage when it changes (debounced) - only if onQueryChange is not provided (fallback for non-tabbed usage)
  useDebouncedLocalStorage({
    key: QUERY_STORAGE_KEY,
    value: query,
    enabled: onQueryChange === undefined,
  });

  // Keep refs in sync
  useEffect(() => {
    isExecutingRef.current = isExecuting;
  }, [isExecuting]);

  useEffect(() => {
    connectionIdRef.current = selectedConnectionId || connectionId;
  }, [selectedConnectionId, connectionId]);

  // Add global keyboard shortcut listener as fallback
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCtrlCmd = isMac ? e.metaKey : e.ctrlKey;
      
      // Check if editor is focused (Monaco editor has focus)
      if (isCtrlCmd && e.key === 'Enter' && editorRef.current) {
        const editor = editorRef.current;
        // Only execute if this editor has focus (prevents split-screen double-fire)
        if (isEditorFocusedRef.current || editor.hasTextFocus()) {
          e.preventDefault();
          e.stopPropagation();

          const queryToExecute = getQueryFromEditor(editor, query);

          const currentConnectionId = selectedConnectionId || connectionIdRef.current;
          if (currentConnectionId && queryToExecute.trim() && !isExecutingRef.current && handleExecuteRef.current) {
            handleExecuteRef.current(queryToExecute);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedConnectionId, query]);

  const handleEditorDidMount = (editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    isEditorFocusedRef.current = editor.hasTextFocus();
    // Configure SQL language features
    editor.updateOptions({
      minimap: { enabled: false },
      fontSize: 14,
      wordWrap: 'on',
      automaticLayout: true,
    });

    // Add keyboard shortcut: Ctrl+Enter (Windows/Linux) or Cmd+Return (Mac) to execute query
    // KeyMod.CtrlCmd automatically handles Ctrl on Windows/Linux and Cmd on Mac
    const executeCommand = () => {
      if (!isEditorFocusedRef.current && !editor.hasTextFocus()) return;

      const queryToExecute = getQueryFromEditor(editor, query);
      
      const currentConnectionId = selectedConnectionId || connectionIdRef.current;
      if (currentConnectionId && queryToExecute.trim() && !isExecutingRef.current && handleExecuteRef.current) {
        handleExecuteRef.current(queryToExecute);
      }
    };

    // Register the command with Monaco Editor
    // Using KeyMod.CtrlCmd which works for both Ctrl (Windows/Linux) and Cmd (Mac)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, executeCommand);

    const focusDisposable = editor.onDidFocusEditorText(() => {
      isEditorFocusedRef.current = true;
    });
    const blurDisposable = editor.onDidBlurEditorText(() => {
      isEditorFocusedRef.current = false;
    });
    editor.onDidDispose(() => {
      focusDisposable.dispose();
      blurDisposable.dispose();
      if (editorRef.current === editor) {
        editorRef.current = null;
      }
      if (monacoRef.current === monaco) {
        monacoRef.current = null;
      }
    });
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirm((prev) => ({ ...prev, open: false }));
  };

  const executeQuery = async (queryValue: string) => {
    const connectionToUse = selectedConnectionId || connectionId;
    if (!connectionToUse) {
      alert('Please select a connection first');
      return;
    }

    if (!queryValue.trim()) {
      alert('Please enter a query or select text to execute');
      return;
    }

    setIsExecuting(true);
    setError(null);
    setErrorLine(null);
    setResult(null);

    // Notify parent that query execution started
    if (onQueryStart) {
      onQueryStart();
    }

    // Clear previous error decoration
    if (editorRef.current && errorDecorationRef.current) {
      editorRef.current.deltaDecorations([errorDecorationRef.current], []);
      errorDecorationRef.current = null;
    }

    try {
      const resultData = await executeQueryRequest(connectionToUse, queryValue);
      setResult(resultData);
      if (onQueryResult) {
        // Pass the original query (before processing) along with the result for pagination
        onQueryResult(resultData, queryValue || undefined);
      }
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err) || 'Failed to execute query';
      setError(errorMessage);
      // Try to find the line number where the error occurred
      const lineNum = findErrorLine(errorMessage, queryValue);
      if (lineNum) {
        setErrorLine(lineNum);
      }
      // Notify parent about error
      if (onQueryError) {
        onQueryError();
      }
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExecute = async (queryToExecute?: string) => {
    const queryValue = queryToExecute ?? getQueryFromEditor(editorRef.current, query);
    
    const deleteInfo = getDeleteConfirmationInfo(queryValue);
    if (deleteInfo.hasDelete) {
      const resolvedConnectionId = selectedConnectionId ?? connectionId;
      const connectionName = resolvedConnectionId
        ? connections.find((connection) => connection.id === resolvedConnectionId)?.name
        : undefined;
      const hasTables = deleteInfo.tableNames.length > 0;
      const tableLabel = deleteInfo.tableNames.length > 1 ? 'Tables' : 'Table';
      const tableText = deleteInfo.tableNames.join(', ');
      const message = connectionName || hasTables ? (
        <div>
          <div>{deleteInfo.message}</div>
          {hasTables && (
            <div className="mt-2 text-sm font-medium text-white">{tableLabel}: {tableText}</div>
          )}
          {connectionName && (
            <div className={`${hasTables ? 'mt-1' : 'mt-2'} text-sm font-medium text-white`}>
              Connection: {connectionName}
            </div>
          )}
        </div>
      ) : deleteInfo.message;

      setDeleteConfirm({
        open: true,
        query: queryValue,
        title: deleteInfo.title,
        message,
        confirmLabel: deleteInfo.hasDeleteWithoutWhere
          ? 'Yes, delete all rows'
          : 'Yes, run DELETE',
        confirmTone: 'danger',
      });
      return;
    }

    await executeQuery(queryValue);
  };

  // Keep handleExecute ref in sync
  useEffect(() => {
    handleExecuteRef.current = handleExecute;
  });

  const handleSave = () => {
    if (onQuerySave) {
      onQuerySave(query);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden">
      <EditorHeader
        connections={connections}
        selectedConnectionId={selectedConnectionId}
        isExecuting={isExecuting}
        canExecute={Boolean(selectedConnectionId || connectionId)}
        hasQuery={Boolean(query.trim())}
        onConnectionChange={handleConnectionChange}
        onSave={handleSave}
        onExecute={() => handleExecute()}
      />

      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          defaultLanguage="sql"
          value={query}
          onChange={(value) => {
            const newQuery = value || '';
            setQuery(newQuery);
            if (onQueryChange) {
              onQueryChange(newQuery);
            }
          }}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: 'on',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            tabSize: 2,
          }}
        />
      </div>

      <EditorFooter error={error} errorLine={errorLine} result={result} />

      <ConfirmModal
        open={deleteConfirm.open}
        title={deleteConfirm.title}
        message={deleteConfirm.message}
        confirmLabel={deleteConfirm.confirmLabel}
        confirmTone={deleteConfirm.confirmTone}
        onCancel={closeDeleteConfirm}
        onConfirm={() => {
          const pendingQuery = deleteConfirm.query;
          closeDeleteConfirm();
          executeQuery(pendingQuery);
        }}
      />
    </div>
  );
}
