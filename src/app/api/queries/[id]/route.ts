import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getErrorMessage } from '@/lib/utils';

type SavedQueryPayload = {
  name?: string;
  query?: string;
  description?: string | null;
  folder?: string | null;
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const query = db.prepare('SELECT * FROM saved_queries WHERE id = ?').get(id);

    if (!query) {
      return NextResponse.json({ error: 'Query not found' }, { status: 404 });
    }

    return NextResponse.json({ query });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const body = (await request.json()) as SavedQueryPayload;
    const { name, query, description, folder } = body;

    const existing = db
      .prepare('SELECT * FROM saved_queries WHERE id = ?')
      .get(id);

    if (!existing) {
      return NextResponse.json({ error: 'Query not found' }, { status: 404 });
    }

    const nextName = name ?? existing.name;
    const nextQuery = query ?? existing.query;
    const nextDescription = description === undefined ? existing.description : description;
    const nextFolder = folder === undefined ? existing.folder : folder;

    db.prepare(
      'UPDATE saved_queries SET name = ?, query = ?, description = ?, folder = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(nextName, nextQuery, nextDescription, nextFolder, id);

    const updatedQuery = db
      .prepare('SELECT * FROM saved_queries WHERE id = ?')
      .get(id);

    return NextResponse.json({ query: updatedQuery });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const result = db.prepare('DELETE FROM saved_queries WHERE id = ?').run(id);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Query not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
