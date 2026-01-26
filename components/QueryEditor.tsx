'use client';

import { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Save, Loader2 } from 'lucide-react';
import { processQuery } from '@/lib/query-utils';

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
  const [errorLine, setErrorLine] = useState<number | null>(null);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const isExecutingRef = useRef(false);
  const connectionIdRef = useRef(connectionId);
  const handleExecuteRef = useRef<((queryToExecute?: string) => Promise<void>) | null>(null);
  const errorDecorationRef = useRef<any>(null);

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

  // Function to find line number from error message
  const findErrorLine = (errorMessage: string, queryText: string): number | null => {
    // Try to extract line number from error message (common patterns)
    const lineNumberMatch = errorMessage.match(/line\s+(\d+)|position\s+(\d+)|at\s+line\s+(\d+)/i);
    if (lineNumberMatch) {
      const lineNum = parseInt(lineNumberMatch[1] || lineNumberMatch[2] || lineNumberMatch[3], 10);
      if (lineNum > 0) {
        return lineNum;
      }
    }

    // Try to find column name or table name in error and locate it in query
    const lines = queryText.split('\n');
    const errorLower = errorMessage.toLowerCase();
    
    // Common error patterns - extract column/table name
    const columnMatch = errorMessage.match(/column\s+["']?(\w+)["']?/i);
    const tableMatch = errorMessage.match(/table\s+["']?(\w+)["']?/i);
    const relationMatch = errorMessage.match(/relation\s+["']?(\w+)["']?/i);
    
    const searchTerm = columnMatch?.[1] || tableMatch?.[1] || relationMatch?.[1];
    
    if (searchTerm) {
      // Search for the term in query lines (prioritize WHERE clauses and lines with semicolons)
      const searchTermLower = searchTerm.toLowerCase();
      
      // First, check lines with WHERE clause or semicolons (most likely to contain the error)
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        const lineLower = line.toLowerCase();
        const lineTrimmed = line.trim();
        
        // Check if line contains WHERE or ends with semicolon and contains the search term
        if ((lineLower.includes('where') || lineTrimmed.endsWith(';')) && 
            lineLower.includes(searchTermLower)) {
          return i + 1; // Return 1-based line number
        }
      }
      
      // If not found, search all lines
      for (let i = 0; i < lines.length; i++) {
        const lineLower = lines[i].toLowerCase();
        // Check if line contains the search term (as a whole word or column reference)
        if (lineLower.includes(searchTermLower)) {
          return i + 1; // Return 1-based line number
        }
      }
    }

    // If error mentions specific SQL keywords, try to find them
    if (errorLower.includes('syntax error') || errorLower.includes('parse error')) {
      // For syntax errors, check lines with semicolons or WHERE clauses
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (line.endsWith(';') || line.toLowerCase().startsWith('where')) {
          return i + 1;
        }
      }
    }

    return null;
  };

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
            // Process query to ensure complete lines with semicolons are considered
            const processedQuery = processQuery(currentQuery);
            handleExecuteRef.current(processedQuery);
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
      const currentQuery = editor.getValue();
      if (connectionIdRef.current && currentQuery.trim() && !isExecutingRef.current && handleExecuteRef.current) {
        // Process query to ensure complete lines with semicolons are considered
        const processedQuery = processQuery(currentQuery);
        handleExecuteRef.current(processedQuery);
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
    setErrorLine(null);
    setResult(null);

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
          connectionId,
          query: processedQuery,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.result);
        if (onQueryResult) {
          onQueryResult(data.result);
        }
      } else {
        const errorMessage = data.error || 'Query execution failed';
        setError(errorMessage);
        // Try to find the line number where the error occurred
        const lineNum = findErrorLine(errorMessage, queryValue);
        if (lineNum) {
          setErrorLine(lineNum);
        }
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to execute query';
      setError(errorMessage);
      // Try to find the line number where the error occurred
      const lineNum = findErrorLine(errorMessage, queryValue);
      if (lineNum) {
        setErrorLine(lineNum);
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
              <p className="text-red-700 dark:text-red-300 text-xs mt-1">
                {error}
                {errorLine && (
                  <span className="block mt-1 text-red-600 dark:text-red-400 font-medium">
                    → Line {errorLine}
                  </span>
                )}
              </p>
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
