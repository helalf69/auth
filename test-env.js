// Simple script to test if .env file is being loaded correctly
require('dotenv').config();

console.log('Environment Variables Test:');
console.log('==========================\n');

const requiredVars = [
  'DB_HOST',
  'DB_PORT', 
  'DB_USER',
  'DB_PASS',
  'DB_NAME',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'FACEBOOK_APP_ID',
  'FACEBOOK_APP_SECRET',
  'SESSION_SECRET'
];

console.log('Database Variables:');
console.log('  DB_HOST:', process.env.DB_HOST || '(NOT SET)');
console.log('  DB_PORT:', process.env.DB_PORT || '(NOT SET)');
console.log('  DB_USER:', process.env.DB_USER || '(NOT SET)');
console.log('  DB_PASS:', process.env.DB_PASS ? '***' : '(NOT SET)');
console.log('  DB_NAME:', process.env.DB_NAME || '(NOT SET)');
console.log('\nOAuth Variables:');
console.log('  GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✓ Set' : '(NOT SET)');
console.log('  GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✓ Set' : '(NOT SET)');
console.log('  FACEBOOK_APP_ID:', process.env.FACEBOOK_APP_ID ? '✓ Set' : '(NOT SET)');
console.log('  FACEBOOK_APP_SECRET:', process.env.FACEBOOK_APP_SECRET ? '✓ Set' : '(NOT SET)');
console.log('\nSession:');
console.log('  SESSION_SECRET:', process.env.SESSION_SECRET ? '✓ Set' : '(NOT SET)');

console.log('\n==========================');
const missing = requiredVars.filter(v => !process.env[v]);
if (missing.length > 0) {
  console.log('⚠ Missing variables:', missing.join(', '));
} else {
  console.log('✓ All required variables are set');
}
