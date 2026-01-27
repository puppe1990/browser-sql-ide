'use client';

import { PanelLeftClose } from 'lucide-react';
import ConnectionManager from '@/components/features/ConnectionManager';
import type { Connection } from '../types';

type SidebarProps = {
  open: boolean;
  onClose: () => void;
  selectedConnectionId?: number;
  onConnectionSelect: (connection: Connection) => void;
};

export default function Sidebar({
  open,
  onClose,
  selectedConnectionId,
  onConnectionSelect,
}: SidebarProps) {
  return (
    <aside
      className={`${
        open ? 'w-80' : 'w-0'
      } transition-all duration-300 ease-in-out border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-hidden`}
    >
      {open && (
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
              onClick={onClose}
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
              title="Close sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            <ConnectionManager
              onConnectionSelect={onConnectionSelect}
              selectedConnectionId={selectedConnectionId}
            />
          </div>
        </>
      )}
    </aside>
  );
}
