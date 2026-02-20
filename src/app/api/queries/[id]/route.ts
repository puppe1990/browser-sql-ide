import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { parsePositiveIntRouteParam } from '@/lib/route-params';
import { parseJsonObjectBody } from '@/lib/request-body';
import { parseSavedQueryUpdatePayload } from '@/lib/saved-query-payload';
import { getErrorMessage } from '@/lib/utils';

type SavedQueryRow = {
  id: number;
  connection_id: number | null;
  name: string;
  query: string;
  description: string | null;
  folder: string | null;
  created_at: string;
  updated_at: string;
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: routeId } = await context.params;
    const parsedId = parsePositiveIntRouteParam(routeId, 'Query ID');
    if (parsedId.error) {
      return NextResponse.json({ error: parsedId.error }, { status: 400 });
    }
    const id = parsedId.value as number;
    const query = await db
      .prepare('SELECT * FROM saved_queries WHERE id = ?')
      .get(id) as SavedQueryRow | undefined;

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
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: routeId } = await context.params;
    const parsedId = parsePositiveIntRouteParam(routeId, 'Query ID');
    if (parsedId.error) {
      return NextResponse.json({ error: parsedId.error }, { status: 400 });
    }
    const id = parsedId.value as number;
    const parsedBody = await parseJsonObjectBody<Record<string, unknown>>(request);
    if (parsedBody.error) {
      return NextResponse.json({ error: parsedBody.error }, { status: parsedBody.status ?? 400 });
    }
    const body = parsedBody.value as Record<string, unknown>;
    const parsedPayload = parseSavedQueryUpdatePayload(body);
    if (parsedPayload.error !== undefined) {
      return NextResponse.json({ error: parsedPayload.error }, { status: 400 });
    }
    const { name, query, description, folder } = parsedPayload;

    const existing = await db
      .prepare('SELECT * FROM saved_queries WHERE id = ?')
      .get(id) as SavedQueryRow | undefined;

    if (!existing) {
      return NextResponse.json({ error: 'Query not found' }, { status: 404 });
    }

    const nextName = name ?? existing.name;
    const nextQuery = query ?? existing.query;
    const nextDescription = description === undefined ? existing.description : description;
    const nextFolder = folder === undefined ? existing.folder : folder;

    await db.prepare(
      'UPDATE saved_queries SET name = ?, query = ?, description = ?, folder = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(nextName, nextQuery, nextDescription, nextFolder, id);

    const updatedQuery = await db
      .prepare('SELECT * FROM saved_queries WHERE id = ?')
      .get(id) as SavedQueryRow | undefined;

    return NextResponse.json({ query: updatedQuery });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: routeId } = await context.params;
    const parsedId = parsePositiveIntRouteParam(routeId, 'Query ID');
    if (parsedId.error) {
      return NextResponse.json({ error: parsedId.error }, { status: 400 });
    }
    const id = parsedId.value as number;
    const result = await db.prepare('DELETE FROM saved_queries WHERE id = ?').run(id);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Query not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
