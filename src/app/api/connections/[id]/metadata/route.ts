import { NextRequest, NextResponse } from 'next/server';
import { dbConnector } from '@/lib/database-connectors';
import { parseMetadataCategoryParam, parseRequiredStringParam } from '@/lib/metadata-params';
import { parsePositiveIntRouteParam } from '@/lib/route-params';
import { hydrateConnectionRow, loadConnectionRowByIdAsync } from '@/lib/server/connections';
import { getErrorMessage } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: routeId } = await context.params;
    const parsedId = parsePositiveIntRouteParam(routeId, 'Connection ID');
    if (parsedId.error) {
      return NextResponse.json({ error: parsedId.error }, { status: 400 });
    }
    const id = parsedId.value as number;

    const parsedCategory = parseMetadataCategoryParam(request.nextUrl.searchParams.get('category'));
    if (parsedCategory.error) {
      return NextResponse.json({ error: parsedCategory.error }, { status: 400 });
    }
    const category = parsedCategory.value;

    const connectionRow = await loadConnectionRowByIdAsync(id);

    if (!connectionRow) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    if (connectionRow.type !== 'postgresql') {
      return NextResponse.json(
        { error: `Unsupported database type: ${connectionRow.type}` },
        { status: 400 }
      );
    }

    const connection = hydrateConnectionRow(connectionRow);

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
        const parsedSchema = parseRequiredStringParam(request.nextUrl.searchParams.get('schema'), 'schema');
        if (parsedSchema.error) {
          return NextResponse.json({ error: parsedSchema.error }, { status: 400 });
        }
        const schema = parsedSchema.value;
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
