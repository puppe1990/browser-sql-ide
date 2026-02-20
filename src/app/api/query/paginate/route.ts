import { NextRequest, NextResponse } from 'next/server';
import { dbConnector } from '@/lib/database-connectors';
import { parsePaginationLimit, parsePaginationOffset } from '@/lib/pagination-params';
import { parseConnectionAndQueryPayload } from '@/lib/query-request-params';
import { parseJsonObjectBody } from '@/lib/request-body';
import { loadDecryptedConnectionByIdAsync } from '@/lib/server/connections';
import { getErrorMessage } from '@/lib/utils';

type PaginateQueryPayload = {
  connectionId?: number | string;
  query?: string;
  offset?: number | string;
  limit?: number | string;
};

export async function POST(request: NextRequest) {
  try {
    const parsedBody = await parseJsonObjectBody<PaginateQueryPayload>(request);
    if (parsedBody.error) {
      return NextResponse.json({ error: parsedBody.error }, { status: parsedBody.status ?? 400 });
    }
    const body = parsedBody.value as PaginateQueryPayload;
    const parsedRequest = parseConnectionAndQueryPayload(body);
    if (parsedRequest.error) {
      return NextResponse.json({ error: parsedRequest.error }, { status: 400 });
    }
    const { offset, limit } = body;

    const normalizedConnectionId = parsedRequest.connectionId as number;
    const query = parsedRequest.query as string;

    const parsedOffset = parsePaginationOffset(offset);
    if (parsedOffset.error) {
      return NextResponse.json({ error: parsedOffset.error }, { status: 400 });
    }

    const parsedLimit = parsePaginationLimit(limit);
    if (parsedLimit.error) {
      return NextResponse.json({ error: parsedLimit.error }, { status: 400 });
    }
    const offsetValue = parsedOffset.value as number;
    const limitValue = parsedLimit.value as number;

    const connection = await loadDecryptedConnectionByIdAsync(normalizedConnectionId);
    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    try {
      const result = await dbConnector.executeQuery(connection, query, offsetValue, limitValue);

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
