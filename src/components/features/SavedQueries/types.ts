export type SavedQuery = {
  id: number;
  connection_id: number | null;
  name: string;
  query: string;
  description: string | null;
  folder: string | null;
  created_at: string;
  updated_at: string;
};

export type SavedQueryFormData = {
  name: string;
  query: string;
  description: string;
  folder: string;
};
