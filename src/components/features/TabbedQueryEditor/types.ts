import type { QueryResult } from '@/types';

export type Tab = {
  id: string;
  name: string;
  query: string;
  connectionId?: number;
  result?: QueryResult;
  error?: string;
};
