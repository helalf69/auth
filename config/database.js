const mariadb = require('mariadb');

// Create connection pool
const pool = mariadb.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'authuser',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'authdb',
  connectionLimit: 5,
  acquireTimeout: 30000,
  timeout: 30000
});

// Test connection
async function testConnection() {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query('SELECT 1');
    console.log('Connected to MariaDB successfully');
    return true;
  } catch (error) {
    console.error('MariaDB connection error:', error);
    return false;
  } finally {
    if (conn) conn.release();
  }
}

// Get connection from pool
async function getConnection() {
  return await pool.getConnection();
}

// Close pool (call on server shutdown)
async function closePool() {
  await pool.end();
}

module.exports = {
  pool,
  getConnection,
  testConnection,
  closePool
};
