import { NextRequest, NextResponse } from 'next/server';
import { dbConnector } from '@/lib/database-connectors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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
      port: parseInt(port),
      database,
      username,
      password,
      ssl: ssl || false,
    };

    // Test connection
    try {
      await dbConnector.connect(connection);
      return NextResponse.json({ 
        success: true, 
        message: 'Connection test successful!' 
      });
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error.message || 'Connection test failed' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Invalid request' },
      { status: 500 }
    );
  }
}
