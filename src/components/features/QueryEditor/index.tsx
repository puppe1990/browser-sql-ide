'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { ChangeEvent } from 'react';
import Editor from '@monaco-editor/react';
import { processQuery } from '@/lib/query-utils';
import { getErrorMessage } from '@/lib/utils';
import type { QueryResult } from '@/types';
import type * as Monaco from 'monaco-editor';
import EditorHeader from './_components/EditorHeader';
import EditorFooter from './_components/EditorFooter';
import type { Connection } from './types';
import { findErrorLine, getQueryFromEditor } from './utils';

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

const STORAGE_KEY = 'browser-sql-ide-query';

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
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<number | undefined>(connectionId);

  const loadConnections = useCallback(async () => {
    try {
      const response = await fetch('/api/connections');
      const data = await response.json();
      const loadedConnections = data.connections || [];
      setConnections(loadedConnections);

      if (loadedConnections.length === 0) {
        if (selectedConnectionId !== undefined) {
          setSelectedConnectionId(undefined);
        }
        return;
      }

      const hasSelected = selectedConnectionId !== undefined &&
        loadedConnections.some((conn: Connection) => conn.id === selectedConnectionId);
      const nextConnectionId = hasSelected ? selectedConnectionId : loadedConnections[0].id;

      if (nextConnectionId !== selectedConnectionId) {
        setSelectedConnectionId(nextConnectionId);
      }
      if (onConnectionChange) {
        onConnectionChange(nextConnectionId);
      }
    } catch (error) {
      console.error('Failed to load connections:', error);
    }
  }, [onConnectionChange, selectedConnectionId]);

  // Load connections and auto-select first one
  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  useEffect(() => {
    const handleConnectionsUpdated = () => {
      loadConnections();
    };

    window.addEventListener('connections-updated', handleConnectionsUpdated);
    return () => {
      window.removeEventListener('connections-updated', handleConnectionsUpdated);
    };
  }, [loadConnections]);

  // Update selected connection when connectionId prop changes
  useEffect(() => {
    if (connectionId !== undefined) {
      setSelectedConnectionId(connectionId);
    }
  }, [connectionId]);

  // Handle connection selection change
  const handleConnectionChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newConnectionId = parseInt(e.target.value, 10);
    setSelectedConnectionId(newConnectionId);
    if (onConnectionChange) {
      onConnectionChange(newConnectionId);
    }
  };

  // Load query from localStorage on mount if initialQuery is empty (fallback for non-tabbed usage)
  const [query, setQuery] = useState(() => {
    // If onQueryChange is provided, we're in tabbed mode - always use initialQuery
    if (onQueryChange !== undefined) {
      return initialQuery || '';
    }
    // Otherwise, fallback to localStorage for standalone usage
    if (initialQuery) {
      return initialQuery;
    }
    if (typeof window !== 'undefined') {
      const savedQuery = localStorage.getItem(STORAGE_KEY);
      return savedQuery || '';
    }
    return '';
  });
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorLine, setErrorLine] = useState<number | null>(null);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const isExecutingRef = useRef(false);
  const connectionIdRef = useRef(connectionId);
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

  // Highlight error line in editor
  useEffect(() => {
    if (error && errorLine && editorRef.current && monacoRef.current) {
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      
      // Remove previous decoration
      const oldDecorations = errorDecorationRef.current ? [errorDecorationRef.current] : [];
      
      // Add new decoration to highlight the error line
      const lineNumber = errorLine;
      const maxColumn = editor.getModel()?.getLineMaxColumn(lineNumber) || 1;
      const range = new monaco.Range(lineNumber, 1, lineNumber, maxColumn);
      
      const newDecorations = editor.deltaDecorations(
        oldDecorations,
        [
          {
            range: range,
            options: {
              isWholeLine: true,
              className: 'monaco-error-line',
              glyphMarginClassName: 'monaco-error-glyph',
              minimap: {
                color: '#ef4444',
                position: monaco.editor.MinimapPosition.Inline,
              },
              overviewRuler: {
                color: '#ef4444',
                position: monaco.editor.OverviewRulerLane.Right,
              },
              hoverMessage: { value: error },
            },
          },
        ]
      );
      
      errorDecorationRef.current = newDecorations[0];
      
      // Scroll to error line
      editor.revealLineInCenter(lineNumber);
    } else if (!error && errorDecorationRef.current && editorRef.current) {
      // Clear decoration when error is cleared
      editorRef.current.deltaDecorations([errorDecorationRef.current], []);
      errorDecorationRef.current = null;
    }
  }, [error, errorLine]);

  // Save query to localStorage when it changes (debounced) - only if onQueryChange is not provided (fallback for non-tabbed usage)
  useEffect(() => {
    if (!onQueryChange) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem(STORAGE_KEY, query);
      }, 500); // Debounce by 500ms to avoid too frequent writes

      return () => clearTimeout(timeoutId);
    }
  }, [query, onQueryChange]);

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
        const editorElement = editor.getContainerDomNode();
        
        // Only execute if editor or its container has focus
        if (document.activeElement === editorElement || editorElement.contains(document.activeElement)) {
          e.preventDefault();
          e.stopPropagation();
          
          const queryToExecute = getQueryFromEditor(editor, query);
          
          const currentConnectionId = selectedConnectionId || connectionIdRef.current;
          if (currentConnectionId && queryToExecute.trim() && !isExecutingRef.current && handleExecuteRef.current) {
            // Process query to ensure complete lines with semicolons are considered
            const processedQuery = processQuery(queryToExecute);
            handleExecuteRef.current(processedQuery);
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
      const queryToExecute = getQueryFromEditor(editor, query);
      
      const currentConnectionId = selectedConnectionId || connectionIdRef.current;
      if (currentConnectionId && queryToExecute.trim() && !isExecutingRef.current && handleExecuteRef.current) {
        // Process query to ensure complete lines with semicolons are considered
        const processedQuery = processQuery(queryToExecute);
        handleExecuteRef.current(processedQuery);
      }
    };

    // Register the command with Monaco Editor
    // Using KeyMod.CtrlCmd which works for both Ctrl (Windows/Linux) and Cmd (Mac)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, executeCommand);
  };

  const handleExecute = async (queryToExecute?: string) => {
    const queryValue = queryToExecute ?? getQueryFromEditor(editorRef.current, query);
    
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

    // Process query to ensure complete lines with semicolons are considered
    const processedQuery = processQuery(queryValue);

    try {
      const response = await fetch('/api/query/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId: connectionToUse,
          query: processedQuery,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const resultData = data.result as QueryResult;
        setResult(resultData);
        if (onQueryResult) {
          // Pass the original query (before processing) along with the result for pagination
          onQueryResult(resultData, queryValue || undefined);
        }
      } else {
        const errorMessage = data.error || 'Query execution failed';
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
    </div>
  );
}
