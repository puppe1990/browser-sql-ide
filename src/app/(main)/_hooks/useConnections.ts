import { useEffect, useState } from 'react';
import { buildConnectionNameMap, fetchConnections } from '@/lib/client-connections';

export function useConnections() {
  const [connectionsById, setConnectionsById] = useState<Record<number, string>>({});

  useEffect(() => {
    const loadConnections = async () => {
      try {
        const loadedConnections = await fetchConnections();
        setConnectionsById(buildConnectionNameMap(loadedConnections));
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
