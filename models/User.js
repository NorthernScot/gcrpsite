const bcrypt = require('bcryptjs');
const { getDb } = require('../config/database');

class User {
  static async create(userData) {
    const db = getDb();
    const { username, email, password, discord_id } = userData;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const result = await db.run(
      `INSERT INTO users (username, email, password, discord_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [username, email, hashedPassword, discord_id]
    );
    
    return { id: result.lastID, username, email, discord_id };
  }

  static async findById(id) {
    const db = getDb();
    return await db.get('SELECT * FROM users WHERE id = ?', [id]);
  }

  static async findByEmail(email) {
    const db = getDb();
    return await db.get('SELECT * FROM users WHERE email = ?', [email]);
  }

  static async findByUsername(username) {
    const db = getDb();
    return await db.get('SELECT * FROM users WHERE username = ?', [username]);
  }

  static async findByDiscordId(discord_id) {
    const db = getDb();
    return await db.get('SELECT * FROM users WHERE discord_id = ?', [discord_id]);
  }

  static async findOne(criteria) {
    const db = getDb();
    const conditions = Object.keys(criteria).map(key => `${key} = ?`).join(' OR ');
    const values = Object.values(criteria);
    
    return await db.get(`SELECT * FROM users WHERE ${conditions}`, values);
  }

  static async updateById(id, updates) {
    const db = getDb();
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), id];
    
    const result = await db.run(
      `UPDATE users SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );
    
    return { changes: result.changes };
  }

  static async getRoles(userId) {
    const db = getDb();
    const roles = await db.all(`
      SELECT r.* FROM roles r
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = ? AND r.isActive = 1
      ORDER BY r.priority DESC, r.name ASC
    `, [userId]);
    
    return roles.map(role => ({
      ...role,
      permissions: JSON.parse(role.permissions || '[]'),
      isDefault: Boolean(role.isDefault),
      isActive: Boolean(role.isActive)
    }));
  }

  static async addRole(userId, roleId, assignedBy = null) {
    const db = getDb();
    const result = await db.run(
      'INSERT OR IGNORE INTO user_roles (user_id, role_id, assigned_by) VALUES (?, ?, ?)',
      [userId, roleId, assignedBy]
    );
    
    return { changes: result.changes };
  }

  static async removeRole(userId, roleId) {
    const db = getDb();
    const result = await db.run(
      'DELETE FROM user_roles WHERE user_id = ? AND role_id = ?',
      [userId, roleId]
    );
    
    return { changes: result.changes };
  }

  static async getPermissions(userId) {
    const db = getDb();
    const rows = await db.all(`
      SELECT DISTINCT r.permissions FROM roles r
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = ? AND r.isActive = 1
    `, [userId]);
    
    const permissions = new Set();
    rows.forEach(row => {
      if (row.permissions) {
        const rolePermissions = JSON.parse(row.permissions);
        rolePermissions.forEach(permission => permissions.add(permission));
      }
    });
    
    return Array.from(permissions);
  }

  static async hasPermission(userId, permission) {
    const permissions = await this.getPermissions(userId);
    return permissions.includes(permission);
  }

  static async hasAnyPermission(userId, permissions) {
    const userPermissions = await this.getPermissions(userId);
    return permissions.some(permission => userPermissions.includes(permission));
  }

  static async updateActivity(userId) {
    return this.updateById(userId, { last_login: new Date().toISOString() });
  }

  static async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  static async countDocuments(filter = {}) {
    const db = getDb();
    let query = 'SELECT COUNT(*) as count FROM users';
    const params = [];
    
    if (Object.keys(filter).length > 0) {
      const conditions = Object.keys(filter).map(key => `${key} = ?`).join(' AND ');
      query += ` WHERE ${conditions}`;
      params.push(...Object.values(filter));
    }
    
    const result = await db.get(query, params);
    return result.count;
  }

  static async find(filter = {}, options = {}) {
    const db = getDb();
    let query = 'SELECT * FROM users';
    const params = [];
    
    if (Object.keys(filter).length > 0) {
      const conditions = Object.keys(filter).map(key => `${key} = ?`).join(' AND ');
      query += ` WHERE ${conditions}`;
      params.push(...Object.values(filter));
    }
    
    if (options.sort) {
      query += ` ORDER BY ${options.sort}`;
    }
    
    if (options.limit) {
      query += ` LIMIT ${options.limit}`;
    }
    
    if (options.skip) {
      query += ` OFFSET ${options.skip}`;
    }
    
    return await db.all(query, params);
  }

  static async populate(user, fields) {
    const db = getDb();
    const populatedUser = { ...user };
    
    if (fields.includes('roles')) {
      populatedUser.roles = await this.getRoles(user.id);
    }
    
    if (fields.includes('applications')) {
      populatedUser.applications = await this.getApplications(user.id);
    }
    
    if (fields.includes('notifications')) {
      populatedUser.notifications = await this.getNotifications(user.id);
    }
    
    return populatedUser;
  }

  static async getApplications(userId) {
    const db = getDb();
    return await db.all(
      'SELECT * FROM applications WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
  }

  static async getNotifications(userId, unreadOnly = false) {
    const db = getDb();
    let query = 'SELECT * FROM notifications WHERE user_id = ?';
    const params = [userId];
    
    if (unreadOnly) {
      query += ' AND is_read = 0';
    }
    
    query += ' ORDER BY created_at DESC';
    
    return await db.all(query, params);
  }

  static async addNotification(userId, notification) {
    const db = getDb();
    const { title, message, type = 'info' } = notification;
    
    const result = await db.run(
      `INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
       VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`,
      [userId, title, message, type]
    );
    
    return { id: result.lastID, ...notification };
  }

  static async markNotificationsRead(userId, notificationIds) {
    const db = getDb();
    const placeholders = notificationIds.map(() => '?').join(',');
    
    const result = await db.run(
      `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND id IN (${placeholders})`,
      [userId, ...notificationIds]
    );
    
    return { changes: result.changes };
  }

  static async deleteById(id) {
    const db = getDb();
    const result = await db.run('DELETE FROM users WHERE id = ?', [id]);
    return result.changes > 0;
  }

  static async banUser(id, reason) {
    return this.updateById(id, { 
      is_banned: 1, 
      ban_reason: reason 
    });
  }

  static async unbanUser(id) {
    return this.updateById(id, { 
      is_banned: 0, 
      ban_reason: null 
    });
  }
}

module.exports = User; 