import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { readConnectionPayload, type ConnectionPayload } from '@/lib/connection-payload';
import { dbConnector } from '@/lib/database-connectors';
import { parseOptionalPositivePort } from '@/lib/port-params';
import { getErrorMessage } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const parsedPayload = await readConnectionPayload(request);
    if (parsedPayload.error) {
      return NextResponse.json(
        { success: false, error: parsedPayload.error },
        { status: parsedPayload.status ?? 400 }
      );
    }
    const body = (parsedPayload.value ?? {}) as ConnectionPayload;
    const { name, type, host, port, database, username, password, ssl, sqliteFile } = body;
    const normalizedType = type || 'postgresql';
    const parsedPort = parseOptionalPositivePort(port);
    if (parsedPort.error) {
      return NextResponse.json(
        { success: false, error: parsedPort.error },
        { status: 400 }
      );
    }

    let nextHost = host;
    let nextPort = parsedPort.value ?? 0;
    let nextDatabase = database;
    let nextUsername = username;
    let nextPassword = password;
    let nextSsl = ssl || false;

    let tempSqlitePath: string | null = null;
    if (normalizedType === 'sqlite') {
      if (sqliteFile && sqliteFile.size > 0) {
        const ext = path.extname(sqliteFile.name || '').toLowerCase() || '.db';
        const safeExt = ['.db', '.sqlite', '.sqlite3'].includes(ext) ? ext : '.db';
        tempSqlitePath = path.join(
          os.tmpdir(),
          `browser-sql-ide-test-${Date.now()}-${Math.random().toString(36).slice(2)}${safeExt}`
        );
        const buffer = Buffer.from(await sqliteFile.arrayBuffer());
        fs.writeFileSync(tempSqlitePath, buffer);
        nextDatabase = tempSqlitePath;
      }
      if (!nextDatabase) {
        return NextResponse.json(
          { success: false, error: 'SQLite file is required' },
          { status: 400 }
        );
      }
      nextHost = 'localfile';
      nextPort = 0;
      nextUsername = 'sqlite';
      nextPassword = 'sqlite';
      nextSsl = false;
    }

    if (normalizedType === 'turso') {
      if (!nextHost) {
        return NextResponse.json(
          { success: false, error: 'Turso URL is required' },
          { status: 400 }
        );
      }
      if (!nextPassword) {
        return NextResponse.json(
          { success: false, error: 'Turso auth token is required' },
          { status: 400 }
        );
      }

      nextPort = Number.isFinite(nextPort) && nextPort > 0 ? nextPort : 443;
      nextDatabase = nextDatabase || 'main';
      nextUsername = nextUsername || 'turso';
      nextSsl = true;
    }

    const connection = {
      name: name || 'Test Connection',
      type: normalizedType,
      host: nextHost || '',
      port: nextPort,
      database: nextDatabase || '',
      username: nextUsername || '',
      password: nextPassword || '',
      ssl: nextSsl,
    };

    if (!connection.host || !Number.isFinite(connection.port) || !connection.database || !connection.username || !connection.password) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields (host, port, database, username, password)' },
        { status: 400 }
      );
    }

    // Test connection
    try {
      await dbConnector.testConnection(connection);
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
      if (tempSqlitePath && fs.existsSync(tempSqlitePath)) {
        fs.unlinkSync(tempSqlitePath);
      }
    }
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(error) || 'Invalid request' },
      { status: 500 }
    );
  }
}
