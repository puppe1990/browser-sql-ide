import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { dbConnector } from '@/lib/database-connectors';
import { parseConnectionAndQueryPayload } from '@/lib/query-request-params';
import { parseJsonObjectBody } from '@/lib/request-body';
import { requireAuthenticatedUser } from '@/lib/require-auth';
import { loadDecryptedConnectionByIdAsync } from '@/lib/server/connections';
import { getErrorMessage } from '@/lib/utils';

type ExecuteQueryPayload = {
  connectionId?: number | string;
  query?: string;
};

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth.error) return auth.error;

    const parsedBody = await parseJsonObjectBody<ExecuteQueryPayload>(request);
    if (parsedBody.error) {
      return NextResponse.json({ error: parsedBody.error }, { status: parsedBody.status ?? 400 });
    }
    const body = parsedBody.value as ExecuteQueryPayload;
    const parsedRequest = parseConnectionAndQueryPayload(body);
    if (parsedRequest.error) {
      return NextResponse.json({ error: parsedRequest.error }, { status: 400 });
    }

    const connectionId = parsedRequest.connectionId as number;
    const query = parsedRequest.query as string;

    const connection = await loadDecryptedConnectionByIdAsync(connectionId);
    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    const startTime = Date.now();

    try {
      const result = await dbConnector.executeQuery(connection, query, 0, 100);
      const executionTime = Date.now() - startTime;

      await db.prepare(
        'INSERT INTO query_history (connection_id, query, execution_time, success) VALUES (?, ?, ?, ?)'
      ).run(connectionId, query, executionTime, 1);

      return NextResponse.json({
        success: true,
        result: {
          ...result,
          connectionId: connection.id,
          connectionName: connection.name,
        },
      });
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      const executionTime = Date.now() - startTime;

      await db.prepare(
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
