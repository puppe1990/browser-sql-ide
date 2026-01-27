'use client';

import { Database, Download, FileUp, Maximize2, UploadCloud } from 'lucide-react';
import Tooltip from '@/components/ui/Tooltip';

type ResultsHeaderProps = {
  expanded: boolean;
  rowCountText: string;
  executionTime: number;
  connectionName?: string;
  onToggleExpand: () => void;
  onExportCsv: () => void;
  onExportSql: () => void;
  onImportInserts: () => void;
  onInsertToConnection: () => void;
  canInsert: boolean;
  isInserting: boolean;
};

export default function ResultsHeader({
  expanded,
  rowCountText,
  executionTime,
  connectionName,
  onToggleExpand,
  onExportCsv,
  onExportSql,
  onImportInserts,
  onInsertToConnection,
  canInsert,
  isInserting,
}: ResultsHeaderProps) {
  return (
    <div className="flex justify-between items-center px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 relative z-10">
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
          Query Results
        </h3>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {rowCountText} • {executionTime}ms
          {connectionName ? ` • ${connectionName}` : ''}
        </span>
      </div>
      <div className="flex gap-1">
        <Tooltip text="Inserir resultados em outra conexão">
          <button
            onClick={onInsertToConnection}
            className={`p-1.5 rounded transition-colors ${
              canInsert && !isInserting
                ? 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                : 'text-slate-400 dark:text-slate-600 cursor-not-allowed'
            }`}
            disabled={!canInsert || isInserting}
          >
            <UploadCloud className="w-3.5 h-3.5" />
          </button>
        </Tooltip>
        <Tooltip text={expanded ? 'Minimizar' : 'Maximizar'}>
          <button
            onClick={onToggleExpand}
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </Tooltip>
        <Tooltip text="Exportar para CSV">
          <button
            onClick={onExportCsv}
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </Tooltip>
        <Tooltip text="Exportar como INSERT statements">
          <button
            onClick={onExportSql}
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
          >
            <Database className="w-3.5 h-3.5" />
          </button>
        </Tooltip>
        <Tooltip text="Importar INSERT statements de arquivo">
          <button
            onClick={onImportInserts}
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
          >
            <FileUp className="w-3.5 h-3.5" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
