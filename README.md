# Browser SQL IDE

A web-based SQL IDE for managing database connections, running queries, and comparing results side-by-side. It currently supports PostgreSQL, SQLite (via file upload), and Turso.

![Browser SQL IDE Interface](./print.png)

## Features

- **Multiple connectors**: PostgreSQL, SQLite (uploaded `.db/.sqlite/.sqlite3` files), and Turso
- **Connection management**: create, edit, test, set default, delete; import/export JSON; encrypted credentials
- **Tabbed query editor**: multi-tab Monaco editor with Ctrl/Cmd+Enter execution and error line highlighting
- **Split-screen mode**: run two editors in parallel for faster comparisons
- **Compare mode**: compare two result sets by key, highlight field differences, export comparison to CSV
- **Result pagination**: infinite scroll with row counts, execution time, and total count when available
- **Result export/import**: export to CSV or SQL INSERTs; import INSERT statements; insert results into another connection
- **Saved queries**: folders, descriptions, duplication, and one-click execution
- **Local persistence**: tab state and layout stored in localStorage
- **Responsive + dark mode**

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Backend**: Next.js Route Handlers (Node.js)
- **Metadata Storage**: SQLite via better-sqlite3 (`data/ide.db`)
- **Database Connectors**: PostgreSQL (`pg`), SQLite (`better-sqlite3`), and Turso (`@libsql/client`)
- **UI**: Tailwind CSS, Lucide React
- **Editor**: Monaco Editor
- **Encryption**: crypto-js (AES)

## Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL database (optional, only if you want PostgreSQL connections)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd browser-sql-ide
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (optional):
Create a `.env.local` file in the root directory:
```env
ENCRYPTION_KEY=your-secure-encryption-key-here
```

**Important**: In production, use a strong, randomly generated encryption key. The default key is only for development.

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Connections

1. Click **New Connection** in the Connections panel
2. Choose the connection type:
   - PostgreSQL: fill host, port, database, username, password, SSL
   - SQLite: upload a `.db`, `.sqlite`, or `.sqlite3` file
   - Turso: fill URL (`libsql://...`) and Auth Token
3. Click **Create** to save
4. Use **Test** to verify connectivity
5. Optionally mark a connection as **Default** for new tabs

**Import/Export**
- Export connections from the sidebar (passwords are not included for security)
- Import connections from JSON (see `connections.example.json`)

### Query Editor

- Use **tabs** to keep multiple queries open
- Toggle **Split Screen** to open a second editor
- Press **Ctrl/Cmd+Enter** to run the current statement
- Use **Compare Mode** to compare results from both editors (select a key column and optional fields)

### Results

- Results load with pagination (100 rows per page) and infinite scroll
- Export results to **CSV** or **INSERT statements**
- Import **INSERT statements** from a file
- Insert result rows into another connection (uses the query’s target table name when possible)

### Saved Queries

- Save queries with name, description, and folder
- Duplicate or execute saved queries directly

## Project Structure

```
browser-sql-ide/
├── src/
│   ├── app/
│   │   ├── (main)/              # Main UI route
│   │   ├── api/                 # API routes
│   │   │   ├── connections/     # Connection management endpoints
│   │   │   ├── queries/         # Saved queries endpoints
│   │   │   ├── query/           # Query execution + pagination
│   │   │   └── history/         # Query history endpoint
│   │   └── layout.tsx
│   ├── components/
│   │   ├── features/            # Feature modules (editor, results, etc.)
│   │   └── ui/                  # Shared UI primitives
│   ├── lib/                     # DB access, encryption, utils
│   ├── styles/                  # Global styles
│   └── types/                   # Shared TS types
├── data/                        # SQLite metadata database (auto-created)
└── package.json
```

## API Endpoints

### Connections
- `GET /api/connections` - List all connections
- `POST /api/connections` - Create a new connection
- `GET /api/connections/[id]` - Get a specific connection
- `PUT /api/connections/[id]` - Update a connection
- `DELETE /api/connections/[id]` - Delete a connection
- `POST /api/connections/[id]/test` - Test a saved connection
- `POST /api/connections/test` - Test a connection payload (without saving)

### Queries
- `GET /api/queries` - List saved queries (optional: `?connectionId=X`)
- `POST /api/queries` - Save a new query
- `GET /api/queries/[id]` - Get a specific query
- `PUT /api/queries/[id]` - Update a query
- `DELETE /api/queries/[id]` - Delete a query

### Query Execution
- `POST /api/query/execute` - Execute a SQL query (returns first 100 rows)
- `POST /api/query/paginate` - Load more rows for a query

### History
- `GET /api/history` - Get query history (optional: `?connectionId=X&limit=50`)

## Security Considerations

- **Encryption**: Passwords are AES-encrypted before storage (set `ENCRYPTION_KEY` in production)
- **Local data**: Metadata is stored locally in `data/ide.db`
- **Trusted usage**: Queries execute exactly as provided; treat the IDE as a trusted admin tool

## Future Enhancements

- [ ] Support for MySQL and MSSQL connectors
- [ ] Query result charts and graphs
- [ ] Query autocomplete and suggestions
- [ ] Database schema browser
- [ ] Query performance analysis
- [ ] Collaborative features
- [ ] Export to additional formats (JSON, Excel)
- [ ] Query templates
- [ ] Keyboard shortcut cheatsheet

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
