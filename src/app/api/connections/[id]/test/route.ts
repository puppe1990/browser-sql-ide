import { NextRequest, NextResponse } from 'next/server';
import { dbConnector } from '@/lib/database-connectors';
import { parsePositiveIntRouteParam } from '@/lib/route-params';
import { requireAuthenticatedUser } from '@/lib/require-auth';
import { loadDecryptedConnectionByIdAsync } from '@/lib/server/connections';
import { getErrorMessage } from '@/lib/utils';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth.error) return auth.error;

    const { id: routeId } = await context.params;
    const parsedId = parsePositiveIntRouteParam(routeId, 'Connection ID');
    if (parsedId.error) {
      return NextResponse.json({ error: parsedId.error }, { status: 400 });
    }
    const id = parsedId.value as number;
    const connection = await loadDecryptedConnectionByIdAsync(id);

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    await dbConnector.testConnection(connection);

    return NextResponse.json({ success: true, message: 'Connection successful' });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(error) },
      { status: 400 }
    );
  }
}
