const STORAGE_KEY = 'browser-sql-ide-tabs';
const STORAGE_ACTIVE_TAB_KEY = 'browser-sql-ide-active-tab';
const DEFAULT_CONNECTION_KEY = 'browser-sql-ide-default-connection';

export const storageKeys = {
  tabs: STORAGE_KEY,
  activeTab: STORAGE_ACTIVE_TAB_KEY,
};

export function getDefaultConnectionId() {
  if (typeof window === 'undefined') return undefined;
  const stored = localStorage.getItem(DEFAULT_CONNECTION_KEY);
  if (!stored) return undefined;
  const parsed = parseInt(stored, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function getStorageKeys(editorId?: string) {
  if (editorId) {
    return {
      tabs: `browser-sql-ide-tabs-${editorId}`,
      activeTab: `browser-sql-ide-active-tab-${editorId}`,
    };
  }
  return storageKeys;
}
