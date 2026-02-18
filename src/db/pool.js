const { Pool } = require('pg');

let pool;

async function initDatabase() {
  pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'url_shortener',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: parseInt(process.env.DB_POOL_SIZE || '20'),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  // Test connection
  const client = await pool.connect();
  console.log('Connected to PostgreSQL');
  client.release();

  return pool;
}

function getPool() {
  if (!pool) {
    throw new Error('Database pool not initialized');
  }
  return pool;
}

async function query(text, params = []) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

module.exports = {
  initDatabase,
  getPool,
  query,
};
