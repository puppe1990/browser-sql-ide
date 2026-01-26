import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { encrypt, decrypt } from '@/lib/encryption';

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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const body = await request.json();
    const { name, type, host, port, database, username, password, ssl } = body;

    const existing = db
      .prepare('SELECT encrypted_password FROM connections WHERE id = ?')
      .get(id);

    if (!existing) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    const encryptedPassword = password ? encrypt(password) : (existing as any).encrypted_password;

    db.prepare(
      'UPDATE connections SET name = ?, type = ?, host = ?, port = ?, database = ?, username = ?, encrypted_password = ?, ssl = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(name, type, host, port, database, username, encryptedPassword, ssl ? 1 : 0, id);

    const connection = db
      .prepare('SELECT id, name, type, host, port, database, username, ssl, created_at, updated_at FROM connections WHERE id = ?')
      .get(id);

    return NextResponse.json({ connection });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
