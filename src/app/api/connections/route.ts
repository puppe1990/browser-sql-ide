import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { readConnectionPayload, type ConnectionPayload } from '@/lib/connection-payload';
import { encrypt } from '@/lib/encryption';
import { parseOptionalPositivePort } from '@/lib/port-params';
import { getErrorMessage } from '@/lib/utils';
import { saveUploadedSqliteFile } from '@/lib/sqlite-files';

export async function GET() {
  try {
    const connections = db
      .prepare('SELECT id, name, type, host, port, database, username, ssl, color, created_at, updated_at FROM connections ORDER BY created_at DESC')
      .all();

    return NextResponse.json({ connections });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsedPayload = await readConnectionPayload(request);
    if (parsedPayload.error) {
      return NextResponse.json({ error: parsedPayload.error }, { status: parsedPayload.status ?? 400 });
    }
    const body = (parsedPayload.value ?? {}) as ConnectionPayload;
    const { name, type, host, port, database, username, password, ssl, color, sqliteFile } = body;
    const normalizedType = type || 'postgresql';
    const parsedPort = parseOptionalPositivePort(port);
    if (parsedPort.error) {
      return NextResponse.json({ error: parsedPort.error }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let nextHost = host;
    let nextPort = parsedPort.value;
    let nextDatabase = database;
    let nextUsername = username;
    let nextPassword = password;
    let nextSsl = ssl || false;

    if (normalizedType === 'sqlite') {
      if (!sqliteFile || sqliteFile.size === 0) {
        return NextResponse.json(
          { error: 'SQLite file is required' },
          { status: 400 }
        );
      }

      nextDatabase = await saveUploadedSqliteFile(sqliteFile);
      nextHost = 'localfile';
      nextPort = 0;
      nextUsername = 'sqlite';
      nextPassword = 'sqlite';
      nextSsl = false;
    }

    if (normalizedType === 'turso') {
      if (!nextHost) {
        return NextResponse.json(
          { error: 'Turso URL is required' },
          { status: 400 }
        );
      }
      if (!nextPassword) {
        return NextResponse.json(
          { error: 'Turso auth token is required' },
          { status: 400 }
        );
      }

      nextPort = Number.isFinite(nextPort) && (nextPort as number) > 0 ? nextPort : 443;
      nextDatabase = nextDatabase || 'main';
      nextUsername = nextUsername || 'turso';
      nextSsl = true;
    }

    if (!nextHost || nextPort === undefined || !Number.isFinite(nextPort) || !nextDatabase || !nextUsername || !nextPassword) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const encryptedPassword = encrypt(nextPassword);

    const normalizedColor = typeof color === 'string' && color.trim() ? color.trim() : null;

    const result = db
      .prepare(
        'INSERT INTO connections (name, type, host, port, database, username, encrypted_password, ssl, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run(
        name,
        normalizedType,
        nextHost,
        nextPort,
        nextDatabase,
        nextUsername,
        encryptedPassword,
        nextSsl ? 1 : 0,
        normalizedColor
      );

    const connection = db
      .prepare('SELECT id, name, type, host, port, database, username, ssl, color, created_at, updated_at FROM connections WHERE id = ?')
      .get(result.lastInsertRowid);

    return NextResponse.json({ connection }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
