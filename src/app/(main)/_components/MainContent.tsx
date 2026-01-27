'use client';

import { Columns, GitCompare, Loader2, PanelLeftOpen, Play } from 'lucide-react';
import type { MouseEvent, MutableRefObject } from 'react';
import TabbedQueryEditor from '@/components/features/TabbedQueryEditor';
import DataVisualization from '@/components/features/DataVisualization';
import SavedQueries from '@/components/features/SavedQueries';
import CompareResultsPanel from './CompareResultsPanel';
import CompareKeyModal from './CompareKeyModal';
import CompareFieldsModal from './CompareFieldsModal';
import type { ComparisonResult } from '@/types';
import type { QueryResultWithMeta } from '../types';

type MainContentProps = {
  sidebarOpen: boolean;
  onOpenSidebar: () => void;
  splitScreen: boolean;
  onToggleSplitScreen: () => void;
  compareMode: boolean;
  canCompare: boolean;
  onToggleCompare: () => void;
  queryResult: QueryResultWithMeta | null;
  queryResult2: QueryResultWithMeta | null;
  queryResultsHeight: number;
  savedQueriesHeight: number;
  splitScreenWidth: number;
  isExecutingActiveTabs: boolean;
  onExecuteActiveTabs: () => void;
  comparedResults: ComparisonResult[] | null;
  compareKey: string;
  compareFields: string[];
  isReExecuting: boolean;
  onExportCompare: () => void;
  onReExecuteCompare: () => void;
  onOpenCompareFieldsModal: () => void;
  onCloseCompareResults: () => void;
  isLoadingResult1: boolean;
  isLoadingResult2: boolean;
  onStartResizeResults: (e: MouseEvent) => void;
  onStartResizeSavedQueries: (e: MouseEvent) => void;
  onStartResizeSplit: (e: MouseEvent) => void;
  selectedConnectionId?: number;
  onQuerySave: (query: string) => void;
  onQueryResult1: (result: QueryResultWithMeta, query?: string) => void;
  onQueryResult2: (result: QueryResultWithMeta, query?: string) => void;
  onQueryResultSingle: (result: QueryResultWithMeta, query?: string) => void;
  onActiveQueryChange1: (query: string) => void;
  onActiveQueryChange2: (query: string) => void;
  onConnectionChange1: (id: number) => void;
  onConnectionChange2: (id: number) => void;
  onQueryStart1: () => void;
  onQueryStart2: () => void;
  onQueryError1: () => void;
  onQueryError2: () => void;
  editorRef1: MutableRefObject<{ addQueryToTab: (query: string) => void } | null>;
  editorRef2: MutableRefObject<{ addQueryToTab: (query: string) => void } | null>;
  editorRefSingle: MutableRefObject<{ addQueryToTab: (query: string) => void } | null>;
  onQuerySelect: (query: string) => void;
  onQueryExecute: (query: string) => void;
  showCompareModal: boolean;
  showCompareFieldsModal: boolean;
  commonColumns: string[];
  onCompareKeyChange: (value: string) => void;
  onCancelCompareKey: () => void;
  onConfirmCompareKey: () => void;
  onToggleCompareField: (field: string, checked: boolean) => void;
  onDeselectCompareFields: () => void;
  onSkipCompareFields: () => void;
  onDoneCompareFields: () => void;
  onCloseCompareFields: () => void;
};

export default function MainContent({
  sidebarOpen,
  onOpenSidebar,
  splitScreen,
  onToggleSplitScreen,
  compareMode,
  canCompare,
  onToggleCompare,
  queryResult,
  queryResult2,
  queryResultsHeight,
  savedQueriesHeight,
  splitScreenWidth,
  isExecutingActiveTabs,
  onExecuteActiveTabs,
  comparedResults,
  compareKey,
  compareFields,
  isReExecuting,
  onExportCompare,
  onReExecuteCompare,
  onOpenCompareFieldsModal,
  onCloseCompareResults,
  isLoadingResult1,
  isLoadingResult2,
  onStartResizeResults,
  onStartResizeSavedQueries,
  onStartResizeSplit,
  selectedConnectionId,
  onQuerySave,
  onQueryResult1,
  onQueryResult2,
  onQueryResultSingle,
  onActiveQueryChange1,
  onActiveQueryChange2,
  onConnectionChange1,
  onConnectionChange2,
  onQueryStart1,
  onQueryStart2,
  onQueryError1,
  onQueryError2,
  editorRef1,
  editorRef2,
  editorRefSingle,
  onQuerySelect,
  onQueryExecute,
  showCompareModal,
  showCompareFieldsModal,
  commonColumns,
  onCompareKeyChange,
  onCancelCompareKey,
  onConfirmCompareKey,
  onToggleCompareField,
  onDeselectCompareFields,
  onSkipCompareFields,
  onDoneCompareFields,
  onCloseCompareFields,
}: MainContentProps) {
  return (
    <main className="flex-1 flex flex-col overflow-hidden relative">
      {!sidebarOpen && (
        <button
          onClick={onOpenSidebar}
          className="absolute left-2 top-2 z-10 p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors shadow-sm"
          title="Open sidebar"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
      )}

      <div className="absolute right-2 top-2 z-50 flex items-center gap-2">
        <button
          onClick={onToggleSplitScreen}
          className={`p-2 rounded transition-colors shadow-sm ${
            splitScreen
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900'
          }`}
          title={splitScreen ? 'Disable Split Screen' : 'Enable Split Screen'}
        >
          <Columns className="w-4 h-4" />
        </button>
      </div>

      {canCompare && (
        <button
          onClick={onToggleCompare}
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

      {splitScreen ? (
        <div
          className="flex flex-row border-b border-slate-200 dark:border-slate-800"
          style={{
            height: (queryResult || queryResult2)
              ? `calc(100% - ${queryResultsHeight}px - 4px)`
              : `calc(100% - ${savedQueriesHeight}px - 4px)`,
            minHeight: '200px',
          }}
        >
          <div
            className="flex flex-col border-r border-slate-200 dark:border-slate-800"
            style={{ width: `${splitScreenWidth}%` }}
          >
            <TabbedQueryEditor
              connectionId={selectedConnectionId}
              editorId="editor1"
              onQuerySave={onQuerySave}
              onQueryResult={onQueryResult1}
              onActiveQueryChange={onActiveQueryChange1}
              onConnectionChange={onConnectionChange1}
              onQueryStart={onQueryStart1}
              onQueryError={onQueryError1}
              editorRef={editorRef1}
            />
          </div>

          <div
            onMouseDown={onStartResizeSplit}
            className="w-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 cursor-col-resize transition-colors relative group flex-shrink-0"
          >
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1 bg-transparent group-hover:bg-blue-500 dark:group-hover:bg-blue-400 transition-colors" />
          </div>

          <div className="flex flex-col" style={{ width: `${100 - splitScreenWidth}%` }}>
            <TabbedQueryEditor
              connectionId={selectedConnectionId}
              editorId="editor2"
              onQuerySave={onQuerySave}
              onQueryResult={onQueryResult2}
              onActiveQueryChange={onActiveQueryChange2}
              onConnectionChange={onConnectionChange2}
              onQueryStart={onQueryStart2}
              onQueryError={onQueryError2}
              editorRef={editorRef2}
            />
          </div>
        </div>
      ) : (
        <div
          className="flex flex-col border-b border-slate-200 dark:border-slate-800"
          style={{
            height: queryResult
              ? `calc(100% - ${queryResultsHeight}px - 4px)`
              : `calc(100% - ${savedQueriesHeight}px - 4px)`,
            minHeight: '200px',
          }}
        >
          <TabbedQueryEditor
            connectionId={selectedConnectionId}
            onQuerySave={onQuerySave}
            onQueryResult={onQueryResultSingle}
            onQueryStart={onQueryStart1}
            onQueryError={onQueryError1}
            editorRef={editorRefSingle}
          />
        </div>
      )}

      {(queryResult || queryResult2 || isLoadingResult1 || isLoadingResult2) && (
        <div
          onMouseDown={onStartResizeResults}
          className="h-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 cursor-row-resize transition-colors relative group"
          style={{ flexShrink: 0 }}
        >
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-transparent group-hover:bg-blue-500 dark:group-hover:bg-blue-400 transition-colors" />
        </div>
      )}

      {splitScreen ? (
        !queryResult && !queryResult2 ? (
          <div className="flex flex-col items-center justify-center" style={{ height: `${queryResultsHeight}px`, minHeight: '200px', flexShrink: 0 }}>
            <div className="text-center p-8">
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                No queries executed yet. Execute queries from both editors to see results.
              </p>
              <button
                onClick={onExecuteActiveTabs}
                disabled={isExecutingActiveTabs}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Execute queries from active tabs"
              >
                {isExecutingActiveTabs ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Execute Active Tab Queries
                  </>
                )}
              </button>
            </div>
          </div>
        ) : compareMode && comparedResults ? (
          <CompareResultsPanel
            height={queryResultsHeight}
            compareKey={compareKey}
            compareFields={compareFields}
            comparedResults={comparedResults}
            isReExecuting={isReExecuting}
            onExport={onExportCompare}
            onReExecute={onReExecuteCompare}
            onSelectFields={onOpenCompareFieldsModal}
            onClose={onCloseCompareResults}
          />
        ) : (
          <div className="flex flex-row" style={{ height: `${queryResultsHeight}px`, minHeight: '200px', flexShrink: 0 }}>
            {(queryResult || isLoadingResult1) && (
              <div
                className="overflow-hidden border-r border-slate-200 dark:border-slate-800"
                style={{ width: `${splitScreenWidth}%` }}
              >
                {queryResult ? (
                  <DataVisualization
                    result={queryResult}
                    connectionId={selectedConnectionId}
                    query={queryResult.query}
                    isLoading={isLoadingResult1}
                  />
                ) : (
                  <DataVisualization
                    result={{ columns: [], rows: [], rowCount: 0, executionTime: 0 }}
                    connectionId={selectedConnectionId}
                    isLoading={isLoadingResult1}
                  />
                )}
              </div>
            )}
            {(queryResult2 || isLoadingResult2) && (
              <div
                className="overflow-hidden"
                style={{ width: (queryResult || isLoadingResult1) ? `${100 - splitScreenWidth}%` : '100%' }}
              >
                {queryResult2 ? (
                  <DataVisualization
                    result={queryResult2}
                    connectionId={selectedConnectionId}
                    query={queryResult2.query}
                    isLoading={isLoadingResult2}
                  />
                ) : (
                  <DataVisualization
                    result={{ columns: [], rows: [], rowCount: 0, executionTime: 0 }}
                    connectionId={selectedConnectionId}
                    isLoading={isLoadingResult2}
                  />
                )}
              </div>
            )}
            {!queryResult && !queryResult2 && !isLoadingResult1 && !isLoadingResult2 && (
              <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm">
                Execute queries to see results
              </div>
            )}
          </div>
        )
      ) : (
        (queryResult || isLoadingResult1) && (
          <div
            className="overflow-hidden"
            style={{
              height: `${queryResultsHeight}px`,
              minHeight: '200px',
              flexShrink: 0,
            }}
          >
            {queryResult ? (
              <DataVisualization
                result={queryResult}
                connectionId={selectedConnectionId}
                query={queryResult.query}
                isLoading={isLoadingResult1}
              />
            ) : (
              <DataVisualization
                result={{ columns: [], rows: [], rowCount: 0, executionTime: 0 }}
                connectionId={selectedConnectionId}
                isLoading={isLoadingResult1}
              />
            )}
          </div>
        )
      )}

      {!queryResult && (
        <div
          onMouseDown={onStartResizeSavedQueries}
          className="h-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 cursor-row-resize transition-colors relative group border-t border-slate-200 dark:border-slate-800"
          style={{ flexShrink: 0 }}
        >
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-transparent group-hover:bg-blue-500 dark:group-hover:bg-blue-400 transition-colors" />
        </div>
      )}

      <CompareKeyModal
        open={showCompareModal}
        compareKey={compareKey}
        commonColumns={commonColumns}
        onCompareKeyChange={onCompareKeyChange}
        onCancel={onCancelCompareKey}
        onConfirm={onConfirmCompareKey}
      />

      <CompareFieldsModal
        open={showCompareFieldsModal}
        compareKey={compareKey}
        commonColumns={commonColumns}
        compareFields={compareFields}
        onToggleField={onToggleCompareField}
        onDeselectAll={onDeselectCompareFields}
        onSkip={onSkipCompareFields}
        onDone={onDoneCompareFields}
        onClose={onCloseCompareFields}
      />

      {!queryResult && !queryResult2 && (
        <div
          className="overflow-hidden border-t border-slate-200 dark:border-slate-800"
          style={{
            height: `${savedQueriesHeight}px`,
            minHeight: '150px',
            flexShrink: 0,
          }}
        >
          <SavedQueries
            connectionId={selectedConnectionId}
            onQuerySelect={onQuerySelect}
            onQueryExecute={onQueryExecute}
          />
        </div>
      )}
    </main>
  );
}
