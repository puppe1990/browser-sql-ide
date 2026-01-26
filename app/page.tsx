'use client';

import { useState, useEffect } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import ConnectionManager from '@/components/ConnectionManager';
import TabbedQueryEditor from '@/components/TabbedQueryEditor';
import DataVisualization from '@/components/DataVisualization';
import SavedQueries from '@/components/SavedQueries';

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
  executionTime: number;
}

const STORAGE_KEYS = {
  SIDEBAR_OPEN: 'browser-sql-ide-sidebar-open',
};

export default function Home() {
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Load sidebar state from localStorage on mount
  useEffect(() => {
    const savedSidebarOpen = localStorage.getItem(STORAGE_KEYS.SIDEBAR_OPEN);
    if (savedSidebarOpen !== null) {
      setSidebarOpen(savedSidebarOpen === 'true');
    }
  }, []);

  // Save sidebar state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SIDEBAR_OPEN, String(sidebarOpen));
  }, [sidebarOpen]);

  const handleConnectionSelect = (connection: Connection) => {
    setSelectedConnection(connection);
  };

  const handleQueryResult = (result: QueryResult) => {
    setQueryResult(result);
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
    
    try {
      const response = await fetch('/api/query/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId: selectedConnection.id,
          query: query.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setQueryResult(data.result);
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
          <div className="flex-1 flex flex-col border-b border-slate-200 dark:border-slate-800">
            <TabbedQueryEditor
              connectionId={selectedConnection?.id}
              onQuerySave={handleQuerySave}
              onQueryResult={handleQueryResult}
              onQuerySelect={handleQuerySelect}
            />
          </div>

          {/* Query Results */}
          {queryResult && (
            <div className="flex-1 overflow-auto">
              <DataVisualization result={queryResult} />
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
