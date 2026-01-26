'use client';

import { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Save, Loader2 } from 'lucide-react';

interface QueryEditorProps {
  connectionId?: number;
  initialQuery?: string;
  onQuerySave?: (query: string) => void;
  onQueryResult?: (result: any) => void;
}

export default function QueryEditor({
  connectionId,
  initialQuery = '',
  onQuerySave,
  onQueryResult,
}: QueryEditorProps) {
  const [query, setQuery] = useState(initialQuery);

  // Update query when initialQuery prop changes
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<any>(null);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
    // Configure SQL language features
    editor.updateOptions({
      minimap: { enabled: false },
      fontSize: 14,
      wordWrap: 'on',
      automaticLayout: true,
    });
  };

  const handleExecute = async () => {
    if (!connectionId) {
      alert('Please select a connection first');
      return;
    }

    if (!query.trim()) {
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
          query: query.trim(),
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
            onClick={handleExecute}
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
          onChange={(value) => setQuery(value || '')}
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
