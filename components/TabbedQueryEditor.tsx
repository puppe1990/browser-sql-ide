'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Plus } from 'lucide-react';
import QueryEditor from './QueryEditor';

interface Tab {
  id: string;
  name: string;
  query: string;
  result?: any;
  error?: string;
}

interface TabbedQueryEditorProps {
  connectionId?: number;
  onQuerySave?: (query: string) => void;
  onQueryResult?: (result: any) => void;
  onQuerySelect?: (query: string) => void;
}

const STORAGE_KEY = 'browser-sql-ide-tabs';
const STORAGE_ACTIVE_TAB_KEY = 'browser-sql-ide-active-tab';

export default function TabbedQueryEditor({
  connectionId,
  onQuerySave,
  onQueryResult,
  onQuerySelect,
}: TabbedQueryEditorProps) {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const createNewTab = useCallback(() => {
    const newTab: Tab = {
      id: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `Query 1`,
      query: '',
    };
    
    setTabs((prev) => {
      const tabName = `Query ${prev.length + 1}`;
      return [...prev, { ...newTab, name: tabName }];
    });
    setActiveTabId(newTab.id);
    return newTab.id;
  }, []);

  // Load tabs from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTabs = localStorage.getItem(STORAGE_KEY);
      const savedActiveTab = localStorage.getItem(STORAGE_ACTIVE_TAB_KEY);
      
      if (savedTabs) {
        try {
          const parsedTabs = JSON.parse(savedTabs);
          if (parsedTabs.length > 0) {
            setTabs(parsedTabs);
            setActiveTabId(savedActiveTab && parsedTabs.find((t: Tab) => t.id === savedActiveTab) 
              ? savedActiveTab 
              : parsedTabs[0].id);
          } else {
            // Create initial tab if no saved tabs
            createNewTab();
          }
        } catch (e) {
          console.error('Failed to parse saved tabs:', e);
          createNewTab();
        }
      } else {
        // Create initial tab if no saved tabs
        createNewTab();
      }
    }
  }, [createNewTab]);


  // Save active tab to localStorage when it changes
  useEffect(() => {
    if (activeTabId) {
      localStorage.setItem(STORAGE_ACTIVE_TAB_KEY, activeTabId);
    }
  }, [activeTabId]);


  const closeTab = useCallback((tabId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    setTabs((prev) => {
      const newTabs = prev.filter((tab) => tab.id !== tabId);
      
      // If closing the active tab, switch to another tab
      if (tabId === activeTabId) {
        const closedIndex = prev.findIndex((tab) => tab.id === tabId);
        if (newTabs.length > 0) {
          // Switch to the tab at the same position, or the previous one, or the first one
          const newActiveIndex = Math.min(closedIndex, newTabs.length - 1);
          setActiveTabId(newTabs[newActiveIndex].id);
        } else {
          // If no tabs left, create a new one
          const newTab: Tab = {
            id: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: 'Query 1',
            query: '',
          };
          setActiveTabId(newTab.id);
          return [newTab];
        }
      }
      
      return newTabs;
    });
  }, [activeTabId]);

  const updateTabQuery = useCallback((tabId: string, query: string) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === tabId ? { ...tab, query } : tab))
    );
  }, []);

  // Debounced save to localStorage
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (tabs.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [tabs]);

  const updateTabResult = useCallback((tabId: string, result: any, error?: string) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === tabId ? { ...tab, result, error } : tab
      )
    );
  }, []);

  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  // Expose method to add query from outside (e.g., from SavedQueries)
  useEffect(() => {
    if (onQuerySelect) {
      // This will be called when a saved query is selected
      // We'll handle it through a custom event or prop
    }
  }, [onQuerySelect]);

  const handleQueryResult = (result: any) => {
    if (activeTabId) {
      updateTabResult(activeTabId, result);
    }
    if (onQueryResult) {
      onQueryResult(result);
    }
  };

  const handleQueryChange = useCallback((query: string) => {
    if (activeTabId) {
      updateTabQuery(activeTabId, query);
    }
  }, [activeTabId, updateTabQuery]);

  // Method to add a query from outside (e.g., SavedQueries)
  const addQueryToNewTab = useCallback((query: string) => {
    setTabs((prev) => {
      const newTab: Tab = {
        id: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: `Query ${prev.length + 1}`,
        query,
      };
      setActiveTabId(newTab.id);
      return [...prev, newTab];
    });
  }, []);

  // Expose addQueryToNewTab via window or context if needed
  useEffect(() => {
    (window as any).addQueryToTab = addQueryToNewTab;
    return () => {
      delete (window as any).addQueryToTab;
    };
  }, [addQueryToNewTab]);

  if (!activeTab) {
    return null;
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden">
      {/* Tabs Bar */}
      <div className="flex items-center border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 overflow-x-auto">
        <div className="flex items-center min-w-0 flex-1">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 cursor-pointer border-r border-slate-200 dark:border-slate-800
                transition-colors min-w-0 max-w-xs
                ${
                  tab.id === activeTabId
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-b-2 border-b-blue-600 dark:border-b-blue-400'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                }
              `}
            >
              <span className="truncate text-sm font-medium">{tab.name}</span>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => closeTab(tab.id, e)}
                  className="ml-1 p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors flex-shrink-0"
                  title="Close tab"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={createNewTab}
          className="px-3 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
          title="New tab"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Query Editor for Active Tab */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <QueryEditor
          key={activeTabId}
          connectionId={connectionId}
          initialQuery={activeTab.query}
          onQuerySave={onQuerySave}
          onQueryResult={handleQueryResult}
          onQueryChange={handleQueryChange}
        />
      </div>
    </div>
  );
}
