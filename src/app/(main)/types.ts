import type { QueryResult } from '@/types';

export type Connection = {
  id: number;
  name: string;
  type: string;
  host: string;
  port: number;
  database: string;
  username: string;
  ssl: boolean;
};

export type QueryResultWithMeta = QueryResult & {
  query?: string;
};
