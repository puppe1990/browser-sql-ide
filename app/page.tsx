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
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Browser SQL IDE
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            A comprehensive web-based SQL IDE for database management
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          {/* Connections Panel */}
          <div className="lg:col-span-1">
            <ConnectionManager
              onConnectionSelect={handleConnectionSelect}
              selectedConnectionId={selectedConnection?.id}
            />
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Query Editor */}
            <div className="h-96">
              <QueryEditor
                connectionId={selectedConnection?.id}
                initialQuery={currentQuery}
                onQuerySave={handleQuerySave}
                onQueryResult={handleQueryResult}
              />
            </div>

            {/* Query Results */}
            {queryResult && (
              <DataVisualization result={queryResult} />
            )}
          </div>
        </div>

        {/* Saved Queries Panel */}
        <div className="h-96">
          <SavedQueries
            connectionId={selectedConnection?.id}
            onQuerySelect={handleQuerySelect}
            onQueryExecute={handleQueryExecute}
          />
        </div>
      </div>
    </div>
  );
}
