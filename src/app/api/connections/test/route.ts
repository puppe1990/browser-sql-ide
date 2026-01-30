import { NextRequest, NextResponse } from 'next/server';
import { dbConnector } from '@/lib/database-connectors';
import { getErrorMessage } from '@/lib/utils';

type ConnectionPayload = {
  name?: string;
  type?: string;
  host?: string;
  port?: number | string;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ConnectionPayload;
    const { name, type, host, port, database, username, password, ssl } = body;

    // Validate required fields
    if (!host || !port || !database || !username || !password) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields (host, port, database, username, password)' },
        { status: 400 }
      );
    }

    const connection = {
      name: name || 'Test Connection',
      type: type || 'postgresql',
      host,
      port: typeof port === 'string' ? parseInt(port, 10) : (port ?? 0),
      database,
      username,
      password,
      ssl: ssl || false,
    };

    // Test connection
    let pool;
    try {
      pool = await dbConnector.connect(connection);
      return NextResponse.json({
        success: true,
        message: 'Connection test successful!',
      });
    } catch (error: unknown) {
      return NextResponse.json(
        { success: false, error: getErrorMessage(error) || 'Connection test failed' },
        { status: 400 }
      );
    } finally {
      if (pool) {
        await pool.end();
      }
    }
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(error) || 'Invalid request' },
      { status: 500 }
    );
  }
}
