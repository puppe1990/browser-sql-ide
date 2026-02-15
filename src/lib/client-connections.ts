export type ClientConnection = {
  id: number;
  name: string;
  [key: string]: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseClientConnectionId(value: unknown): number | undefined {
  if (typeof value === 'number') {
    if (Number.isSafeInteger(value) && value > 0) {
      return value;
    }
    return undefined;
  }

  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) return undefined;

  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return undefined;
  return parsed;
}

function toClientConnection(value: unknown): ClientConnection | null {
  if (!isRecord(value)) return null;

  const id = parseClientConnectionId(value.id);
  if (id === undefined) return null;

  if (typeof value.name !== 'string') return null;

  return {
    ...value,
    id,
    name: value.name,
  };
}

export function parseConnectionsResponse(payload: unknown): ClientConnection[] {
  if (!isRecord(payload)) return [];
  if (!Array.isArray(payload.connections)) return [];

  const parsed = payload.connections
    .map((connection) => toClientConnection(connection))
    .filter((connection): connection is ClientConnection => connection !== null);

  return parsed;
}

export async function fetchConnections(): Promise<ClientConnection[]> {
  const response = await fetch('/api/connections');
  const payload = (await response.json()) as unknown;
  return parseConnectionsResponse(payload);
}

export function buildConnectionNameMap(connections: ClientConnection[]): Record<number, string> {
  const map: Record<number, string> = {};
  connections.forEach((connection) => {
    map[connection.id] = connection.name;
  });
  return map;
}

export function resolveSelectedConnectionId(
  currentConnectionId: number | undefined,
  connections: ClientConnection[]
): number | undefined {
  if (connections.length === 0) return undefined;
  if (
    currentConnectionId !== undefined &&
    connections.some((connection) => connection.id === currentConnectionId)
  ) {
    return currentConnectionId;
  }
  return connections[0].id;
}
