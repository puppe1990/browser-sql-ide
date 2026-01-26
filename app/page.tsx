'use client';

import { useState, useEffect, useMemo } from 'react';
import { PanelLeftClose, PanelLeftOpen, Columns, GitCompare, X } from 'lucide-react';
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
  SAVED_QUERIES_HEIGHT: 'browser-sql-ide-saved-queries-height',
  SPLIT_SCREEN: 'browser-sql-ide-split-screen',
  SPLIT_SCREEN_WIDTH: 'browser-sql-ide-split-screen-width',
};

export default function Home() {
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResultWithMeta | null>(null);
  const [queryResult2, setQueryResult2] = useState<QueryResultWithMeta | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [splitScreen, setSplitScreen] = useState(false);
  const [splitScreenWidth, setSplitScreenWidth] = useState<number>(50); // Percentage
  const [compareMode, setCompareMode] = useState(false);
  const [compareKey, setCompareKey] = useState<string>('');
  const [compareFields, setCompareFields] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showCompareFieldsModal, setShowCompareFieldsModal] = useState(false);
  const [queryResultsHeight, setQueryResultsHeight] = useState<number>(400); // Default height in pixels
  const [savedQueriesHeight, setSavedQueriesHeight] = useState<number>(320); // Default height in pixels
  const [isResizing, setIsResizing] = useState(false);
  const [isResizingSavedQueries, setIsResizingSavedQueries] = useState(false);
  const [isResizingSplit, setIsResizingSplit] = useState(false);

  // Load sidebar state and heights from localStorage on mount
  useEffect(() => {
    const savedSidebarOpen = localStorage.getItem(STORAGE_KEYS.SIDEBAR_OPEN);
    if (savedSidebarOpen !== null) {
      setSidebarOpen(savedSidebarOpen === 'true');
    }
    
    const savedQueryResultsHeight = localStorage.getItem(STORAGE_KEYS.QUERY_RESULTS_HEIGHT);
    if (savedQueryResultsHeight !== null) {
      const height = parseInt(savedQueryResultsHeight, 10);
      if (!isNaN(height) && height > 0) {
        setQueryResultsHeight(height);
      }
    }
    
    const savedSavedQueriesHeight = localStorage.getItem(STORAGE_KEYS.SAVED_QUERIES_HEIGHT);
    if (savedSavedQueriesHeight !== null) {
      const height = parseInt(savedSavedQueriesHeight, 10);
      if (!isNaN(height) && height > 0) {
        setSavedQueriesHeight(height);
      }
    }
    
    const savedSplitScreen = localStorage.getItem(STORAGE_KEYS.SPLIT_SCREEN);
    if (savedSplitScreen !== null) {
      setSplitScreen(savedSplitScreen === 'true');
    }
    
    const savedSplitScreenWidth = localStorage.getItem(STORAGE_KEYS.SPLIT_SCREEN_WIDTH);
    if (savedSplitScreenWidth !== null) {
      const width = parseFloat(savedSplitScreenWidth);
      if (!isNaN(width) && width > 0 && width < 100) {
        setSplitScreenWidth(width);
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

  // Save saved queries height to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SAVED_QUERIES_HEIGHT, String(savedQueriesHeight));
  }, [savedQueriesHeight]);

  // Save split screen state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SPLIT_SCREEN, String(splitScreen));
  }, [splitScreen]);

  // Save split screen width to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SPLIT_SCREEN_WIDTH, String(splitScreenWidth));
  }, [splitScreenWidth]);

  // Handle resizing for Query Results
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

  // Handle resizing for Saved Queries
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingSavedQueries) return;
      
      const mainElement = document.querySelector('main');
      if (!mainElement) return;
      
      const mainRect = mainElement.getBoundingClientRect();
      const newHeight = mainRect.bottom - e.clientY;
      
      // Set min and max heights
      const minHeight = 150;
      const maxHeight = window.innerHeight - 200;
      
      if (newHeight >= minHeight && newHeight <= maxHeight) {
        setSavedQueriesHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsResizingSavedQueries(false);
    };

    if (isResizingSavedQueries) {
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
  }, [isResizingSavedQueries]);

  // Handle resizing for Split Screen
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingSplit || !splitScreen) return;
      
      const mainElement = document.querySelector('main');
      if (!mainElement) return;
      
      const mainRect = mainElement.getBoundingClientRect();
      const relativeX = e.clientX - mainRect.left;
      const percentage = (relativeX / mainRect.width) * 100;
      
      // Set min and max widths (20% to 80%)
      const minWidth = 20;
      const maxWidth = 80;
      
      if (percentage >= minWidth && percentage <= maxWidth) {
        setSplitScreenWidth(percentage);
      }
    };

    const handleMouseUp = () => {
      setIsResizingSplit(false);
    };

    if (isResizingSplit) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingSplit, splitScreen]);

  const handleConnectionSelect = (connection: Connection) => {
    setSelectedConnection(connection);
  };

  const handleQueryResult = (result: QueryResult, query?: string, isSecondEditor = false) => {
    if (isSecondEditor) {
      setQueryResult2({ ...result, query });
    } else {
      setQueryResult({ ...result, query });
    }
    // Disable compare mode when new results come in
    if (compareMode) {
      setCompareMode(false);
      setCompareKey('');
      setCompareFields([]);
    }
  };

  // Get common columns for comparison
  const commonColumns = useMemo(() => {
    if (!queryResult || !queryResult2) return [];
    return queryResult.columns.filter(col => queryResult2.columns.includes(col));
  }, [queryResult, queryResult2]);

  // Compare results based on selected key
  const comparedResults = useMemo(() => {
    if (!compareMode || !compareKey || !queryResult || !queryResult2) return null;

    const result1Map = new Map();
    const result2Map = new Map();

    // Index results by compare key
    queryResult.rows.forEach((row: any) => {
      const keyValue = String(row[compareKey] ?? '');
      if (!result1Map.has(keyValue)) {
        result1Map.set(keyValue, []);
      }
      result1Map.get(keyValue).push(row);
    });

    queryResult2.rows.forEach((row: any) => {
      const keyValue = String(row[compareKey] ?? '');
      if (!result2Map.has(keyValue)) {
        result2Map.set(keyValue, []);
      }
      result2Map.get(keyValue).push(row);
    });

    // Get all unique keys
    const allKeys = new Set([...result1Map.keys(), ...result2Map.keys()]);

    // Create comparison result
    const compared: any[] = [];
    allKeys.forEach(key => {
      const rows1 = result1Map.get(key) || [];
      const rows2 = result2Map.get(key) || [];
      
      // Compare fields if selected
      let fieldComparisons: any = {};
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
          
          {/* Split Screen Toggle Button */}
          <button
            onClick={() => {
              setSplitScreen(!splitScreen);
              if (!splitScreen) {
                setCompareMode(false);
                setCompareKey('');
              }
            }}
            className={`absolute right-2 top-2 z-10 p-2 rounded transition-colors shadow-sm ${
              splitScreen
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={splitScreen ? 'Disable Split Screen' : 'Enable Split Screen'}
          >
            <Columns className="w-4 h-4" />
          </button>

          {/* Compare Button - Only visible in split screen */}
          {splitScreen && queryResult && queryResult2 && (
            <button
            onClick={() => {
              if (!compareMode) {
                setShowCompareModal(true);
              } else {
                setCompareMode(false);
                setCompareKey('');
                setCompareFields([]);
              }
            }}
              className={`absolute right-12 top-2 z-10 p-2 rounded transition-colors shadow-sm ${
                compareMode
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={compareMode ? 'Disable Compare Mode' : 'Compare Results'}
            >
              <GitCompare className="w-4 h-4" />
            </button>
          )}

          {/* Query Editor(s) */}
          {splitScreen ? (
            // Split Screen Mode
            <div 
              className="flex flex-row border-b border-slate-200 dark:border-slate-800"
              style={{ 
                height: (queryResult || queryResult2)
                  ? `calc(100% - ${queryResultsHeight}px - 4px)` 
                  : `calc(100% - ${savedQueriesHeight}px - 4px)`,
                minHeight: '200px'
              }}
            >
              {/* First Editor */}
              <div 
                className="flex flex-col border-r border-slate-200 dark:border-slate-800"
                style={{ width: `${splitScreenWidth}%` }}
              >
                <TabbedQueryEditor
                  connectionId={selectedConnection?.id}
                  onQuerySave={handleQuerySave}
                  onQueryResult={(result, query) => handleQueryResult(result, query, false)}
                  onQuerySelect={handleQuerySelect}
                />
              </div>

              {/* Split Resizer */}
              <div
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsResizingSplit(true);
                }}
                className="w-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 cursor-col-resize transition-colors relative group flex-shrink-0"
              >
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1 bg-transparent group-hover:bg-blue-500 dark:group-hover:bg-blue-400 transition-colors" />
              </div>

              {/* Second Editor */}
              <div 
                className="flex flex-col"
                style={{ width: `${100 - splitScreenWidth}%` }}
              >
                <TabbedQueryEditor
                  connectionId={selectedConnection?.id}
                  onQuerySave={handleQuerySave}
                  onQueryResult={(result, query) => handleQueryResult(result, query, true)}
                  onQuerySelect={handleQuerySelect}
                />
              </div>
            </div>
          ) : (
            // Single Editor Mode
            <div 
              className="flex flex-col border-b border-slate-200 dark:border-slate-800"
              style={{ 
                height: queryResult 
                  ? `calc(100% - ${queryResultsHeight}px - 4px)` 
                  : !queryResult 
                    ? `calc(100% - ${savedQueriesHeight}px - 4px)`
                    : '100%',
                minHeight: (queryResult || !queryResult) ? '200px' : '0'
              }}
            >
              <TabbedQueryEditor
                connectionId={selectedConnection?.id}
                onQuerySave={handleQuerySave}
                onQueryResult={handleQueryResult}
                onQuerySelect={handleQuerySelect}
              />
            </div>
          )}

          {/* Resizer for Query Results */}
          {(queryResult || queryResult2) && (
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
          {splitScreen ? (
            compareMode && comparedResults ? (
              // Compare Mode Results
              <div className="flex flex-col overflow-auto" style={{ height: `${queryResultsHeight}px`, minHeight: '200px', flexShrink: 0 }}>
                <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Comparison Results (Key: {compareKey})
                      </h3>
                      {compareFields.length > 0 && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Comparing: {compareFields.join(', ')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowCompareFieldsModal(true)}
                        className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                        title="Select fields to compare"
                      >
                        {compareFields.length > 0 ? 'Change Fields' : 'Select Fields'}
                      </button>
                      <div className="flex gap-4 text-xs">
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 bg-green-500 rounded"></span>
                          Match ({comparedResults.filter((r: any) => r.status === 'match').length})
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 bg-blue-500 rounded"></span>
                          Left Only ({comparedResults.filter((r: any) => r.status === 'left-only').length})
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 bg-orange-500 rounded"></span>
                          Right Only ({comparedResults.filter((r: any) => r.status === 'right-only').length})
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-auto">
                  <table className="w-full border-collapse">
                    <thead className="sticky top-0 z-20">
                      <tr className="bg-slate-50 dark:bg-slate-800">
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">Key Value</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">Status</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">Left Count</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">Right Count</th>
                        {compareFields.length > 0 && compareFields.map((field) => (
                          <th key={field} className="px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                            {field}
                            <br />
                            <span className="text-xs font-normal">(Left vs Right)</span>
                          </th>
                        ))}
                        {compareFields.length === 0 && (
                          <>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">Left Data</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">Right Data</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                      {comparedResults.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-mono">{item.key || '(null)'}</td>
                          <td className="px-3 py-2 text-xs">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              item.status === 'match' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                              item.status === 'left-only' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                              'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                            }`}>
                              {item.status === 'match' ? 'Match' : item.status === 'left-only' ? 'Left Only' : 'Right Only'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-900 dark:text-slate-100">{item.leftRows.length}</td>
                          <td className="px-3 py-2 text-xs text-slate-900 dark:text-slate-100">{item.rightRows.length}</td>
                          {compareFields.length > 0 ? (
                            compareFields.map((field) => {
                              const comparison = item.fieldComparisons?.[field];
                              if (!comparison) {
                                return (
                                  <td key={field} className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500">
                                    N/A
                                  </td>
                                );
                              }
                              const isMatch = comparison.match;
                              return (
                                <td key={field} className="px-3 py-2 text-xs">
                                  <div className={`p-2 rounded ${isMatch ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className={`w-2 h-2 rounded-full ${isMatch ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                      <span className={`font-medium ${isMatch ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                                        {isMatch ? 'Match' : 'Different'}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      <div>
                                        <span className="text-slate-500 dark:text-slate-400">Left:</span>
                                        <div className="font-mono mt-0.5 break-all">
                                          {String(comparison.left ?? 'NULL')}
                                        </div>
                                      </div>
                                      <div>
                                        <span className="text-slate-500 dark:text-slate-400">Right:</span>
                                        <div className="font-mono mt-0.5 break-all">
                                          {String(comparison.right ?? 'NULL')}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              );
                            })
                          ) : (
                            <>
                              <td className="px-3 py-2 text-xs text-slate-900 dark:text-slate-100">
                                <pre className="max-w-xs truncate font-mono text-xs bg-slate-100 dark:bg-slate-800 p-1 rounded">
                                  {JSON.stringify(item.leftRows[0] || {}, null, 2).substring(0, 100)}
                                  {JSON.stringify(item.leftRows[0] || {}, null, 2).length > 100 ? '...' : ''}
                                </pre>
                              </td>
                              <td className="px-3 py-2 text-xs text-slate-900 dark:text-slate-100">
                                <pre className="max-w-xs truncate font-mono text-xs bg-slate-100 dark:bg-slate-800 p-1 rounded">
                                  {JSON.stringify(item.rightRows[0] || {}, null, 2).substring(0, 100)}
                                  {JSON.stringify(item.rightRows[0] || {}, null, 2).length > 100 ? '...' : ''}
                                </pre>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              // Split Screen Results (Normal Mode)
              <div className="flex flex-row" style={{ height: `${queryResultsHeight}px`, minHeight: '200px', flexShrink: 0 }}>
                {queryResult && (
                  <div 
                    className="overflow-hidden border-r border-slate-200 dark:border-slate-800"
                    style={{ width: `${splitScreenWidth}%` }}
                  >
                    <DataVisualization 
                      result={queryResult} 
                      connectionId={selectedConnection?.id}
                      query={queryResult.query}
                    />
                  </div>
                )}
                {queryResult2 && (
                  <div 
                    className="overflow-hidden"
                    style={{ width: queryResult ? `${100 - splitScreenWidth}%` : '100%' }}
                  >
                    <DataVisualization 
                      result={queryResult2} 
                      connectionId={selectedConnection?.id}
                      query={queryResult2.query}
                    />
                  </div>
                )}
                {!queryResult && !queryResult2 && (
                  <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm">
                    Execute queries to see results
                  </div>
                )}
              </div>
            )
          ) : (
            // Single Result
            queryResult && (
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
            )
          )}

          {/* Resizer for Saved Queries */}
          {!queryResult && (
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                setIsResizingSavedQueries(true);
              }}
              className="h-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 cursor-row-resize transition-colors relative group border-t border-slate-200 dark:border-slate-800"
              style={{ flexShrink: 0 }}
            >
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-transparent group-hover:bg-blue-500 dark:group-hover:bg-blue-400 transition-colors" />
            </div>
          )}

          {/* Compare Key Modal */}
          {showCompareModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Select Compare Key
                  </h3>
                  <button
                    onClick={() => setShowCompareModal(false)}
                    className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Choose a column to compare by:
                  </label>
                  <select
                    value={compareKey}
                    onChange={(e) => setCompareKey(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="">-- Select Column --</option>
                    {commonColumns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                  {commonColumns.length === 0 && (
                    <p className="text-xs text-red-500 mt-2">
                      No common columns found between the two results.
                    </p>
                  )}
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setShowCompareModal(false);
                      setCompareKey('');
                    }}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (compareKey) {
                        setCompareMode(true);
                        setShowCompareModal(false);
                        // Auto-open fields modal after selecting key
                        setTimeout(() => setShowCompareFieldsModal(true), 100);
                      }
                    }}
                    disabled={!compareKey}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Compare
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Compare Fields Modal */}
          {showCompareFieldsModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Select Fields to Compare
                  </h3>
                  <button
                    onClick={() => setShowCompareFieldsModal(false)}
                    className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Choose fields to compare values (for matching keys):
                  </label>
                  <div className="max-h-60 overflow-y-auto border border-slate-300 dark:border-slate-600 rounded-lg p-2 space-y-2">
                    {commonColumns.filter(col => col !== compareKey).map((col) => (
                      <label key={col} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={compareFields.includes(col)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCompareFields([...compareFields, col]);
                            } else {
                              setCompareFields(compareFields.filter(f => f !== col));
                            }
                          }}
                          className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300">{col}</span>
                      </label>
                    ))}
                    {commonColumns.filter(col => col !== compareKey).length === 0 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 p-2">
                        No other common columns available to compare.
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setShowCompareFieldsModal(false);
                      setCompareFields([]);
                    }}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    Skip
                  </button>
                  <button
                    onClick={() => {
                      setShowCompareFieldsModal(false);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Saved Queries Panel */}
          {!queryResult && !queryResult2 && (
            <div 
              className="overflow-hidden border-t border-slate-200 dark:border-slate-800"
              style={{ 
                height: `${savedQueriesHeight}px`,
                minHeight: '150px',
                flexShrink: 0
              }}
            >
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
