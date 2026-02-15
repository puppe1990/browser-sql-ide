export type ConnectionPayload = {
  name?: string;
  type?: string;
  host?: string;
  port?: number | string;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  color?: string;
  sqliteFile?: File | null;
};

export type ParsedConnectionPayload = {
  value?: ConnectionPayload;
  error?: string;
  status?: number;
};

const ALLOWED_CONNECTION_TYPES = new Set(['postgresql', 'sqlite', 'turso']);
const TYPE_ERROR_MESSAGE = 'Type must be one of: postgresql, sqlite, turso';

function getOptionalStringField(
  payload: Record<string, unknown>,
  key: keyof ConnectionPayload,
  label: string
): ParsedConnectionPayload {
  const value = payload[key];
  if (value === undefined || value === null) {
    return {};
  }
  if (typeof value !== 'string') {
    return { error: `${label} must be a string`, status: 400 };
  }
  return { value: { [key]: value } };
}

export function parseConnectionPayloadObject(payload: Record<string, unknown>): ParsedConnectionPayload {
  const connectionPayload: ConnectionPayload = {};

  const stringFields: Array<{ key: keyof ConnectionPayload; label: string }> = [
    { key: 'name', label: 'Name' },
    { key: 'type', label: 'Type' },
    { key: 'host', label: 'Host' },
    { key: 'database', label: 'Database' },
    { key: 'username', label: 'Username' },
    { key: 'password', label: 'Password' },
    { key: 'color', label: 'Color' },
  ];

  for (const field of stringFields) {
    const parsed = getOptionalStringField(payload, field.key, field.label);
    if (parsed.error) {
      return parsed;
    }
    if (parsed.value) {
      Object.assign(connectionPayload, parsed.value);
    }
  }

  if (connectionPayload.type !== undefined) {
    const normalizedType = connectionPayload.type.trim();
    if (!normalizedType || !ALLOWED_CONNECTION_TYPES.has(normalizedType)) {
      return { error: TYPE_ERROR_MESSAGE, status: 400 };
    }
    connectionPayload.type = normalizedType;
  }

  const port = payload.port;
  if (port !== undefined && port !== null && typeof port !== 'string' && typeof port !== 'number') {
    return { error: 'Port must be a string or number', status: 400 };
  }
  if (port !== undefined && port !== null) {
    connectionPayload.port = port;
  }

  const ssl = payload.ssl;
  if (ssl !== undefined && ssl !== null && typeof ssl !== 'boolean') {
    return { error: 'SSL must be a boolean', status: 400 };
  }
  if (typeof ssl === 'boolean') {
    connectionPayload.ssl = ssl;
  }

  return { value: connectionPayload };
}

function getMultipartString(
  form: FormData,
  key: string,
  label: string
): { value?: string; error?: string; status?: number } {
  const value = form.get(key);
  if (value === null) {
    return {};
  }
  if (typeof value !== 'string') {
    return { error: `${label} must be a string`, status: 400 };
  }
  if (!value) {
    return {};
  }
  return { value };
}

export function parseMultipartConnectionPayload(form: FormData): ParsedConnectionPayload {
  const payload: ConnectionPayload = {};
  const stringFields = [
    ['name', 'Name'],
    ['host', 'Host'],
    ['port', 'Port'],
    ['database', 'Database'],
    ['username', 'Username'],
    ['password', 'Password'],
    ['color', 'Color'],
  ] as const;

  for (const [field, label] of stringFields) {
    const parsed = getMultipartString(form, field, label);
    if (parsed.error) {
      return { error: parsed.error, status: parsed.status };
    }
    if (parsed.value !== undefined) {
      if (field === 'port') {
        payload.port = parsed.value;
      } else {
        payload[field] = parsed.value;
      }
    }
  }

  const typeValue = form.get('type');
  if (typeValue !== null && typeof typeValue !== 'string') {
    return { error: 'Type must be a string', status: 400 };
  }
  if (typeof typeValue === 'string') {
    const normalizedType = typeValue.trim();
    if (!normalizedType || !ALLOWED_CONNECTION_TYPES.has(normalizedType)) {
      return { error: TYPE_ERROR_MESSAGE, status: 400 };
    }
    payload.type = normalizedType;
  }

  const ssl = form.get('ssl');
  if (ssl !== null && typeof ssl !== 'string') {
    return { error: 'SSL must be a string', status: 400 };
  }
  if (ssl === null || ssl === '') {
    payload.ssl = false;
  } else if (ssl === 'true') {
    payload.ssl = true;
  } else if (ssl === 'false') {
    payload.ssl = false;
  } else {
    return { error: 'SSL must be "true" or "false"', status: 400 };
  }

  const sqliteFile = form.get('sqliteFile');
  if (sqliteFile === null) {
    payload.sqliteFile = null;
  } else if (sqliteFile instanceof File) {
    payload.sqliteFile = sqliteFile;
  } else {
    return { error: 'sqliteFile must be a file', status: 400 };
  }

  return { value: payload };
}
