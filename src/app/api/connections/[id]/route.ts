import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { readConnectionPayload, type ConnectionPayload } from '@/lib/connection-payload';
import { encrypt } from '@/lib/encryption';
import { dbConnector } from '@/lib/database-connectors';
import { parseOptionalPositivePort } from '@/lib/port-params';
import { parsePositiveIntRouteParam } from '@/lib/route-params';
import { loadConnectionRowByIdAsync, toPublicConnection } from '@/lib/server/connections';
import { getErrorMessage } from '@/lib/utils';
import { deleteSqliteFileIfManaged, saveUploadedSqliteFile } from '@/lib/sqlite-files';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: routeId } = await context.params;
    const parsedId = parsePositiveIntRouteParam(routeId, 'Connection ID');
    if (parsedId.error) {
      return NextResponse.json({ error: parsedId.error }, { status: 400 });
    }
    const id = parsedId.value as number;
    const connectionRow = await loadConnectionRowByIdAsync(id);

    if (!connectionRow) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    return NextResponse.json({ connection: toPublicConnection(connectionRow) });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: routeId } = await context.params;
    const parsedId = parsePositiveIntRouteParam(routeId, 'Connection ID');
    if (parsedId.error) {
      return NextResponse.json({ error: parsedId.error }, { status: 400 });
    }
    const id = parsedId.value as number;
    const parsedPayload = await readConnectionPayload(request);
    if (parsedPayload.error) {
      return NextResponse.json({ error: parsedPayload.error }, { status: parsedPayload.status ?? 400 });
    }
    const body = (parsedPayload.value ?? {}) as ConnectionPayload;
    const { name, type, host, port, database, username, password, ssl, color, sqliteFile } = body;
    const parsedPort = parseOptionalPositivePort(port);
    if (parsedPort.error) {
      return NextResponse.json({ error: parsedPort.error }, { status: 400 });
    }

    const existing = await loadConnectionRowByIdAsync(id);

    if (!existing) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    const nextType = type ?? existing.type;
    const nextName = name ?? existing.name;
    let nextHost = host ?? existing.host;
    let nextPort = parsedPort.value ?? existing.port;
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

    await db.prepare(
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

    await dbConnector.disconnect(id);

    const updatedConnectionRow = await loadConnectionRowByIdAsync(id);

    if (!updatedConnectionRow) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    return NextResponse.json({ connection: toPublicConnection(updatedConnectionRow) });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: routeId } = await context.params;
    const parsedId = parsePositiveIntRouteParam(routeId, 'Connection ID');
    if (parsedId.error) {
      return NextResponse.json({ error: parsedId.error }, { status: 400 });
    }
    const id = parsedId.value as number;
    const connection = await loadConnectionRowByIdAsync(id);

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    await dbConnector.disconnect(id);

    const result = await db.prepare('DELETE FROM connections WHERE id = ?').run(id);

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
