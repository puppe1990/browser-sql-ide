import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { parseHistoryLimitParam } from '@/lib/history-params';
import { requireAuthenticatedUser } from '@/lib/require-auth';
import { parseOptionalPositiveIntParam } from '@/lib/route-params';
import { getErrorMessage } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');
    const limit = searchParams.get('limit');
    const parsedConnectionId = parseOptionalPositiveIntParam(connectionId, 'Connection ID');
    if (parsedConnectionId.error) {
      return NextResponse.json({ error: parsedConnectionId.error }, { status: 400 });
    }

    const parsedLimit = parseHistoryLimitParam(limit);
    if (parsedLimit.error) {
      return NextResponse.json({ error: parsedLimit.error }, { status: 400 });
    }
    const limitValue = parsedLimit.value as number;

    let history;
    if (parsedConnectionId.value !== undefined) {
      history = await db
        .prepare(
          'SELECT * FROM query_history WHERE connection_id = ? ORDER BY executed_at DESC LIMIT ?'
        )
        .all(parsedConnectionId.value, limitValue);
    } else {
      history = await db
        .prepare('SELECT * FROM query_history ORDER BY executed_at DESC LIMIT ?')
        .all(limitValue);
    }

    return NextResponse.json({ history });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
