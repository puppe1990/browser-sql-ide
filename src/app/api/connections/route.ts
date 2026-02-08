import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { encrypt } from '@/lib/encryption';
import { getErrorMessage } from '@/lib/utils';
import { saveUploadedSqliteFile } from '@/lib/sqlite-files';

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
    const body = await readConnectionPayload(request);
    const { name, type, host, port, database, username, password, ssl, color, sqliteFile } = body;
    const normalizedType = type || 'postgresql';

    if (!name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let nextHost = host;
    let nextPort = port;
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
