export type RowData = Record<string, unknown>;

export type QueryResult = {
  columns: string[];
  rows: RowData[];
  rowCount: number;
  totalCount?: number;
  executionTime: number;
  hasMore?: boolean;
};

export type FieldComparison = {
  left: unknown;
  right: unknown;
  match: boolean;
};

export type ComparisonResult = {
  key: string;
  leftRows: RowData[];
  rightRows: RowData[];
  status: 'match' | 'left-only' | 'right-only';
  fieldComparisons: Record<string, FieldComparison>;
};

export type DbConnectionRow = {
  id: number;
  name: string;
  type: string;
  host: string;
  port: number;
  database: string;
  username: string;
  encrypted_password: string;
  ssl: number;
  created_at?: string;
  updated_at?: string;
};
