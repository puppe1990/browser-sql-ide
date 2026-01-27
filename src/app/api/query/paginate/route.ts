import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { decrypt } from '@/lib/encryption';
import { dbConnector } from '@/lib/database-connectors';
import { getErrorMessage } from '@/lib/utils';
import type { DbConnectionRow } from '@/types';

type PaginateQueryPayload = {
  connectionId?: number;
  query?: string;
  offset?: number;
  limit?: number;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PaginateQueryPayload;
    const { connectionId, query, offset, limit = 100 } = body;

    if (!connectionId || !query) {
      return NextResponse.json(
        { error: 'Connection ID and query are required' },
        { status: 400 }
      );
    }

    if (offset === undefined || offset === null) {
      return NextResponse.json(
        { error: 'Offset is required' },
        { status: 400 }
      );
    }

    // Get connection details
    const connectionData = db
      .prepare('SELECT * FROM connections WHERE id = ?')
      .get(connectionId) as DbConnectionRow | undefined;

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

    try {
      // Execute query with pagination
      const result = await dbConnector.executeQuery(connection, query, offset, limit);

      return NextResponse.json({
        success: true,
        result,
      });
    } catch (error: unknown) {
      return NextResponse.json(
        {
          success: false,
          error: getErrorMessage(error),
        },
        { status: 400 }
      );
    }
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
