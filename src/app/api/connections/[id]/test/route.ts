import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { decrypt } from '@/lib/encryption';
import { dbConnector } from '@/lib/database-connectors';
import { getErrorMessage } from '@/lib/utils';
import type { DbConnectionRow } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const connectionData = db
      .prepare('SELECT * FROM connections WHERE id = ?')
      .get(id) as DbConnectionRow | undefined;

    if (!connectionData) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    const password = decrypt(connectionData.encrypted_password);

    const connection = {
      id: connectionData.id,
      name: connectionData.name,
      type: connectionData.type,
      host: connectionData.host,
      port: connectionData.port,
      database: connectionData.database,
      username: connectionData.username,
      password,
      ssl: connectionData.ssl === 1,
    };

    // Test connection
    await dbConnector.connect(connection);

    return NextResponse.json({ success: true, message: 'Connection successful' });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(error) },
      { status: 400 }
    );
  }
}
