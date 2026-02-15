import { createRequire } from 'node:module';
import type { DatabaseConnection } from '../database-connectors';
import type { DbConnectionRow } from '../../types';

type ConnectionRowLoader = (connectionId: number) => DbConnectionRow | undefined;
type PasswordDecryptor = (encryptedPassword: string) => string;

type LoadConnectionOptions = {
  loadRow?: ConnectionRowLoader;
  decryptPassword?: PasswordDecryptor;
};

export type PublicConnection = {
  id: number;
  name: string;
  type: string;
  host: string;
  port: number;
  database: string;
  username: string;
  ssl: number;
  color?: string | null;
  created_at?: string;
  updated_at?: string;
};

const require = createRequire(import.meta.url);

const defaultLoadRow: ConnectionRowLoader = (connectionId) => {
  const dbModule = require('../db');
  const db = dbModule.default;
  return db.prepare('SELECT * FROM connections WHERE id = ?').get(connectionId) as
    | DbConnectionRow
    | undefined;
};

const defaultDecryptPassword: PasswordDecryptor = (encryptedPassword) => {
  const encryptionModule = require('../encryption');
  return encryptionModule.decrypt(encryptedPassword);
};

export function hydrateConnectionRow(
  connectionRow: DbConnectionRow,
  decryptPassword: PasswordDecryptor = defaultDecryptPassword
): DatabaseConnection {
  return {
    id: connectionRow.id,
    name: connectionRow.name,
    type: connectionRow.type,
    host: connectionRow.host,
    port: connectionRow.port,
    database: connectionRow.database,
    username: connectionRow.username,
    password: decryptPassword(connectionRow.encrypted_password),
    ssl: connectionRow.ssl === 1,
  };
}

export function toPublicConnection(connectionRow: DbConnectionRow): PublicConnection {
  return {
    id: connectionRow.id,
    name: connectionRow.name,
    type: connectionRow.type,
    host: connectionRow.host,
    port: connectionRow.port,
    database: connectionRow.database,
    username: connectionRow.username,
    ssl: connectionRow.ssl,
    color: connectionRow.color,
    created_at: connectionRow.created_at,
    updated_at: connectionRow.updated_at,
  };
}

export function loadConnectionRowById(
  connectionId: number,
  options: Pick<LoadConnectionOptions, 'loadRow'> = {}
): DbConnectionRow | undefined {
  const loadRow = options.loadRow ?? defaultLoadRow;
  return loadRow(connectionId);
}

export function loadDecryptedConnectionById(
  connectionId: number,
  options: LoadConnectionOptions = {}
): DatabaseConnection | undefined {
  const decryptPassword = options.decryptPassword ?? defaultDecryptPassword;
  const connectionRow = loadConnectionRowById(connectionId, { loadRow: options.loadRow });

  if (!connectionRow) {
    return undefined;
  }

  return hydrateConnectionRow(connectionRow, decryptPassword);
}
