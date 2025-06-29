const crypto = require('crypto');

console.log('🔐 Generating secure secrets for your Gold Coast RP website...\n');

// Generate JWT Secret
const jwtSecret = crypto.randomBytes(64).toString('hex');
console.log('JWT_SECRET=' + jwtSecret);

// Generate Session Secret
const sessionSecret = crypto.randomBytes(32).toString('hex');
console.log('SESSION_SECRET=' + sessionSecret);

console.log('\n✅ Copy these values to your environment variables!');
console.log('⚠️  Keep these secrets secure and never commit them to version control.'); 