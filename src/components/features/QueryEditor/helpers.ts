import { useCallback, useEffect, useState } from 'react';
import type { ChangeEvent, MutableRefObject } from 'react';
import type * as Monaco from 'monaco-editor';
import { processQuery } from '@/lib/query-utils';
import { parseStrictPositiveInt } from '@/lib/strict-positive-int';
import { fetchConnections, resolveSelectedConnectionId } from '@/lib/client-connections';
import type { QueryResult } from '@/types';
import type { Connection } from './types';

export const QUERY_STORAGE_KEY = 'browser-sql-ide-query';

export function getInitialQuery({
  initialQuery,
  isTabbed,
}: {
  initialQuery?: string;
  isTabbed: boolean;
}): string {
  if (isTabbed) return initialQuery || '';
  if (initialQuery) return initialQuery;
  if (typeof window !== 'undefined') {
    const savedQuery = localStorage.getItem(QUERY_STORAGE_KEY);
    return savedQuery || '';
  }
  return '';
}

type UseConnectionsParams = {
  connectionId?: number;
  onConnectionChange?: (connectionId: number) => void;
};

export function useConnections({ connectionId, onConnectionChange }: UseConnectionsParams) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<number | undefined>(connectionId);

  const refreshConnections = useCallback(async () => {
    try {
      const loadedConnections = (await fetchConnections()) as Connection[];
      setConnections(loadedConnections);

      const nextConnectionId = resolveSelectedConnectionId(selectedConnectionId, loadedConnections);
      if (nextConnectionId === undefined) {
        if (selectedConnectionId !== undefined) {
          setSelectedConnectionId(undefined);
        }
        return;
      }

      if (nextConnectionId !== selectedConnectionId) {
        setSelectedConnectionId(nextConnectionId);
      }
      if (onConnectionChange) {
        onConnectionChange(nextConnectionId);
      }
    } catch (error) {
      console.error('Failed to load connections:', error);
    }
  }, [onConnectionChange, selectedConnectionId]);

  useEffect(() => {
    refreshConnections();
  }, [refreshConnections]);

  useEffect(() => {
    const handleConnectionsUpdated = () => {
      refreshConnections();
    };

    window.addEventListener('connections-updated', handleConnectionsUpdated);
    return () => {
      window.removeEventListener('connections-updated', handleConnectionsUpdated);
    };
  }, [refreshConnections]);

  useEffect(() => {
    if (connectionId !== undefined) {
      setSelectedConnectionId(connectionId);
    }
  }, [connectionId]);

  const handleConnectionChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const newConnectionId = parseStrictPositiveInt(e.target.value);
      if (newConnectionId === undefined) {
        return;
      }
      setSelectedConnectionId(newConnectionId);
      if (onConnectionChange) {
        onConnectionChange(newConnectionId);
      }
    },
    [onConnectionChange]
  );

  return {
    connections,
    selectedConnectionId,
    setSelectedConnectionId,
    handleConnectionChange,
    refreshConnections,
  };
}

export function useDebouncedLocalStorage({
  key,
  value,
  enabled,
  delayMs = 500,
}: {
  key: string;
  value: string;
  enabled: boolean;
  delayMs?: number;
}) {
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;

    const timeoutId = setTimeout(() => {
      localStorage.setItem(key, value);
    }, delayMs);

    return () => clearTimeout(timeoutId);
  }, [delayMs, enabled, key, value]);
}

type UseErrorDecorationParams = {
  error: string | null;
  errorLine: number | null;
  editorRef: MutableRefObject<Monaco.editor.IStandaloneCodeEditor | null>;
  monacoRef: MutableRefObject<typeof Monaco | null>;
  errorDecorationRef: MutableRefObject<string | null>;
};

export function useErrorDecoration({
  error,
  errorLine,
  editorRef,
  monacoRef,
  errorDecorationRef,
}: UseErrorDecorationParams) {
  useEffect(() => {
    if (error && errorLine && editorRef.current && monacoRef.current) {
      const editor = editorRef.current;
      const monaco = monacoRef.current;

      const oldDecorations = errorDecorationRef.current ? [errorDecorationRef.current] : [];

      const lineNumber = errorLine;
      const maxColumn = editor.getModel()?.getLineMaxColumn(lineNumber) || 1;
      const range = new monaco.Range(lineNumber, 1, lineNumber, maxColumn);

      const newDecorations = editor.deltaDecorations(oldDecorations, [
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
      ]);

      errorDecorationRef.current = newDecorations[0];
      editor.revealLineInCenter(lineNumber);
    } else if (!error && errorDecorationRef.current && editorRef.current) {
      editorRef.current.deltaDecorations([errorDecorationRef.current], []);
      errorDecorationRef.current = null;
    }
  }, [editorRef, error, errorDecorationRef, errorLine, monacoRef]);
}

export async function executeQueryRequest(
  connectionId: number,
  query: string
): Promise<QueryResult> {
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
    return { ...data.result, connectionId } as QueryResult;
  }

  throw new Error(data.error || 'Query execution failed');
}
