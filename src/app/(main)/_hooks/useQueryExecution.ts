import { useState } from 'react';
import { getErrorMessage } from '@/lib/utils';
import { processQuery } from '@/lib/query-utils';
import type { QueryResult } from '@/types';
import type { ActiveTabPayload } from '@/components/features/TabbedQueryEditor/types';
import type { Connection, QueryResultWithMeta } from '../types';
import {
  executeQueries,
  getQueriesFromTabsStorage,
  resolveConnectionIds,
} from '../_utils/page-helpers';

type PendingCompareRestore = {
  compareMode: boolean;
  compareKeys: string[];
  compareFields: string[];
};

type UseQueryExecutionParams = {
  selectedConnection: Connection | null;
  connectionsById: Record<number, string>;
  requestDeleteConfirmation: (
    queries: string[],
    onConfirm: () => void,
    connectionNames?: string[],
  ) => boolean;
};

export function useQueryExecution({
  selectedConnection,
  connectionsById,
  requestDeleteConfirmation,
}: UseQueryExecutionParams) {
  const [queryResult, setQueryResult] = useState<QueryResultWithMeta | null>(null);
  const [queryResult2, setQueryResult2] = useState<QueryResultWithMeta | null>(null);
  const [savedQueries, setSavedQueries] = useState<{ query1?: string; query2?: string }>({});
  const [activeQuery1, setActiveQuery1] = useState<string>('');
  const [activeQuery2, setActiveQuery2] = useState<string>('');
  const [activeConnectionId1, setActiveConnectionId1] = useState<number | undefined>(undefined);
  const [activeConnectionId2, setActiveConnectionId2] = useState<number | undefined>(undefined);
  const [isReExecuting, setIsReExecuting] = useState(false);
  const [isExecutingActiveTabs, setIsExecutingActiveTabs] = useState(false);
  const [isLoadingResult1, setIsLoadingResult1] = useState(false);
  const [isLoadingResult2, setIsLoadingResult2] = useState(false);
  const [pendingCompareRestore, setPendingCompareRestore] = useState<PendingCompareRestore | null>(null);

  const handleActiveTabChange = (tab: ActiveTabPayload, isSecondEditor?: boolean) => {
    const resolvedIsSecond = Boolean(isSecondEditor);
    const nextResult = tab.result
      ? { ...tab.result, query: tab.lastExecutedQuery ?? tab.query }
      : null;

    if (resolvedIsSecond) {
      setQueryResult2(nextResult);
      setIsLoadingResult2(false);
      setActiveConnectionId2(
        typeof tab.connectionId === 'number' ? tab.connectionId : undefined,
      );
    } else {
      setQueryResult(nextResult);
      setIsLoadingResult1(false);
      setActiveConnectionId1(
        typeof tab.connectionId === 'number' ? tab.connectionId : undefined,
      );
    }
  };

  const handleQueryResult = (result: QueryResult, query?: string, isSecondEditor?: boolean) => {
    const resolvedIsSecond =
      typeof isSecondEditor === 'boolean'
        ? isSecondEditor
        : result.sourceEditorId === 'editor2'
          ? true
          : false;

    if (resolvedIsSecond) {
      setQueryResult2({ ...result, query });
      setIsLoadingResult2(false);
      if (query) {
        setSavedQueries((prev) => ({ ...prev, query2: query }));
      }
    } else {
      setQueryResult({ ...result, query });
      setIsLoadingResult1(false);
      if (query) {
        setSavedQueries((prev) => ({ ...prev, query1: query }));
      }
    }
  };

  const handleExecuteActiveTabs = async () => {
    const query1 = activeQuery1?.trim();
    const query2 = activeQuery2?.trim();

    if (!query1 || !query2) {
      alert('Please write queries in both editors before executing');
      return;
    }

    const resolved = await resolveConnectionIds({
      activeConnectionId1,
      activeConnectionId2,
      selectedConnection,
    });
    if ('error' in resolved) {
      alert(resolved.error);
      return;
    }

    const executeActiveTabs = async () => {
      setIsExecutingActiveTabs(true);
      setIsLoadingResult1(true);
      setIsLoadingResult2(true);

      try {
        const executedResults = await executeQueries([
          { query: query1, connectionId: resolved.connectionId1 },
          { query: query2, connectionId: resolved.connectionId2 },
        ]);

        setQueryResult(executedResults[0]);
        setQueryResult2(executedResults[1]);
        setIsLoadingResult1(false);
        setIsLoadingResult2(false);
        setSavedQueries({ query1: executedResults[0].query, query2: executedResults[1].query });
      } catch (error: unknown) {
        setIsLoadingResult1(false);
        setIsLoadingResult2(false);
        alert(`Failed to execute queries: ${getErrorMessage(error) || 'Unknown error'}`);
      } finally {
        setIsExecutingActiveTabs(false);
      }
    };

    const connectionNames = [
      connectionsById[resolved.connectionId1],
      connectionsById[resolved.connectionId2],
    ].filter(Boolean);
    if (requestDeleteConfirmation([query1, query2], executeActiveTabs, connectionNames)) {
      return;
    }

    await executeActiveTabs();
  };

  const handleReExecuteCompare = async (compareMode: boolean, compareKeys: string[], compareFields: string[]) => {
    const resolved = await resolveConnectionIds({
      activeConnectionId1,
      activeConnectionId2,
      selectedConnection,
    });
    if ('error' in resolved) {
      alert(resolved.error);
      return;
    }

    let query1 = queryResult?.query || savedQueries.query1;
    let query2 = queryResult2?.query || savedQueries.query2;

    if (!query1 || !query2) {
      const storedQueries = getQueriesFromTabsStorage();
      if (!query1) query1 = storedQueries.query1;
      if (!query2) query2 = storedQueries.query2;
    }

    if (!query1 || !query2) {
      alert('Could not find queries to re-execute. Please execute both queries first in the split screen editors.');
      return;
    }

    const reExecuteCompare = async () => {
      setIsReExecuting(true);
      setIsLoadingResult1(true);
      setIsLoadingResult2(true);

      const savedCompareKeys = [...compareKeys];
      const savedCompareFields = [...compareFields];
      const savedCompareMode = compareMode;

      try {
        const executedResults = await executeQueries([
          { query: query1, connectionId: resolved.connectionId1 },
          { query: query2, connectionId: resolved.connectionId2 },
        ]);

        const newResult1: QueryResultWithMeta = {
          ...executedResults[0],
          rows: [...executedResults[0].rows],
          columns: [...executedResults[0].columns],
        };
        const newResult2: QueryResultWithMeta = {
          ...executedResults[1],
          rows: [...executedResults[1].rows],
          columns: [...executedResults[1].columns],
        };

        setQueryResult(newResult1);
        setQueryResult2(newResult2);
        setIsLoadingResult1(false);
        setIsLoadingResult2(false);

        if (savedCompareMode) {
          setPendingCompareRestore({
            compareMode: true,
            compareKeys: savedCompareKeys,
            compareFields: savedCompareFields,
          });
        }
      } catch (error: unknown) {
        setIsLoadingResult1(false);
        setIsLoadingResult2(false);
        setPendingCompareRestore(null);
        alert(`Failed to execute query: ${getErrorMessage(error) || 'Unknown error'}`);
      } finally {
        setIsReExecuting(false);
      }
    };

    const connectionNames = [
      connectionsById[resolved.connectionId1],
      connectionsById[resolved.connectionId2],
    ].filter(Boolean);
    if (requestDeleteConfirmation([query1, query2], reExecuteCompare, connectionNames)) {
      return;
    }

    await reExecuteCompare();
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

  const handleQueryExecute = async (query: string) => {
    if (!selectedConnection) {
      alert('Please select a connection first');
      return;
    }

    const executeSavedQuery = async () => {
      if (typeof window !== 'undefined' && window.addQueryToTab) {
        window.addQueryToTab(query);
      }

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
      } catch (error: unknown) {
        alert(getErrorMessage(error) || 'Failed to execute query');
      }
    };

    const connectionNames = selectedConnection?.name ? [selectedConnection.name] : [];
    if (requestDeleteConfirmation([query], executeSavedQuery, connectionNames)) {
      return;
    }

    await executeSavedQuery();
  };

  return {
    queryResult,
    queryResult2,
    activeQuery1,
    setActiveQuery1,
    activeQuery2,
    setActiveQuery2,
    activeConnectionId1,
    setActiveConnectionId1,
    activeConnectionId2,
    setActiveConnectionId2,
    isReExecuting,
    isExecutingActiveTabs,
    isLoadingResult1,
    isLoadingResult2,
    pendingCompareRestore,
    setPendingCompareRestore,
    setIsLoadingResult1,
    setIsLoadingResult2,
    handleActiveTabChange,
    handleQueryResult,
    handleExecuteActiveTabs,
    handleReExecuteCompare,
    handleQuerySave,
    handleQueryExecute,
  };
}
