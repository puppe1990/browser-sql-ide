import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { parseJsonObjectBody } from '@/lib/request-body';
import { parseOptionalPositiveIntParam } from '@/lib/route-params';
import { parseSavedQueryCreatePayload } from '@/lib/saved-query-payload';
import { getErrorMessage } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');
    const parsedConnectionId = parseOptionalPositiveIntParam(connectionId, 'Connection ID');
    if (parsedConnectionId.error) {
      return NextResponse.json({ error: parsedConnectionId.error }, { status: 400 });
    }

    let queries;
    if (parsedConnectionId.value !== undefined) {
      queries = await db
        .prepare(
          'SELECT * FROM saved_queries WHERE connection_id = ? ORDER BY created_at DESC'
        )
        .all(parsedConnectionId.value);
    } else {
      queries = await db
        .prepare('SELECT * FROM saved_queries ORDER BY created_at DESC')
        .all();
    }

    return NextResponse.json({ queries });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsedBody = await parseJsonObjectBody<Record<string, unknown>>(request);
    if (parsedBody.error) {
      return NextResponse.json({ error: parsedBody.error }, { status: parsedBody.status ?? 400 });
    }

    const parsedPayload = parseSavedQueryCreatePayload(parsedBody.value as Record<string, unknown>);
    if (parsedPayload.error !== undefined) {
      return NextResponse.json({ error: parsedPayload.error }, { status: 400 });
    }
    const { connectionId, name, query, description, folder } = parsedPayload;

    const result = await db
      .prepare(
        'INSERT INTO saved_queries (connection_id, name, query, description, folder) VALUES (?, ?, ?, ?, ?)'
      )
      .run(connectionId ?? null, name, query, description ?? null, folder ?? null);

    const savedQuery = await db
      .prepare('SELECT * FROM saved_queries WHERE id = ?')
      .get(result.lastInsertRowid);

    return NextResponse.json({ query: savedQuery }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
