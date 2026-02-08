import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { encrypt } from '@/lib/encryption';
import { dbConnector } from '@/lib/database-connectors';
import { getErrorMessage } from '@/lib/utils';
import type { DbConnectionRow } from '@/types';
import { deleteSqliteFileIfManaged, saveUploadedSqliteFile } from '@/lib/sqlite-files';

type ConnectionPayload = {
  name?: string;
  type?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  color?: string;
  sqliteFile?: File | null;
};

async function readConnectionPayload(request: NextRequest): Promise<ConnectionPayload> {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data')) {
    return (await request.json()) as ConnectionPayload;
  }

  const form = await request.formData();
  const sqliteFile = form.get('sqliteFile');

  return {
    name: (form.get('name') as string) || undefined,
    type: (form.get('type') as string) || undefined,
    host: (form.get('host') as string) || undefined,
    port: form.get('port') ? Number(form.get('port')) : undefined,
    database: (form.get('database') as string) || undefined,
    username: (form.get('username') as string) || undefined,
    password: (form.get('password') as string) || undefined,
    ssl: form.get('ssl') === 'true',
    color: (form.get('color') as string) || undefined,
    sqliteFile: sqliteFile instanceof File ? sqliteFile : null,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const connection = db
      .prepare('SELECT id, name, type, host, port, database, username, ssl, color, created_at, updated_at FROM connections WHERE id = ?')
      .get(id);

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    return NextResponse.json({ connection });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const body = await readConnectionPayload(request);
    const { name, type, host, port, database, username, password, ssl, color, sqliteFile } = body;

    const existing = db
      .prepare('SELECT * FROM connections WHERE id = ?')
      .get(id) as DbConnectionRow | undefined;

    if (!existing) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    const nextType = type ?? existing.type;
    const nextName = name ?? existing.name;
    let nextHost = host ?? existing.host;
    let nextPort = port ?? existing.port;
    let nextDatabase = database ?? existing.database;
    let nextUsername = username ?? existing.username;
    let nextPassword = password;
    let nextSsl = ssl !== undefined ? (ssl ? 1 : 0) : existing.ssl;

    if (nextType === 'sqlite') {
      if (sqliteFile && sqliteFile.size > 0) {
        const uploadedPath = await saveUploadedSqliteFile(sqliteFile);
        if (existing.type === 'sqlite' && existing.database !== uploadedPath) {
          deleteSqliteFileIfManaged(existing.database);
        }
        nextDatabase = uploadedPath;
      }

      nextHost = 'localfile';
      nextPort = 0;
      nextUsername = 'sqlite';
      nextPassword = nextPassword || 'sqlite';
      nextSsl = 0;
    }

    if (nextType === 'turso') {
      nextPort = Number.isFinite(nextPort) && (nextPort as number) > 0 ? nextPort : 443;
      nextDatabase = nextDatabase || 'main';
      nextUsername = nextUsername || 'turso';
      nextSsl = 1;

      if (!nextPassword && existing.type !== 'turso') {
        return NextResponse.json(
          { error: 'Turso auth token is required when changing connection type' },
          { status: 400 }
        );
      }
    }

    if (existing.type === 'sqlite' && nextType !== 'sqlite') {
      deleteSqliteFileIfManaged(existing.database);
    }

    if (!nextName || !nextHost || nextPort === undefined || !Number.isFinite(nextPort) || !nextDatabase || !nextUsername) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const encryptedPassword = nextPassword ? encrypt(nextPassword) : existing.encrypted_password;
    const nextColor =
      typeof color === 'string'
        ? color.trim() || null
        : (existing.color ?? null);

    db.prepare(
      'UPDATE connections SET name = ?, type = ?, host = ?, port = ?, database = ?, username = ?, encrypted_password = ?, ssl = ?, color = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(
      nextName,
      nextType,
      nextHost,
      nextPort,
      nextDatabase,
      nextUsername,
      encryptedPassword,
      nextSsl,
      nextColor,
      id
    );

    // Ensure a fresh pool is created with updated credentials on next use.
    await dbConnector.disconnect(id);

    const connection = db
      .prepare('SELECT id, name, type, host, port, database, username, ssl, color, created_at, updated_at FROM connections WHERE id = ?')
      .get(id);

    return NextResponse.json({ connection });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const connection = db
      .prepare('SELECT * FROM connections WHERE id = ?')
      .get(id) as DbConnectionRow | undefined;

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Disconnect if connected
    await dbConnector.disconnect(id);

    const result = db.prepare('DELETE FROM connections WHERE id = ?').run(id);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    if (connection.type === 'sqlite') {
      deleteSqliteFileIfManaged(connection.database);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
