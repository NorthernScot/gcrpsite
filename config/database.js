const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');

let db = null;

// Initialize database connection
const initDatabase = async () => {
  try {
    // Create data directory if it doesn't exist
    const dataDir = path.join(__dirname, '..', 'data');
    const fs = require('fs');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = path.join(dataDir, 'gcrp.db');
    
    // Open database connection
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Enable foreign keys
    await db.exec('PRAGMA foreign_keys = ON');

    // Drop existing tables to ensure clean schema
    await dropTables();
    
    // Create tables
    await createTables();
    
    // Insert default roles
    await insertDefaultRoles();

    console.log('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Drop existing tables
const dropTables = async () => {
  await db.exec('DROP TABLE IF EXISTS activity_log');
  await db.exec('DROP TABLE IF EXISTS notifications');
  await db.exec('DROP TABLE IF EXISTS applications');
  await db.exec('DROP TABLE IF EXISTS user_roles');
  await db.exec('DROP TABLE IF EXISTS roles');
  await db.exec('DROP TABLE IF EXISTS users');
  console.log('Existing tables dropped');
};

// Create tables
const createTables = async () => {
  // Users table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      discord_id TEXT,
      profile_picture TEXT,
      banner TEXT,
      bio TEXT,
      join_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME,
      is_banned BOOLEAN DEFAULT 0,
      ban_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Roles table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      displayName TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#4fc3f7',
      discordRoleId TEXT UNIQUE,
      permissions TEXT,
      isDefault BOOLEAN DEFAULT 0,
      isActive BOOLEAN DEFAULT 1,
      priority INTEGER DEFAULT 0,
      createdBy INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // User roles junction table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS user_roles (
      user_id INTEGER,
      role_id INTEGER,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      assigned_by INTEGER,
      PRIMARY KEY (user_id, role_id),
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_by) REFERENCES users (id)
    )
  `);

  // Applications table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      department TEXT NOT NULL,
      position TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      reviewed_by INTEGER,
      reviewed_at DATETIME,
      review_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES users (id)
    )
  `);

  // Notifications table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      is_read BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // Activity log table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
    )
  `);

  console.log('Database tables created successfully');
};

// Insert default roles
const insertDefaultRoles = async () => {
  const defaultRoles = [
    { 
      name: 'admin', 
      displayName: 'Administrator', 
      description: 'Full system administrator', 
      permissions: ['admin.dashboard', 'users.view', 'users.edit', 'users.delete', 'users.ban', 'users.unban', 'roles.view', 'roles.create', 'roles.edit', 'roles.delete', 'roles.assign', 'applications.view', 'applications.create', 'applications.edit', 'applications.delete', 'applications.approve', 'applications.reject', 'applications.comment', 'content.view', 'content.create', 'content.edit', 'content.delete', 'admin.settings', 'admin.logs', 'admin.backup', 'discord.sync', 'discord.manage', 'notifications.send', 'notifications.manage'], 
      color: '#ff0000',
      isDefault: false,
      isActive: true,
      priority: 100
    },
    { 
      name: 'moderator', 
      displayName: 'Moderator', 
      description: 'Community moderator', 
      permissions: ['users.view', 'applications.view', 'applications.approve', 'applications.reject', 'applications.comment', 'content.view', 'content.create', 'content.edit', 'notifications.send'], 
      color: '#ffa500',
      isDefault: false,
      isActive: true,
      priority: 50
    },
    { 
      name: 'member', 
      displayName: 'Member', 
      description: 'Regular community member', 
      permissions: ['applications.create', 'content.view'], 
      color: '#7289da',
      isDefault: true,
      isActive: true,
      priority: 0
    }
  ];

  for (const role of defaultRoles) {
    await db.run(
      'INSERT OR IGNORE INTO roles (name, displayName, description, permissions, color, isDefault, isActive, priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [role.name, role.displayName, role.description, JSON.stringify(role.permissions), role.color, role.isDefault ? 1 : 0, role.isActive ? 1 : 0, role.priority]
    );
  }

  console.log('Default roles inserted successfully');
};

// Get database instance
const getDb = () => {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
};

module.exports = {
  initDatabase,
  getDb
}; 