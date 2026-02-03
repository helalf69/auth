const crypto = require('crypto');
const db = require('../config/database');

// Generate a secure random token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Create token for user
async function createToken(user, rememberDays = 30) {
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + rememberDays);

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Delete any existing tokens for this user
    await conn.query(
      'DELETE FROM remember_tokens WHERE userId = ? AND provider = ?',
      [user.id, user.provider]
    );

    // Insert new token
    await conn.query(
      `INSERT INTO remember_tokens 
       (token, userId, provider, userEmail, userName, userPhoto, expiresAt, createdAt, lastUsed) 
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        token,
        user.id,
        user.provider,
        user.email,
        user.name,
        user.photo || null,
        expiresAt
      ]
    );

    await conn.commit();
    return token;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

// Find and validate token
async function validateToken(token) {
  const conn = await db.getConnection();
  try {
    const rows = await conn.query(
      'SELECT * FROM remember_tokens WHERE token = ?',
      [token]
    );

    if (rows.length === 0) {
      return null;
    }

    const rememberToken = rows[0];

    // Check if token is expired
    if (new Date(rememberToken.expiresAt) < new Date()) {
      // Delete expired token
      await conn.query('DELETE FROM remember_tokens WHERE token = ?', [token]);
      return null;
    }

    // Update last used
    await conn.query(
      'UPDATE remember_tokens SET lastUsed = NOW() WHERE token = ?',
      [token]
    );

    return {
      id: rememberToken.userId,
      provider: rememberToken.provider,
      name: rememberToken.userName,
      email: rememberToken.userEmail,
      photo: rememberToken.userPhoto
    };
  } catch (error) {
    throw error;
  } finally {
    conn.release();
  }
}

// Delete token
async function deleteToken(token) {
  const conn = await db.getConnection();
  try {
    const result = await conn.query(
      'DELETE FROM remember_tokens WHERE token = ?',
      [token]
    );
    // mariadb returns result object with affectedRows property
    return result && result.affectedRows > 0;
  } catch (error) {
    throw error;
  } finally {
    conn.release();
  }
}

// Initialize database table (call this on server startup)
async function initializeTable() {
  const conn = await db.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS remember_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        token VARCHAR(64) NOT NULL UNIQUE,
        userId VARCHAR(255) NOT NULL,
        provider ENUM('google', 'facebook', 'microsoft') NOT NULL,
        userEmail VARCHAR(255) NOT NULL,
        userName VARCHAR(255) NOT NULL,
        userPhoto TEXT,
        expiresAt DATETIME NOT NULL,
        createdAt DATETIME NOT NULL,
        lastUsed DATETIME NOT NULL,
        INDEX idx_token (token),
        INDEX idx_user (userId, provider),
        INDEX idx_expires (expiresAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Clean up expired tokens
    await conn.query('DELETE FROM remember_tokens WHERE expiresAt < NOW()');
    
    console.log('Remember tokens table initialized');
  } catch (error) {
    console.error('Error initializing remember_tokens table:', error);
    throw error;
  } finally {
    conn.release();
  }
}

module.exports = {
  createToken,
  validateToken,
  deleteToken,
  initializeTable
};
