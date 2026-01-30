import type { QueryResult } from '@/types';

export type Tab = {
  id: string;
  name: string;
  query: string;
  connectionId?: number;
  result?: QueryResult;
  error?: string;
};

export type ActiveTabPayload = Pick<Tab, 'id' | 'query' | 'connectionId' | 'result' | 'error'>;
