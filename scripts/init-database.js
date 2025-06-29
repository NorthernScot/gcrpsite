const { initDatabase, getDb } = require('../config/database');
const fs = require('fs');
const path = require('path');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('Created data directory');
}

// Initialize database
async function initializeDatabase() {
  try {
    console.log('🚀 Initializing GCRP Database...');
    await initDatabase();

    // Get db instance
    const { getDb } = require('../config/database');
    const db = getDb();

    // Add avatar, bio, badges columns to users table if not exists
    try { await db.run(`ALTER TABLE users ADD COLUMN avatar TEXT`); } catch (e) {}
    try { await db.run(`ALTER TABLE users ADD COLUMN bio TEXT`); } catch (e) {}
    try { await db.run(`ALTER TABLE users ADD COLUMN badges TEXT`); } catch (e) {}

    // Followers table
    await db.run(`CREATE TABLE IF NOT EXISTS followers (
      user_id INTEGER NOT NULL,
      follower_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, follower_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    // Activity table
    await db.run(`CREATE TABLE IF NOT EXISTS activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    console.log('🎉 Database initialization completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Run: npm run dev');
    console.log('2. Open: http://localhost:3000');
    console.log('3. Register your first admin account');
    console.log('4. Update the user to have admin role in the database');

    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase; 