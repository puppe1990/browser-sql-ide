'use client';

import { useState, useEffect } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import ConnectionManager from '@/components/ConnectionManager';
import TabbedQueryEditor from '@/components/TabbedQueryEditor';
import DataVisualization from '@/components/DataVisualization';
import SavedQueries from '@/components/SavedQueries';
import { processQuery } from '@/lib/query-utils';

interface Connection {
  id: number;
  name: string;
  type: string;
  host: string;
  port: number;
  database: string;
  username: string;
  ssl: boolean;
}

interface QueryResult {
  columns: string[];
  rows: any[];
  rowCount: number;
  totalCount?: number;
  executionTime: number;
  hasMore?: boolean;
}

interface QueryResultWithMeta extends QueryResult {
  query?: string; // Original query for pagination
}

const STORAGE_KEYS = {
  SIDEBAR_OPEN: 'browser-sql-ide-sidebar-open',
  QUERY_RESULTS_HEIGHT: 'browser-sql-ide-query-results-height',
};

export default function Home() {
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResultWithMeta | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [queryResultsHeight, setQueryResultsHeight] = useState<number>(400); // Default height in pixels
  const [isResizing, setIsResizing] = useState(false);

  // Load sidebar state and query results height from localStorage on mount
  useEffect(() => {
    const savedSidebarOpen = localStorage.getItem(STORAGE_KEYS.SIDEBAR_OPEN);
    if (savedSidebarOpen !== null) {
      setSidebarOpen(savedSidebarOpen === 'true');
    }
    
    const savedHeight = localStorage.getItem(STORAGE_KEYS.QUERY_RESULTS_HEIGHT);
    if (savedHeight !== null) {
      const height = parseInt(savedHeight, 10);
      if (!isNaN(height) && height > 0) {
        setQueryResultsHeight(height);
      }
    }
  }, []);

  // Save sidebar state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SIDEBAR_OPEN, String(sidebarOpen));
  }, [sidebarOpen]);

  // Save query results height to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.QUERY_RESULTS_HEIGHT, String(queryResultsHeight));
  }, [queryResultsHeight]);

  // Handle resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const mainElement = document.querySelector('main');
      if (!mainElement) return;
      
      const mainRect = mainElement.getBoundingClientRect();
      const newHeight = mainRect.bottom - e.clientY;
      
      // Set min and max heights
      const minHeight = 200;
      const maxHeight = window.innerHeight - 200;
      
      if (newHeight >= minHeight && newHeight <= maxHeight) {
        setQueryResultsHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const handleConnectionSelect = (connection: Connection) => {
    setSelectedConnection(connection);
  };

  const handleQueryResult = (result: QueryResult, query?: string) => {
    setQueryResult({ ...result, query });
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
    // Add query to a new tab using the global function exposed by TabbedQueryEditor
    if (typeof window !== 'undefined' && (window as any).addQueryToTab) {
      (window as any).addQueryToTab(query);
    }
  };

  const handleQueryExecute = async (query: string) => {
    if (!selectedConnection) {
      alert('Please select a connection first');
      return;
    }

    // Add query to a new tab and execute it
    if (typeof window !== 'undefined' && (window as any).addQueryToTab) {
      (window as any).addQueryToTab(query);
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
    } catch (error: any) {
      alert(error.message || 'Failed to execute query');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar - Connections */}
        <aside
          className={`${
            sidebarOpen ? 'w-80' : 'w-0'
          } transition-all duration-300 ease-in-out border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-hidden`}
        >
          {sidebarOpen && (
            <>
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Browser SQL IDE
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Database management
                  </p>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                  title="Close sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-auto">
                <ConnectionManager
                  onConnectionSelect={handleConnectionSelect}
                  selectedConnectionId={selectedConnection?.id}
                />
              </div>
            </>
          )}
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="absolute left-2 top-2 z-10 p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors shadow-sm"
              title="Open sidebar"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          )}
          {/* Query Editor with Tabs */}
          <div 
            className="flex flex-col border-b border-slate-200 dark:border-slate-800"
            style={{ 
              height: queryResult 
                ? `calc(100% - ${queryResultsHeight}px - 4px)` 
                : '100%',
              minHeight: queryResult ? '200px' : '0'
            }}
          >
            <TabbedQueryEditor
              connectionId={selectedConnection?.id}
              onQuerySave={handleQuerySave}
              onQueryResult={handleQueryResult}
              onQuerySelect={handleQuerySelect}
            />
          </div>

          {/* Resizer */}
          {queryResult && (
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                setIsResizing(true);
              }}
              className="h-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 cursor-row-resize transition-colors relative group"
              style={{ flexShrink: 0 }}
            >
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-transparent group-hover:bg-blue-500 dark:group-hover:bg-blue-400 transition-colors" />
            </div>
          )}

          {/* Query Results */}
          {queryResult && (
            <div 
              className="overflow-hidden"
              style={{ 
                height: `${queryResultsHeight}px`,
                minHeight: '200px',
                flexShrink: 0
              }}
            >
              <DataVisualization 
                result={queryResult} 
                connectionId={selectedConnection?.id}
                query={queryResult.query}
              />
            </div>
          )}

          {/* Saved Queries Panel */}
          {!queryResult && (
            <div className="h-80 border-t border-slate-200 dark:border-slate-800">
              <SavedQueries
                connectionId={selectedConnection?.id}
                onQuerySelect={handleQuerySelect}
                onQueryExecute={handleQueryExecute}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
