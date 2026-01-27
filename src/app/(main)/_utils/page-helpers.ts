import { useEffect, useState } from 'react';
import { processQuery } from '@/lib/query-utils';
import type { Connection, QueryResultWithMeta } from '../types';

export const STORAGE_KEYS = {
  SIDEBAR_OPEN: 'browser-sql-ide-sidebar-open',
  QUERY_RESULTS_HEIGHT: 'browser-sql-ide-query-results-height',
  SAVED_QUERIES_HEIGHT: 'browser-sql-ide-saved-queries-height',
  SPLIT_SCREEN: 'browser-sql-ide-split-screen',
  SPLIT_SCREEN_WIDTH: 'browser-sql-ide-split-screen-width',
};

type ParseResult<T> = (raw: string) => T | undefined;

type NumberRangeOptions = {
  minExclusive?: number;
  maxExclusive?: number;
  minInclusive?: number;
  maxInclusive?: number;
};

export const parseBoolean = (raw: string): boolean | undefined => {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return undefined;
};

export const parseNumberInRange = (raw: string, options: NumberRangeOptions = {}): number | undefined => {
  const value = Number(raw);
  if (!Number.isFinite(value)) return undefined;

  const { minExclusive, maxExclusive, minInclusive, maxInclusive } = options;

  if (minExclusive !== undefined && value <= minExclusive) return undefined;
  if (maxExclusive !== undefined && value >= maxExclusive) return undefined;
  if (minInclusive !== undefined && value < minInclusive) return undefined;
  if (maxInclusive !== undefined && value > maxInclusive) return undefined;

  return value;
};

export function useLocalStorageState<T>(
  key: string,
  defaultValue: T,
  parse: ParseResult<T>,
  serialize: (value: T) => string = String,
) {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    const stored = localStorage.getItem(key);
    if (stored === null) return;
    const parsed = parse(stored);
    if (parsed !== undefined) {
      setValue(parsed);
    }
  }, [key, parse]);

  useEffect(() => {
    localStorage.setItem(key, serialize(value));
  }, [key, value, serialize]);

  return [value, setValue] as const;
}

type VerticalResizeOptions = {
  isResizing: boolean;
  setIsResizing: (value: boolean) => void;
  onHeightChange: (height: number) => void;
  minHeight: number;
  maxHeightOffset: number;
};

export function useVerticalResize({
  isResizing,
  setIsResizing,
  onHeightChange,
  minHeight,
  maxHeightOffset,
}: VerticalResizeOptions) {
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const mainElement = document.querySelector('main');
      if (!mainElement) return;

      const mainRect = mainElement.getBoundingClientRect();
      const newHeight = mainRect.bottom - e.clientY;
      const maxHeight = window.innerHeight - maxHeightOffset;

      if (newHeight >= minHeight && newHeight <= maxHeight) {
        onHeightChange(newHeight);
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
  }, [isResizing, minHeight, maxHeightOffset, onHeightChange, setIsResizing]);
}

type HorizontalResizeOptions = {
  isResizing: boolean;
  enabled: boolean;
  setIsResizing: (value: boolean) => void;
  onWidthChange: (widthPercent: number) => void;
  minWidthPercent: number;
  maxWidthPercent: number;
};

export function useHorizontalResize({
  isResizing,
  enabled,
  setIsResizing,
  onWidthChange,
  minWidthPercent,
  maxWidthPercent,
}: HorizontalResizeOptions) {
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !enabled) return;

      const mainElement = document.querySelector('main');
      if (!mainElement) return;

      const mainRect = mainElement.getBoundingClientRect();
      const relativeX = e.clientX - mainRect.left;
      const percentage = (relativeX / mainRect.width) * 100;

      if (percentage >= minWidthPercent && percentage <= maxWidthPercent) {
        onWidthChange(percentage);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
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
  }, [enabled, isResizing, maxWidthPercent, minWidthPercent, onWidthChange, setIsResizing]);
}

type ResolveConnectionParams = {
  activeConnectionId1?: number;
  activeConnectionId2?: number;
  selectedConnection: Connection | null;
};

type ResolveConnectionResult =
  | { connectionId1: number; connectionId2: number }
  | { error: string };

export async function resolveConnectionIds({
  activeConnectionId1,
  activeConnectionId2,
  selectedConnection,
}: ResolveConnectionParams): Promise<ResolveConnectionResult> {
  let connectionId1 = activeConnectionId1;
  let connectionId2 = activeConnectionId2;

  if (!connectionId1 || !connectionId2) {
    if (selectedConnection) {
      if (!connectionId1) connectionId1 = selectedConnection.id;
      if (!connectionId2) connectionId2 = selectedConnection.id;
    } else {
      try {
        const response = await fetch('/api/connections');
        if (!response.ok) {
          return { error: 'Failed to load connections' };
        }
        const data = await response.json();
        const connections = data.connections || [];
        if (connections.length > 0) {
          const firstConnectionId = connections[0].id;
          if (!connectionId1) connectionId1 = firstConnectionId;
          if (!connectionId2) connectionId2 = firstConnectionId;
        } else {
          return { error: 'Please select a connection in the editors or add a connection first' };
        }
      } catch (error) {
        console.error('Failed to load connections:', error);
        return { error: 'Failed to load connections' };
      }
    }
  }

  if (!connectionId1 || !connectionId2) {
    return { error: 'Please select a connection in both editors' };
  }

  return { connectionId1, connectionId2 };
}

type QueryExecutionRequest = {
  query: string;
  connectionId: number;
};

export async function executeQueries(
  requests: QueryExecutionRequest[],
): Promise<QueryResultWithMeta[]> {
  const promises = requests.map(async ({ query, connectionId }) => {
    const processedQuery = processQuery(query);
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
      return { ...data.result, query: processedQuery } as QueryResultWithMeta;
    }

    throw new Error(data.error || 'Query execution failed');
  });

  return Promise.all(promises);
}

export function getQueriesFromTabsStorage(): { query1?: string; query2?: string } {
  try {
    const savedTabs = localStorage.getItem('browser-sql-ide-tabs');
    if (!savedTabs) return {};
    const tabs = JSON.parse(savedTabs);
    if (!Array.isArray(tabs) || tabs.length === 0) return {};

    const query1 = tabs[0]?.query;
    let query2 = tabs[1]?.query;
    if (!query2 && tabs[0]?.query) {
      query2 = tabs[0].query;
    }

    return { query1, query2 };
  } catch (error) {
    console.error('Failed to get queries from tabs:', error);
    return {};
  }
}
