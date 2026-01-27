import type { SavedQuery } from './types';

export function groupQueriesByFolder(queries: SavedQuery[]) {
  return queries.reduce((acc, query) => {
    const folder = query.folder || 'Uncategorized';
    if (!acc[folder]) {
      acc[folder] = [];
    }
    acc[folder].push(query);
    return acc;
  }, {} as Record<string, SavedQuery[]>);
}
