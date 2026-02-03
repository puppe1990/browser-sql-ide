'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { Tab } from '../types';

type TabsBarProps = {
  tabs: Tab[];
  activeTabId: string | null;
  onSelect: (tabId: string) => void;
  onClose: (tabId: string, e?: React.MouseEvent) => void;
  onNew: () => void;
  onRename: (tabId: string, name: string) => void;
  onReorder: (dragId: string, targetId: string) => void;
  onDuplicate: (tabId: string) => void;
  connectionColors?: Record<number, string>;
};

export default function TabsBar({
  tabs,
  activeTabId,
  onSelect,
  onClose,
  onNew,
  onRename,
  onReorder,
  onDuplicate,
  connectionColors = {},
}: TabsBarProps) {
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [draggingTabId, setDraggingTabId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    tabId: string;
    x: number;
    y: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const beginRename = (tab: Tab) => {
    setEditingTabId(tab.id);
    setEditingValue(tab.name);
  };

  const commitRename = () => {
    if (!editingTabId) return;
    const nextName = editingValue.trim();
    if (nextName) {
      onRename(editingTabId, nextName);
    }
    setEditingTabId(null);
  };

  const cancelRename = () => {
    setEditingTabId(null);
  };

  useEffect(() => {
    if (!contextMenu) return;

    const handleOutsideClick = () => setContextMenu(null);
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setContextMenu(null);
      }
    };
    const handleScroll = () => setContextMenu(null);

    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleEscape);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleEscape);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [contextMenu]);

  return (
    <div className="flex items-center border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 w-full overflow-x-auto scrollbar-hide">
      {tabs.map((tab) => {
        const tabColor = tab.connectionId ? connectionColors[tab.connectionId] : undefined;
        const isActive = tab.id === activeTabId;
        const accentColor = tabColor ?? '#3b82f6';
        const activeStyle = isActive ? { borderBottomColor: accentColor } : undefined;

        return (
          <div
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu({
                tabId: tab.id,
                x: e.clientX,
                y: e.clientY,
              });
            }}
            draggable={editingTabId !== tab.id}
            onDragStart={(e) => {
              setDraggingTabId(tab.id);
              e.dataTransfer.setData('text/plain', tab.id);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={(e) => {
              if (draggingTabId && draggingTabId !== tab.id) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              const dragId = e.dataTransfer.getData('text/plain') || draggingTabId;
              if (dragId && dragId !== tab.id) {
                onReorder(dragId, tab.id);
              }
              setDraggingTabId(null);
            }}
            onDragEnd={() => setDraggingTabId(null)}
            className={`
              flex items-center gap-2 px-4 py-2 cursor-pointer border-r border-slate-200 dark:border-slate-800
              transition-colors min-w-0 max-w-xs flex-shrink-0
              ${draggingTabId === tab.id ? 'opacity-60' : ''}
              ${
                tab.id === activeTabId
                  ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-b-2'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
              }
            `}
            style={activeStyle}
          >
            <span
              className="w-2 h-2 rounded-full border border-slate-200 dark:border-slate-700 flex-shrink-0"
              style={{ backgroundColor: accentColor }}
            />
            {editingTabId === tab.id ? (
              <input
                ref={inputRef}
                className="w-32 bg-transparent text-sm font-medium text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={editingValue}
                autoFocus
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setEditingValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitRename();
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelRename();
                  }
                }}
              />
            ) : (
              <span
                className="truncate text-sm font-medium"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  beginRename(tab);
                }}
                title="Double click to rename tab"
              >
                {tab.name}
              </span>
            )}
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
        );
      })}
      <button
        onClick={onNew}
        className="px-3 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0 bg-slate-50 dark:bg-slate-900"
        title="New tab"
      >
        <Plus className="w-4 h-4" />
      </button>
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[160px] rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg p-1 text-sm"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          role="menu"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            onClick={() => {
              onNew();
              setContextMenu(null);
            }}
            role="menuitem"
          >
            Nova aba
          </button>
          <button
            type="button"
            className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            onClick={() => {
              onDuplicate(contextMenu.tabId);
              setContextMenu(null);
            }}
            role="menuitem"
          >
            Duplicar aba
          </button>
          <button
            type="button"
            className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            onClick={() => {
              const tabToRename = tabs.find((tab) => tab.id === contextMenu.tabId);
              if (tabToRename) {
                beginRename(tabToRename);
              }
              setContextMenu(null);
            }}
            role="menuitem"
          >
            Renomear aba
          </button>
        </div>
      )}
    </div>
  );
}
