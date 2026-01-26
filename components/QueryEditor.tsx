'use client';

import { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Save, Loader2 } from 'lucide-react';

interface QueryEditorProps {
  connectionId?: number;
  initialQuery?: string;
  onQuerySave?: (query: string) => void;
  onQueryResult?: (result: any) => void;
  onQueryChange?: (query: string) => void;
}

const STORAGE_KEY = 'browser-sql-ide-query';

export default function QueryEditor({
  connectionId,
  initialQuery = '',
  onQuerySave,
  onQueryResult,
  onQueryChange,
}: QueryEditorProps) {
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
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<any>(null);
  const isExecutingRef = useRef(false);
  const connectionIdRef = useRef(connectionId);
  const handleExecuteRef = useRef<((queryToExecute?: string) => Promise<void>) | null>(null);

  // Update query when initialQuery prop changes (always update, even if empty string)
  // Also reset result and error when switching tabs
  useEffect(() => {
    // If onQueryChange is provided, we're in tabbed mode - always sync with initialQuery
    if (onQueryChange !== undefined) {
      setQuery(initialQuery || '');
      setResult(null);
      setError(null);
    } else if (initialQuery !== undefined) {
      // Standalone mode - only update if initialQuery is provided
      setQuery(initialQuery);
    }
  }, [initialQuery, onQueryChange]);

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
    connectionIdRef.current = connectionId;
  }, [connectionId]);

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
          
          const currentQuery = editor.getValue();
          if (connectionIdRef.current && currentQuery.trim() && !isExecutingRef.current && handleExecuteRef.current) {
            handleExecuteRef.current(currentQuery);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
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
      const currentQuery = editor.getValue();
      if (connectionIdRef.current && currentQuery.trim() && !isExecutingRef.current && handleExecuteRef.current) {
        handleExecuteRef.current(currentQuery);
      }
    };

    // Register the command with Monaco Editor
    // Using KeyMod.CtrlCmd which works for both Ctrl (Windows/Linux) and Cmd (Mac)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, executeCommand);
  };

  const handleExecute = async (queryToExecute?: string) => {
    const queryValue = queryToExecute || query;
    
    if (!connectionId) {
      alert('Please select a connection first');
      return;
    }

    if (!queryValue.trim()) {
      alert('Please enter a query');
      return;
    }

    setIsExecuting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/query/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId,
          query: queryValue.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.result);
        if (onQueryResult) {
          onQueryResult(data.result);
        }
      } else {
        setError(data.error || 'Query execution failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to execute query');
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
      <div className="flex justify-between items-center px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
          Query Editor
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={!query.trim()}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            Save
          </button>
          <button
            onClick={() => handleExecute()}
            disabled={isExecuting || !connectionId}
            className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {isExecuting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            Execute
          </button>
        </div>
      </div>

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

      {(error || result) && (
        <div className="border-t border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-900">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2">
              <p className="text-red-800 dark:text-red-200 text-xs font-semibold">Error:</p>
              <p className="text-red-700 dark:text-red-300 text-xs mt-1">{error}</p>
            </div>
          )}
          {result && (
            <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-400">
              <span>
                {result.rowCount} row{result.rowCount !== 1 ? 's' : ''} returned
              </span>
              <span>Execution time: {result.executionTime}ms</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
