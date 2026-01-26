import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { encrypt, decrypt } from '@/lib/encryption';

export async function GET() {
  try {
    const connections = db
      .prepare('SELECT id, name, type, host, port, database, username, ssl, created_at, updated_at FROM connections ORDER BY created_at DESC')
      .all();

    return NextResponse.json({ connections });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
