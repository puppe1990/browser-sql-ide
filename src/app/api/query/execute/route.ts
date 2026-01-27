import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { decrypt } from '@/lib/encryption';
import { dbConnector } from '@/lib/database-connectors';
import { getErrorMessage } from '@/lib/utils';
import type { DbConnectionRow } from '@/types';

type ExecuteQueryPayload = {
  connectionId?: number;
  query?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ExecuteQueryPayload;
    const { connectionId, query } = body;

    if (!connectionId || !query) {
      return NextResponse.json(
        { error: 'Connection ID and query are required' },
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

    const startTime = Date.now();

    try {
      // Execute query with pagination (first 100 rows)
      const result = await dbConnector.executeQuery(connection, query, 0, 100);
      const executionTime = Date.now() - startTime;

      // Save to history
      db.prepare(
        'INSERT INTO query_history (connection_id, query, execution_time, success) VALUES (?, ?, ?, ?)'
      ).run(connectionId, query, executionTime, 1);

      return NextResponse.json({
        success: true,
        result,
      });
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      const executionTime = Date.now() - startTime;

      // Save failed query to history
      db.prepare(
        'INSERT INTO query_history (connection_id, query, execution_time, success, error_message) VALUES (?, ?, ?, ?, ?)'
      ).run(connectionId, query, executionTime, 0, errorMessage);

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: 400 }
      );
    }
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
