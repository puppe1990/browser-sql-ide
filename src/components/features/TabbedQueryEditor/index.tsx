'use client';

import { useState, useEffect, useCallback } from 'react';
import QueryEditor from '@/components/features/QueryEditor';
import type { QueryResult } from '@/types';
import TabsBar from './_components/TabsBar';
import type { Tab } from './types';
import { getDefaultConnectionId, getStorageKeys } from './utils';

interface TabbedQueryEditorProps {
  connectionId?: number;
  onQuerySave?: (query: string) => void;
  onQueryResult?: (result: QueryResult, query?: string) => void;
  editorId?: string; // Unique ID for split screen editors
  onActiveQueryChange?: (query: string) => void; // Callback when active query changes
  onConnectionChange?: (connectionId: number) => void; // Callback when connection changes
  onQueryStart?: () => void; // Callback when query execution starts
  onQueryError?: () => void; // Callback when query execution fails
  editorRef?: React.MutableRefObject<{ addQueryToTab: (query: string) => void } | null>; // Ref to expose methods
}

export default function TabbedQueryEditor({
  connectionId,
  onQuerySave,
  onQueryResult,
  editorId,
  onActiveQueryChange,
  onConnectionChange,
  onQueryStart,
  onQueryError,
  editorRef,
}: TabbedQueryEditorProps) {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [defaultConnectionId, setDefaultConnectionId] = useState<number | undefined>(undefined);

  const createNewTab = useCallback(() => {
    const preferredConnectionId = defaultConnectionId ?? getDefaultConnectionId() ?? connectionId;
    const newTab: Tab = {
      id: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `Query 1`,
      query: '',
      connectionId: preferredConnectionId,
    };
    
    setTabs((prev) => {
      const tabName = `Query ${prev.length + 1}`;
      return [...prev, { ...newTab, name: tabName }];
    });
    setActiveTabId(newTab.id);
    return newTab.id;
  }, [connectionId, defaultConnectionId]);

  // Load tabs from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDefaultConnectionId(getDefaultConnectionId());
      const storageKeys = getStorageKeys(editorId);
      const savedTabs = localStorage.getItem(storageKeys.tabs);
      const savedActiveTab = localStorage.getItem(storageKeys.activeTab);
      
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
  }, [createNewTab, editorId]);

  useEffect(() => {
    const handleDefaultConnectionUpdated = () => {
      setDefaultConnectionId(getDefaultConnectionId());
    };

    window.addEventListener('default-connection-updated', handleDefaultConnectionUpdated);
    return () => {
      window.removeEventListener('default-connection-updated', handleDefaultConnectionUpdated);
    };
  }, []);


  // Save active tab to localStorage when it changes
  useEffect(() => {
    if (activeTabId) {
      const storageKeys = getStorageKeys(editorId);
      localStorage.setItem(storageKeys.activeTab, activeTabId);
    }
  }, [activeTabId, editorId]);

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

  const updateTabConnection = useCallback((tabId: string, connectionId: number) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === tabId ? { ...tab, connectionId } : tab))
    );
  }, []);

  // Debounced save to localStorage
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (tabs.length > 0) {
        const storageKeys = getStorageKeys(editorId);
        localStorage.setItem(storageKeys.tabs, JSON.stringify(tabs));
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [tabs, editorId]);

  const updateTabResult = useCallback((tabId: string, result: QueryResult, error?: string) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === tabId ? { ...tab, result, error } : tab
      )
    );
  }, []);

  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  // Notify parent when active query changes
  useEffect(() => {
    if (activeTab && onActiveQueryChange) {
      onActiveQueryChange(activeTab.query);
    }
  }, [activeTab, onActiveQueryChange]);


  const handleQueryResult = (result: QueryResult, query?: string) => {
    const resultWithSource = editorId ? { ...result, sourceEditorId: editorId } : result;
    if (activeTabId) {
      updateTabResult(activeTabId, resultWithSource);
    }
    if (onQueryResult) {
      // Pass query along with result for pagination
      onQueryResult(resultWithSource, query);
    }
  };

  const handleQueryChange = useCallback((query: string) => {
    if (activeTabId) {
      updateTabQuery(activeTabId, query);
    }
  }, [activeTabId, updateTabQuery]);

  const handleConnectionChange = useCallback((newConnectionId: number) => {
    if (activeTabId) {
      updateTabConnection(activeTabId, newConnectionId);
    }
    if (onConnectionChange) {
      onConnectionChange(newConnectionId);
    }
  }, [activeTabId, onConnectionChange, updateTabConnection]);

  // Method to add a query from outside (e.g., SavedQueries)
  const addQueryToNewTab = useCallback((query: string) => {
    const preferredConnectionId = defaultConnectionId ?? getDefaultConnectionId() ?? connectionId;
    setTabs((prev) => {
      const newTab: Tab = {
        id: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: `Query ${prev.length + 1}`,
        query,
        connectionId: preferredConnectionId,
      };
      setActiveTabId(newTab.id);
      return [...prev, newTab];
    });
  }, [connectionId, defaultConnectionId]);

  // Expose addQueryToNewTab via ref if provided
  useEffect(() => {
    if (editorRef && 'current' in editorRef) {
      editorRef.current = {
        addQueryToTab: addQueryToNewTab,
      };
    }
    return () => {
      if (editorRef && 'current' in editorRef) {
        editorRef.current = null;
      }
    };
  }, [addQueryToNewTab, editorRef]);

  if (!activeTab) {
    return null;
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden">
      <TabsBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelect={setActiveTabId}
        onClose={closeTab}
        onNew={createNewTab}
      />

      {/* Query Editor for Active Tab */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <QueryEditor
          key={activeTabId}
          connectionId={activeTab.connectionId ?? connectionId}
          initialQuery={activeTab.query}
          onQuerySave={onQuerySave}
          onQueryResult={handleQueryResult}
          onQueryChange={handleQueryChange}
          onConnectionChange={handleConnectionChange}
          onQueryStart={onQueryStart}
          onQueryError={onQueryError}
        />
      </div>
    </div>
  );
}
