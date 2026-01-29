import { useEffect, useState } from 'react';
import type { Connection } from '../types';

export function useConnections() {
  const [connectionsById, setConnectionsById] = useState<Record<number, string>>({});

  useEffect(() => {
    const loadConnections = async () => {
      try {
        const response = await fetch('/api/connections');
        const data = await response.json();
        const loadedConnections = data.connections || [];
        const map: Record<number, string> = {};
        loadedConnections.forEach((connection: Connection) => {
          map[connection.id] = connection.name;
        });
        setConnectionsById(map);
      } catch (error) {
        console.error('Failed to load connections:', error);
      }
    };

    loadConnections();
    const handleConnectionsUpdated = () => {
      loadConnections();
    };
    window.addEventListener('connections-updated', handleConnectionsUpdated);
    return () => {
      window.removeEventListener('connections-updated', handleConnectionsUpdated);
    };
  }, []);

  return { connectionsById };
}
