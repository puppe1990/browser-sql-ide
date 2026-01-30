import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { encrypt } from '@/lib/encryption';
import { dbConnector } from '@/lib/database-connectors';
import { getErrorMessage } from '@/lib/utils';
import type { DbConnectionRow } from '@/types';

type ConnectionPayload = {
  name?: string;
  type?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const connection = db
      .prepare('SELECT id, name, type, host, port, database, username, ssl, created_at, updated_at FROM connections WHERE id = ?')
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
    const body = (await request.json()) as ConnectionPayload;
    const { name, type, host, port, database, username, password, ssl } = body;

    const existing = db
      .prepare('SELECT * FROM connections WHERE id = ?')
      .get(id) as DbConnectionRow | undefined;

    if (!existing) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    const encryptedPassword = password ? encrypt(password) : existing.encrypted_password;
    const nextName = name ?? existing.name;
    const nextType = type ?? existing.type;
    const nextHost = host ?? existing.host;
    const nextPort = port ?? existing.port;
    const nextDatabase = database ?? existing.database;
    const nextUsername = username ?? existing.username;
    const nextSsl = ssl !== undefined ? (ssl ? 1 : 0) : existing.ssl;

    db.prepare(
      'UPDATE connections SET name = ?, type = ?, host = ?, port = ?, database = ?, username = ?, encrypted_password = ?, ssl = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(nextName, nextType, nextHost, nextPort, nextDatabase, nextUsername, encryptedPassword, nextSsl, id);

    // Ensure a fresh pool is created with updated credentials on next use.
    await dbConnector.disconnect(id);

    const connection = db
      .prepare('SELECT id, name, type, host, port, database, username, ssl, created_at, updated_at FROM connections WHERE id = ?')
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
    const { dbConnector } = await import('@/lib/database-connectors');
    
    // Disconnect if connected
    await dbConnector.disconnect(id);

    const result = db.prepare('DELETE FROM connections WHERE id = ?').run(id);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
