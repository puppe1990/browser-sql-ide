'use client';

import { Plus, X } from 'lucide-react';
import type { Tab } from '../types';

type TabsBarProps = {
  tabs: Tab[];
  activeTabId: string | null;
  onSelect: (tabId: string) => void;
  onClose: (tabId: string, e?: React.MouseEvent) => void;
  onNew: () => void;
};

export default function TabsBar({
  tabs,
  activeTabId,
  onSelect,
  onClose,
  onNew,
}: TabsBarProps) {
  return (
    <div className="flex items-center border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 w-full overflow-x-auto scrollbar-hide">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          onClick={() => onSelect(tab.id)}
          className={`
            flex items-center gap-2 px-4 py-2 cursor-pointer border-r border-slate-200 dark:border-slate-800
            transition-colors min-w-0 max-w-xs flex-shrink-0
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
              onClick={(e) => onClose(tab.id, e)}
              className="ml-1 p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors flex-shrink-0"
              title="Close tab"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}
      <button
        onClick={onNew}
        className="px-3 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0 bg-slate-50 dark:bg-slate-900"
        title="New tab"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
