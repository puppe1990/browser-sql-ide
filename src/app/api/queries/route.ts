import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getErrorMessage } from '@/lib/utils';

type SavedQueryPayload = {
  connectionId?: number | null;
  name?: string;
  query?: string;
  description?: string | null;
  folder?: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');

    let queries;
    if (connectionId) {
      queries = db
        .prepare(
          'SELECT * FROM saved_queries WHERE connection_id = ? ORDER BY created_at DESC'
        )
        .all(parseInt(connectionId));
    } else {
      queries = db
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
    const body = (await request.json()) as SavedQueryPayload;
    const { connectionId, name, query, description, folder } = body;

    if (!name || !query) {
      return NextResponse.json(
        { error: 'Name and query are required' },
        { status: 400 }
      );
    }

    const result = db
      .prepare(
        'INSERT INTO saved_queries (connection_id, name, query, description, folder) VALUES (?, ?, ?, ?, ?)'
      )
      .run(connectionId || null, name, query, description || null, folder || null);

    const savedQuery = db
      .prepare('SELECT * FROM saved_queries WHERE id = ?')
      .get(result.lastInsertRowid);

    return NextResponse.json({ query: savedQuery }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
