import { useState } from 'react';
import {
  STORAGE_KEYS,
  parseNumberInRange,
  useHorizontalResize,
  useLocalStorageState,
  useVerticalResize,
} from '../_utils/page-helpers';

const parsePositiveNumber = (raw: string) => parseNumberInRange(raw, { minExclusive: 0 });
const parseSplitWidth = (raw: string) =>
  parseNumberInRange(raw, { minExclusive: 0, maxExclusive: 100 });

export function useResizeState({ splitScreen }: { splitScreen: boolean }) {
  const [queryResultsHeight, setQueryResultsHeight] = useLocalStorageState(
    STORAGE_KEYS.QUERY_RESULTS_HEIGHT,
    400,
    parsePositiveNumber,
  );
  const [savedQueriesHeight, setSavedQueriesHeight] = useLocalStorageState(
    STORAGE_KEYS.SAVED_QUERIES_HEIGHT,
    320,
    parsePositiveNumber,
  );
  const [splitScreenWidth, setSplitScreenWidth] = useLocalStorageState(
    STORAGE_KEYS.SPLIT_SCREEN_WIDTH,
    50,
    parseSplitWidth,
  );
  const [isResizing, setIsResizing] = useState(false);
  const [isResizingSavedQueries, setIsResizingSavedQueries] = useState(false);
  const [isResizingSplit, setIsResizingSplit] = useState(false);

  useVerticalResize({
    isResizing,
    setIsResizing,
    onHeightChange: setQueryResultsHeight,
    minHeight: 200,
    maxHeightOffset: 200,
  });

  useVerticalResize({
    isResizing: isResizingSavedQueries,
    setIsResizing: setIsResizingSavedQueries,
    onHeightChange: setSavedQueriesHeight,
    minHeight: 150,
    maxHeightOffset: 200,
  });

  useHorizontalResize({
    isResizing: isResizingSplit,
    enabled: splitScreen,
    setIsResizing: setIsResizingSplit,
    onWidthChange: setSplitScreenWidth,
    minWidthPercent: 20,
    maxWidthPercent: 80,
  });

  return {
    queryResultsHeight,
    savedQueriesHeight,
    splitScreenWidth,
    isResizing,
    isResizingSavedQueries,
    isResizingSplit,
    setIsResizing,
    setIsResizingSavedQueries,
    setIsResizingSplit,
  };
}
