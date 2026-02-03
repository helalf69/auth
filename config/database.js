const mariadb = require('mariadb');

// Database configuration from environment variables
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'authuser',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'authdb',
  connectionLimit: 5,
  acquireTimeout: 30000,
  timeout: 30000
};

// Debug: Log database configuration (without password)
console.log('\nDatabase Configuration:');
console.log('  Host:', dbConfig.host);
console.log('  Port:', dbConfig.port);
console.log('  User:', dbConfig.user);
console.log('  Database:', dbConfig.database);
console.log('  Password:', dbConfig.password ? '***' : '(empty)');
console.log('');

// Create connection pool
const pool = mariadb.createPool(dbConfig);

// Test connection
async function testConnection() {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query('SELECT 1');
    console.log('✓ Connected to MariaDB successfully');
    return true;
  } catch (error) {
    console.error('\n✗ MariaDB connection error:');
    console.error('  Error:', error.message);
    if (error.cause) {
      console.error('  Cause:', error.cause.message);
    }
    console.error('\n  Attempted connection with:');
    console.error('    Host:', dbConfig.host);
    console.error('    Port:', dbConfig.port);
    console.error('    User:', dbConfig.user);
    console.error('    Database:', dbConfig.database);
    console.error('\n  Please verify:');
    console.error('    1. Database server is running and accessible');
    console.error('    2. DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME are set in .env');
    console.error('    3. User has proper permissions');
    console.error('    4. Firewall allows connection from this host\n');
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
