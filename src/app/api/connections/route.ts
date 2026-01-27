import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { encrypt } from '@/lib/encryption';
import { getErrorMessage } from '@/lib/utils';

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

export async function GET() {
  try {
    const connections = db
      .prepare('SELECT id, name, type, host, port, database, username, ssl, created_at, updated_at FROM connections ORDER BY created_at DESC')
      .all();

    return NextResponse.json({ connections });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ConnectionPayload;
    const { name, type, host, port, database, username, password, ssl } = body;

    if (!name || !host || !port || !database || !username || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const encryptedPassword = encrypt(password);

    const result = db
      .prepare(
        'INSERT INTO connections (name, type, host, port, database, username, encrypted_password, ssl) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run(name, type || 'postgresql', host, port, database, username, encryptedPassword, ssl ? 1 : 0);

    const connection = db
      .prepare('SELECT id, name, type, host, port, database, username, ssl, created_at, updated_at FROM connections WHERE id = ?')
      .get(result.lastInsertRowid);

    return NextResponse.json({ connection }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
