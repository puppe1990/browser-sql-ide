export type Connection = {
  id: number;
  name: string;
  type: string;
  host: string;
  port: number;
  database: string;
  username: string;
  ssl: boolean;
  color?: string | null;
  created_at: string;
  updated_at: string;
};

export type ConnectionFormData = {
  name: string;
  type: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  color: string;
  sqliteFile: File | null;
};

export type TestResult = {
  success: boolean;
  message: string;
} | null;
