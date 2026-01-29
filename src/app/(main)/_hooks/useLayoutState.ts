import { STORAGE_KEYS, parseBoolean, useLocalStorageState } from '../_utils/page-helpers';

export function useLayoutState() {
  const [sidebarOpen, setSidebarOpen] = useLocalStorageState(
    STORAGE_KEYS.SIDEBAR_OPEN,
    false,
    parseBoolean,
  );
  const [splitScreen, setSplitScreen] = useLocalStorageState(
    STORAGE_KEYS.SPLIT_SCREEN,
    false,
    parseBoolean,
  );

  return { sidebarOpen, setSidebarOpen, splitScreen, setSplitScreen };
}
