'use client';

import { useState } from 'react';
import ConnectionManager from '@/components/ConnectionManager';
import QueryEditor from '@/components/QueryEditor';
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

export default function Home() {
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [currentQuery, setCurrentQuery] = useState('');

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
    setCurrentQuery(query);
  };

  const handleQueryExecute = async (query: string) => {
    if (!selectedConnection) {
      alert('Please select a connection first');
      return;
    }

    setCurrentQuery(query);
    
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
        <aside className="w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Browser SQL IDE
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Database management
            </p>
          </div>
          <div className="flex-1 overflow-auto">
            <ConnectionManager
              onConnectionSelect={handleConnectionSelect}
              selectedConnectionId={selectedConnection?.id}
            />
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Query Editor */}
          <div className="flex-1 flex flex-col border-b border-slate-200 dark:border-slate-800">
            <QueryEditor
              connectionId={selectedConnection?.id}
              initialQuery={currentQuery}
              onQuerySave={handleQuerySave}
              onQueryResult={handleQueryResult}
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
