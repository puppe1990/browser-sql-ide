'use client';

import { useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Sidebar from './_components/Sidebar';
import type { Connection } from './types';
import MainContent from './_components/MainContent';
import { useCompare } from './_hooks/useCompare';
import { useConnections } from './_hooks/useConnections';
import { useDeleteConfirmation } from './_hooks/useDeleteConfirmation';
import { useLayoutState } from './_hooks/useLayoutState';
import { useQueryExecution } from './_hooks/useQueryExecution';
import { useResizeState } from './_hooks/useResizeState';

export default function Home() {
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const { sidebarOpen, setSidebarOpen, splitScreen, setSplitScreen } = useLayoutState();
  const {
    queryResultsHeight,
    savedQueriesHeight,
    splitScreenWidth,
    setIsResizing,
    setIsResizingSavedQueries,
    setIsResizingSplit,
  } = useResizeState({ splitScreen });
  const { connectionsById } = useConnections();
  const { deleteConfirm, closeDeleteConfirm, requestDeleteConfirmation } = useDeleteConfirmation();

  const {
    queryResult,
    queryResult2,
    setActiveQuery1,
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
  } = useQueryExecution({
    selectedConnection,
    connectionsById,
    requestDeleteConfirmation,
  });

  const {
    compareMode,
    setCompareMode,
    compareKeys,
    setCompareKeys,
    compareFields,
    setCompareFields,
    isComparingAllRows,
    showCompareModal,
    setShowCompareModal,
    showCompareFieldsModal,
    setShowCompareFieldsModal,
    commonColumns,
    comparedResults,
    isExportingCompare,
    handleExportCompare,
  } = useCompare({
    queryResult,
    queryResult2,
    activeConnectionId1,
    activeConnectionId2,
    selectedConnection,
    isReExecuting,
    isLoadingResult1,
    isLoadingResult2,
    pendingCompareRestore,
    setPendingCompareRestore,
  });

  const editor1Ref = useRef<{ addQueryToTab: (query: string) => void } | null>(null);
  const editor2Ref = useRef<{ addQueryToTab: (query: string) => void } | null>(null);
  const singleEditorRef = useRef<{ addQueryToTab: (query: string) => void } | null>(null);

  const handleConnectionSelect = (connection: Connection) => {
    setSelectedConnection(connection);
  };

  const handleQuerySelect = (query: string) => {
    if (splitScreen) {
      if (editor1Ref.current) {
        editor1Ref.current.addQueryToTab(query);
      }
    } else if (singleEditorRef.current) {
      singleEditorRef.current.addQueryToTab(query);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          selectedConnectionId={selectedConnection?.id}
          onConnectionSelect={handleConnectionSelect}
        />

        <MainContent
          sidebarOpen={sidebarOpen}
          onOpenSidebar={() => setSidebarOpen(true)}
          splitScreen={splitScreen}
          onToggleSplitScreen={() => {
            setSplitScreen(!splitScreen);
            if (!splitScreen) {
              setCompareMode(false);
              setCompareKeys([]);
            }
          }}
          compareMode={compareMode}
          canCompare={Boolean(splitScreen && queryResult && queryResult2)}
          onToggleCompare={() => {
            if (!compareMode) {
              setShowCompareModal(true);
            } else {
              setCompareMode(false);
              setCompareKeys([]);
              setCompareFields([]);
            }
          }}
          queryResult={queryResult}
          queryResult2={queryResult2}
          queryResultsHeight={queryResultsHeight}
          savedQueriesHeight={savedQueriesHeight}
          splitScreenWidth={splitScreenWidth}
          isExecutingActiveTabs={isExecutingActiveTabs}
          onExecuteActiveTabs={handleExecuteActiveTabs}
          comparedResults={comparedResults}
          compareKeys={compareKeys}
          compareFields={compareFields}
          isReExecuting={isReExecuting}
          isLoadingCompare={isComparingAllRows}
          onExportCompare={handleExportCompare}
          onReExecuteCompare={() => handleReExecuteCompare(compareMode, compareKeys, compareFields)}
          onOpenCompareFieldsModal={() => setShowCompareFieldsModal(true)}
          onCloseCompareResults={() => {
            setCompareMode(false);
            setCompareKeys([]);
            setCompareFields([]);
          }}
          isLoadingResult1={isLoadingResult1}
          isLoadingResult2={isLoadingResult2}
          onStartResizeResults={(e) => {
            e.preventDefault();
            setIsResizing(true);
          }}
          onStartResizeSavedQueries={(e) => {
            e.preventDefault();
            setIsResizingSavedQueries(true);
          }}
          onStartResizeSplit={(e) => {
            e.preventDefault();
            setIsResizingSplit(true);
          }}
          selectedConnectionId={selectedConnection?.id}
          onQuerySave={handleQuerySave}
          onQueryResult1={(result, query) => handleQueryResult(result, query, false)}
          onQueryResult2={(result, query) => handleQueryResult(result, query, true)}
          onQueryResultSingle={handleQueryResult}
          onActiveQueryChange1={setActiveQuery1}
          onActiveQueryChange2={setActiveQuery2}
          onActiveTabChange1={(tab) => handleActiveTabChange(tab, false)}
          onActiveTabChange2={(tab) => handleActiveTabChange(tab, true)}
          onActiveTabChangeSingle={(tab) => handleActiveTabChange(tab, false)}
          onConnectionChange1={setActiveConnectionId1}
          onConnectionChange2={setActiveConnectionId2}
          onQueryStart1={() => setIsLoadingResult1(true)}
          onQueryStart2={() => setIsLoadingResult2(true)}
          onQueryError1={() => setIsLoadingResult1(false)}
          onQueryError2={() => setIsLoadingResult2(false)}
          editorRef1={editor1Ref}
          editorRef2={editor2Ref}
          editorRefSingle={singleEditorRef}
          onQuerySelect={handleQuerySelect}
          onQueryExecute={handleQueryExecute}
          showCompareModal={showCompareModal}
          showCompareFieldsModal={showCompareFieldsModal}
          commonColumns={commonColumns}
          onCompareKeyChange={setCompareKeys}
          onCancelCompareKey={() => {
            setShowCompareModal(false);
            setCompareKeys([]);
          }}
          onConfirmCompareKey={() => {
            if (compareKeys.length > 0) {
              setCompareMode(true);
              setShowCompareModal(false);
              setTimeout(() => setShowCompareFieldsModal(true), 100);
            }
          }}
          onToggleCompareField={(field, checked) => {
            if (checked) {
              setCompareFields([...compareFields, field]);
            } else {
              setCompareFields(compareFields.filter((f) => f !== field));
            }
          }}
          onDeselectCompareFields={() => setCompareFields([])}
          onSkipCompareFields={() => {
            setShowCompareFieldsModal(false);
            setCompareFields([]);
          }}
          onDoneCompareFields={() => setShowCompareFieldsModal(false)}
          onCloseCompareFields={() => setShowCompareFieldsModal(false)}
        />

        <ConfirmModal
          open={deleteConfirm.open}
          title={deleteConfirm.title}
          message={deleteConfirm.message}
          confirmLabel={deleteConfirm.confirmLabel}
          confirmTone={deleteConfirm.confirmTone}
          onCancel={closeDeleteConfirm}
          onConfirm={() => {
            const action = deleteConfirm.onConfirm;
            closeDeleteConfirm();
            if (action) {
              action();
            }
          }}
        />
      </div>

      {isExportingCompare && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
            <p className="text-slate-600 dark:text-slate-300 text-sm">Exporting...</p>
          </div>
        </div>
      )}
    </div>
  );
}
