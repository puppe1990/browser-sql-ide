# Browser SQL IDE

A comprehensive web-based SQL IDE for database management that allows users to connect to multiple database types, starting with PostgreSQL. The IDE features an intuitive user interface for managing multiple connections, executing complex SQL queries, and visualizing data results.

## Features

- **Multi-Database Support**: Currently supports PostgreSQL, with architecture ready for MySQL, SQLite, and MSSQL
- **Connection Management**: Create, edit, test, and delete database connections with secure credential storage
- **Import/Export**: Import and export connections via JSON files for easy backup and migration
- **Query Editor**: Advanced SQL editor with syntax highlighting powered by Monaco Editor
- **Data Visualization**: Beautiful table view for query results with export to CSV functionality
- **Query Organization**: Save and organize queries with folders and descriptions
- **Query History**: Automatic tracking of executed queries with execution times
- **Secure Credentials**: Encrypted password storage using AES encryption
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Dark Mode**: Built-in dark mode support

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Next.js API Routes (Node.js)
- **Database Storage**: SQLite (for IDE metadata)
- **Database Connectors**: PostgreSQL (pg)
- **UI**: Tailwind CSS, Lucide React Icons
- **Editor**: Monaco Editor (VS Code editor)
- **Encryption**: crypto-js

## Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL database (for testing connections)

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

### Creating a Connection

1. Click "New Connection" in the Connections panel
2. Fill in the connection details:
   - **Name**: A friendly name for your connection
   - **Type**: Database type (currently PostgreSQL)
   - **Host**: Database host address
   - **Port**: Database port (default: 5432 for PostgreSQL)
   - **Database**: Database name
   - **Username**: Database username
   - **Password**: Database password
   - **SSL**: Enable if your database requires SSL
3. Click "Create" to save the connection
4. Test the connection using the test button

### Importing/Exporting Connections

You can import and export database connections using JSON files:

**Export Connections:**
1. Click the "Export" button in the Connections panel
2. A JSON file will be downloaded with all your connections (passwords are not included for security)

**Import Connections:**
1. Click the "Import" button in the Connections panel
2. Either:
   - Select a JSON file using the file picker, or
   - Paste JSON data directly into the text area
3. Click "Import" to add the connections

**JSON Format:**
```json
[
  {
    "name": "My Database",
    "type": "postgresql",
    "host": "localhost",
    "port": 5432,
    "database": "mydb",
    "username": "user",
    "password": "password",
    "ssl": false
  }
]
```

**Note:** Passwords are not exported for security reasons. You'll need to add passwords to the JSON before importing, or update them after import. See `connections.example.json` for a complete example.

### Executing Queries

1. Select a connection from the Connections panel
2. Write your SQL query in the Query Editor
3. Click "Execute" to run the query
4. View results in the Data Visualization panel below

### Saving Queries

1. Write your query in the editor
2. Click "Save" button
3. Enter a name for the query
4. Optionally add a description and folder for organization

### Managing Saved Queries

- View all saved queries in the Saved Queries panel
- Queries are organized by folders
- Click on a query to load it into the editor
- Use the execute button to run a saved query directly
- Edit or delete queries using the action buttons

### Exporting Results

- Click the download icon in the Query Results panel
- Results will be exported as a CSV file

## Project Structure

```
browser-sql-ide/
├── app/
│   ├── api/              # API routes
│   │   ├── connections/  # Connection management endpoints
│   │   ├── queries/      # Saved queries endpoints
│   │   ├── query/        # Query execution endpoint
│   │   └── history/      # Query history endpoint
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Main page
│   └── globals.css       # Global styles
├── components/
│   ├── ConnectionManager.tsx    # Connection management UI
│   ├── QueryEditor.tsx           # SQL query editor
│   ├── DataVisualization.tsx     # Results visualization
│   └── SavedQueries.tsx          # Saved queries panel
├── lib/
│   ├── db.ts                    # SQLite database setup
│   ├── encryption.ts            # Credential encryption
│   ├── database-connectors.ts   # Database connection logic
│   └── utils.ts                 # Utility functions
├── data/                        # SQLite database files (auto-created)
└── package.json
```

## API Endpoints

### Connections
- `GET /api/connections` - List all connections
- `POST /api/connections` - Create a new connection
- `GET /api/connections/[id]` - Get a specific connection
- `PUT /api/connections/[id]` - Update a connection
- `DELETE /api/connections/[id]` - Delete a connection
- `POST /api/connections/[id]/test` - Test a connection

### Queries
- `GET /api/queries` - List saved queries (optional: ?connectionId=X)
- `POST /api/queries` - Save a new query
- `GET /api/queries/[id]` - Get a specific query
- `PUT /api/queries/[id]` - Update a query
- `DELETE /api/queries/[id]` - Delete a query

### Query Execution
- `POST /api/query/execute` - Execute a SQL query

### History
- `GET /api/history` - Get query history (optional: ?connectionId=X&limit=50)

## Security Considerations

- **Encryption**: Passwords are encrypted using AES encryption before storage
- **Environment Variables**: Use strong encryption keys in production
- **SSL Support**: Enable SSL for database connections when available
- **Input Validation**: All API endpoints validate input data
- **SQL Injection**: Use parameterized queries (handled by pg library)

## Adding Support for Additional Databases

The architecture is designed to be extensible. To add support for a new database:

1. Install the appropriate database driver (e.g., `mysql2` for MySQL)
2. Update `lib/database-connectors.ts` to add the new database type
3. Add the new type to the `DatabaseType` union type
4. Implement the connection logic in the `connect` method
5. Update the connection form in `components/ConnectionManager.tsx`

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

## Database Schema

The SQLite database stores:
- **connections**: Database connection configurations (with encrypted passwords)
- **saved_queries**: User-saved SQL queries with metadata
- **query_history**: Execution history with timestamps and performance metrics

## Future Enhancements

- [ ] Support for MySQL, SQLite, and MSSQL
- [ ] Query result charts and graphs
- [ ] Query autocomplete and suggestions
- [ ] Multi-tab query editor
- [ ] Database schema browser
- [ ] Query performance analysis
- [ ] Collaborative features
- [ ] Export to multiple formats (JSON, Excel)
- [ ] Query templates
- [ ] Keyboard shortcuts

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
