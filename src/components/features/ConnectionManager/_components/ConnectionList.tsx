'use client';

import { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Database,
  Edit,
  Loader2,
  Star,
  TestTube,
  Trash2,
} from 'lucide-react';
import type { Connection } from '../types';

type ConnectionListProps = {
  connections: Connection[];
  selectedConnectionId?: number;
  defaultConnectionId: number | null;
  testingId: number | null;
  onSelect: (connection: Connection) => void;
  onSetDefault: (connectionId: number) => void;
  onTest: (connection: Connection) => void;
  onEdit: (connection: Connection) => void;
  onDelete: (connectionId: number) => void;
};

type CategoryKey =
  | 'databases'
  | 'schemas'
  | 'event_triggers'
  | 'extensions'
  | 'storage'
  | 'system_info'
  | 'roles';

type CategoryState = {
  open: boolean;
  loading: boolean;
  error?: string;
  items?: string[];
  info?: Record<string, unknown>;
};

type SchemaObjectsState = {
  open: boolean;
  loading: boolean;
  error?: string;
  tables?: string[];
  views?: string[];
  other?: string[];
};

export default function ConnectionList({
  connections,
  selectedConnectionId,
  defaultConnectionId,
  testingId,
  onSelect,
  onSetDefault,
  onTest,
  onEdit,
  onDelete,
}: ConnectionListProps) {
  const [expandedConnections, setExpandedConnections] = useState<Record<number, boolean>>({});
  const [categoryState, setCategoryState] = useState<Record<number, Record<CategoryKey, CategoryState>>>({});
  const [schemaObjects, setSchemaObjects] = useState<Record<number, Record<string, SchemaObjectsState>>>({});

  const categories = useMemo(
    () => [
      { key: 'databases' as const, label: 'Databases' },
      { key: 'schemas' as const, label: 'Schemas' },
      { key: 'event_triggers' as const, label: 'Event Triggers' },
      { key: 'extensions' as const, label: 'Extensions' },
      { key: 'storage' as const, label: 'Storage' },
      { key: 'system_info' as const, label: 'System Info' },
      { key: 'roles' as const, label: 'Roles' },
    ],
    []
  );

  const toggleConnection = (connectionId: number) => {
    setExpandedConnections((prev) => ({
      ...prev,
      [connectionId]: !prev[connectionId],
    }));
  };

  const updateCategoryState = (
    connectionId: number,
    category: CategoryKey,
    next: Partial<CategoryState>
  ) => {
    setCategoryState((prev) => {
      const connectionState = prev[connectionId] ?? ({} as Record<CategoryKey, CategoryState>);
      const current = connectionState[category] ?? { open: false, loading: false };
      return {
        ...prev,
        [connectionId]: {
          ...connectionState,
          [category]: { ...current, ...next },
        },
      };
    });
  };

  const fetchCategory = async (connectionId: number, category: CategoryKey) => {
    updateCategoryState(connectionId, category, { loading: true, error: undefined });
    try {
      const response = await fetch(
        `/api/connections/${connectionId}/metadata?category=${encodeURIComponent(category)}`
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load metadata');
      }
      if (category === 'system_info') {
        updateCategoryState(connectionId, category, { loading: false, info: data.info || {} });
      } else {
        updateCategoryState(connectionId, category, { loading: false, items: data.items || [] });
      }
    } catch (error: unknown) {
      updateCategoryState(connectionId, category, {
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load metadata',
      });
    }
  };

  const toggleCategory = async (connectionId: number, category: CategoryKey) => {
    const current = categoryState[connectionId]?.[category];
    const nextOpen = !current?.open;
    updateCategoryState(connectionId, category, { open: nextOpen });
    if (nextOpen && !current?.loading && !current?.items && !current?.info && !current?.error) {
      await fetchCategory(connectionId, category);
    }
  };

  const updateSchemaState = (
    connectionId: number,
    schema: string,
    next: Partial<SchemaObjectsState>
  ) => {
    setSchemaObjects((prev) => {
      const connectionState = prev[connectionId] ?? {};
      const current = connectionState[schema] ?? { open: false, loading: false };
      return {
        ...prev,
        [connectionId]: {
          ...connectionState,
          [schema]: { ...current, ...next },
        },
      };
    });
  };

  const fetchSchemaObjects = async (connectionId: number, schema: string) => {
    updateSchemaState(connectionId, schema, { loading: true, error: undefined });
    try {
      const response = await fetch(
        `/api/connections/${connectionId}/metadata?category=schema_objects&schema=${encodeURIComponent(schema)}`
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load schema objects');
      }
      updateSchemaState(connectionId, schema, {
        loading: false,
        tables: data.tables || [],
        views: data.views || [],
        other: data.other || [],
      });
    } catch (error: unknown) {
      updateSchemaState(connectionId, schema, {
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load schema objects',
      });
    }
  };

  const toggleSchema = async (connectionId: number, schema: string) => {
    const current = schemaObjects[connectionId]?.[schema];
    const nextOpen = !current?.open;
    updateSchemaState(connectionId, schema, { open: nextOpen });
    if (nextOpen && !current?.loading && !current?.tables && !current?.views && !current?.other) {
      await fetchSchemaObjects(connectionId, schema);
    }
  };

  return (
    <div className="flex-1 overflow-auto p-2 space-y-1">
      {connections.length === 0 ? (
        <div className="text-center py-12 px-4">
          <Database className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No connections yet
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Create your first connection
          </p>
        </div>
      ) : (
        connections.map((connection) => (
          <div
            key={connection.id}
            className={`group relative p-3 rounded-lg cursor-pointer transition-all ${
              selectedConnectionId === connection.id
                ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'
            }`}
            onClick={() => onSelect(connection)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleConnection(connection.id);
                    }}
                    className="p-0.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                    title={expandedConnections[connection.id] ? 'Collapse' : 'Expand'}
                  >
                    {expandedConnections[connection.id] ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-slate-200 dark:border-slate-700 flex-shrink-0"
                    style={{ backgroundColor: connection.color ?? '#3b82f6' }}
                    aria-label={`Connection color ${connection.color ?? '#3b82f6'}`}
                  />
                  <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {connection.name}
                  </h3>
                  {defaultConnectionId === connection.id && (
                    <span className="text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 px-1.5 py-0.5 rounded-full flex-shrink-0">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono truncate">
                  {connection.type}://{connection.username}@{connection.host}:{connection.port}/{connection.database}
                </p>
              </div>
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetDefault(connection.id);
                  }}
                  className={`p-1.5 rounded transition-colors ${
                    defaultConnectionId === connection.id
                      ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                  title={
                    defaultConnectionId === connection.id
                      ? 'Unset default connection'
                      : 'Set as default connection'
                  }
                >
                  <Star
                    className="w-3.5 h-3.5"
                    fill={defaultConnectionId === connection.id ? 'currentColor' : 'none'}
                  />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTest(connection);
                  }}
                  disabled={testingId === connection.id}
                  className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors disabled:opacity-50"
                  title="Test Connection"
                >
                  <TestTube
                    className={`w-3.5 h-3.5 ${testingId === connection.id ? 'animate-spin' : ''}`}
                  />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(connection);
                  }}
                  className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                  title="Edit Connection"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(connection.id);
                  }}
                  className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  title="Delete Connection"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {expandedConnections[connection.id] && (
              <div
                className="mt-2 border-t border-slate-200 dark:border-slate-800 pt-2 space-y-1"
                onClick={(e) => e.stopPropagation()}
              >
                {categories.map((category) => {
                  const state = categoryState[connection.id]?.[category.key];
                  return (
                    <div key={category.key}>
                      <button
                        onClick={() => toggleCategory(connection.id, category.key)}
                        className="w-full flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 px-1.5 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        {state?.open ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronRight className="w-3 h-3" />
                        )}
                        <span className="flex-1 text-left">{category.label}</span>
                        {state?.loading && <Loader2 className="w-3 h-3 animate-spin" />}
                      </button>
                      {state?.open && (
                        <div className="pl-5 pr-1 pb-1 space-y-1">
                          {state?.error && (
                            <div className="text-xs text-red-500">{state.error}</div>
                          )}
                          {!state?.error && state?.loading && (
                            <div className="text-xs text-slate-500">Loading...</div>
                          )}
                          {!state?.error && !state?.loading && category.key === 'system_info' && (
                            <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                              {state?.info && Object.keys(state.info).length > 0 ? (
                                Object.entries(state.info).map(([key, value]) => (
                                  <div key={key} className="flex justify-between gap-2">
                                    <span className="uppercase tracking-wide">{key}</span>
                                    <span className="text-slate-700 dark:text-slate-200 truncate">
                                      {String(value ?? '')}
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <div>No info available</div>
                              )}
                            </div>
                          )}
                          {!state?.error &&
                            !state?.loading &&
                            category.key !== 'system_info' &&
                            category.key !== 'schemas' && (
                              <div className="space-y-0.5">
                                {(state?.items || []).length > 0 ? (
                                  (state?.items || []).map((item) => (
                                    <div
                                      key={item}
                                      className="text-xs text-slate-500 dark:text-slate-400"
                                    >
                                      {item}
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-xs text-slate-400">No items</div>
                                )}
                              </div>
                            )}
                          {!state?.error && !state?.loading && category.key === 'schemas' && (
                            <div className="space-y-0.5">
                              {(state?.items || []).length > 0 ? (
                                (state?.items || []).map((schema) => {
                                  const schemaState = schemaObjects[connection.id]?.[schema];
                                  return (
                                    <div key={schema}>
                                      <button
                                        onClick={() => toggleSchema(connection.id, schema)}
                                        className="w-full flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-1 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                                      >
                                        {schemaState?.open ? (
                                          <ChevronDown className="w-3 h-3" />
                                        ) : (
                                          <ChevronRight className="w-3 h-3" />
                                        )}
                                        <span className="flex-1 text-left">{schema}</span>
                                        {schemaState?.loading && (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        )}
                                      </button>
                                      {schemaState?.open && (
                                        <div className="pl-5 pt-1 pb-1 space-y-1 text-xs">
                                          {schemaState?.error && (
                                            <div className="text-red-500">{schemaState.error}</div>
                                          )}
                                          {!schemaState?.error && schemaState?.loading && (
                                            <div className="text-slate-500">Loading...</div>
                                          )}
                                          {!schemaState?.error && !schemaState?.loading && (
                                            <>
                                              <div>
                                                <div className="uppercase tracking-wide text-slate-400">
                                                  Tables
                                                </div>
                                                {(schemaState?.tables || []).length > 0 ? (
                                                  schemaState?.tables?.map((table) => (
                                                    <div
                                                      key={table}
                                                      className="text-slate-500 dark:text-slate-400"
                                                    >
                                                      {table}
                                                    </div>
                                                  ))
                                                ) : (
                                                  <div className="text-slate-400">No tables</div>
                                                )}
                                              </div>
                                              <div className="pt-1">
                                                <div className="uppercase tracking-wide text-slate-400">
                                                  Views
                                                </div>
                                                {(schemaState?.views || []).length > 0 ? (
                                                  schemaState?.views?.map((view) => (
                                                    <div
                                                      key={view}
                                                      className="text-slate-500 dark:text-slate-400"
                                                    >
                                                      {view}
                                                    </div>
                                                  ))
                                                ) : (
                                                  <div className="text-slate-400">No views</div>
                                                )}
                                              </div>
                                              {(schemaState?.other || []).length > 0 && (
                                                <div className="pt-1">
                                                  <div className="uppercase tracking-wide text-slate-400">
                                                    Other
                                                  </div>
                                                  {schemaState?.other?.map((item) => (
                                                    <div
                                                      key={item}
                                                      className="text-slate-500 dark:text-slate-400"
                                                    >
                                                      {item}
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="text-[11px] text-slate-400">No schemas</div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
