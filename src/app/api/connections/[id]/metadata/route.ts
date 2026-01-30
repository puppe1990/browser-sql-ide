import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { decrypt } from '@/lib/encryption';
import { dbConnector } from '@/lib/database-connectors';
import { getErrorMessage } from '@/lib/utils';
import type { DbConnectionRow } from '@/types';

type MetadataCategory =
  | 'databases'
  | 'schemas'
  | 'schema_objects'
  | 'event_triggers'
  | 'extensions'
  | 'storage'
  | 'system_info'
  | 'roles';

function normalizeCategory(value: string | null): MetadataCategory | null {
  if (!value) return null;
  switch (value) {
    case 'databases':
    case 'schemas':
    case 'schema_objects':
    case 'event_triggers':
    case 'extensions':
    case 'storage':
    case 'system_info':
    case 'roles':
      return value;
    default:
      return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'Invalid connection id' }, { status: 400 });
    }

    const category = normalizeCategory(request.nextUrl.searchParams.get('category'));
    if (!category) {
      return NextResponse.json({ error: 'Missing or invalid category' }, { status: 400 });
    }

    const connectionRow = db
      .prepare('SELECT * FROM connections WHERE id = ?')
      .get(id) as DbConnectionRow | undefined;

    if (!connectionRow) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    if (connectionRow.type !== 'postgresql') {
      return NextResponse.json(
        { error: `Unsupported database type: ${connectionRow.type}` },
        { status: 400 }
      );
    }

    const connection = {
      id: connectionRow.id,
      name: connectionRow.name,
      type: connectionRow.type,
      host: connectionRow.host,
      port: connectionRow.port,
      database: connectionRow.database,
      username: connectionRow.username,
      password: decrypt(connectionRow.encrypted_password),
      ssl: Boolean(connectionRow.ssl),
    };

    const pool = await dbConnector.connect(connection);

    switch (category) {
      case 'databases': {
        const result = await pool.query(
          "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname"
        );
        return NextResponse.json({ items: result.rows.map((row) => row.datname) });
      }
      case 'schemas': {
        const result = await pool.query(
          'SELECT schema_name FROM information_schema.schemata ORDER BY schema_name'
        );
        return NextResponse.json({ items: result.rows.map((row) => row.schema_name) });
      }
      case 'schema_objects': {
        const schema = request.nextUrl.searchParams.get('schema');
        if (!schema) {
          return NextResponse.json({ error: 'Missing schema parameter' }, { status: 400 });
        }
        const result = await pool.query(
          `SELECT table_name, table_type
           FROM information_schema.tables
           WHERE table_schema = $1
           ORDER BY table_name`,
          [schema]
        );

        const tables: string[] = [];
        const views: string[] = [];
        const other: string[] = [];

        for (const row of result.rows) {
          if (row.table_type === 'BASE TABLE') {
            tables.push(row.table_name);
          } else if (row.table_type === 'VIEW') {
            views.push(row.table_name);
          } else {
            other.push(row.table_name);
          }
        }

        return NextResponse.json({ tables, views, other });
      }
      case 'event_triggers': {
        const result = await pool.query(
          'SELECT evtname FROM pg_event_trigger ORDER BY evtname'
        );
        return NextResponse.json({ items: result.rows.map((row) => row.evtname) });
      }
      case 'extensions': {
        const result = await pool.query('SELECT extname FROM pg_extension ORDER BY extname');
        return NextResponse.json({ items: result.rows.map((row) => row.extname) });
      }
      case 'storage': {
        const result = await pool.query('SELECT spcname FROM pg_tablespace ORDER BY spcname');
        return NextResponse.json({ items: result.rows.map((row) => row.spcname) });
      }
      case 'system_info': {
        const result = await pool.query(`
          SELECT
            current_database() AS database,
            current_user AS user,
            inet_server_addr() AS server_addr,
            inet_server_port() AS server_port,
            version() AS version,
            current_setting('server_version') AS server_version,
            current_setting('TimeZone') AS timezone
        `);
        return NextResponse.json({ info: result.rows[0] || {} });
      }
      case 'roles': {
        const result = await pool.query('SELECT rolname FROM pg_roles ORDER BY rolname');
        return NextResponse.json({ items: result.rows.map((row) => row.rolname) });
      }
      default:
        return NextResponse.json({ error: 'Unsupported category' }, { status: 400 });
    }
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
