import db from './src/lib/db.js';

console.log('Testing database initialization...');
try {
  const connections = db.prepare('SELECT COUNT(*) as count FROM connections').get();
  console.log('Database initialized successfully. Connections count:', connections.count);
} catch (error) {
  console.error('Database initialization failed:', error.message);
}