import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');
    const limit = parseInt(searchParams.get('limit') || '50');

    let history;
    if (connectionId) {
      history = db
        .prepare(
          'SELECT * FROM query_history WHERE connection_id = ? ORDER BY executed_at DESC LIMIT ?'
        )
        .all(parseInt(connectionId), limit);
    } else {
      history = db
        .prepare('SELECT * FROM query_history ORDER BY executed_at DESC LIMIT ?')
        .all(limit);
    }

    return NextResponse.json({ history });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
