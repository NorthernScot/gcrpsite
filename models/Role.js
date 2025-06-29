const { getDb } = require('../config/database');

class Role {
  static async create(roleData) {
    const db = getDb();
    const { name, displayName, description, color, discordRoleId, permissions, isDefault, isActive, priority, createdBy } = roleData;
    
    const result = await db.run(
      `INSERT INTO roles (name, displayName, description, color, discordRoleId, permissions, isDefault, isActive, priority, createdBy, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [name, displayName, description, color, discordRoleId, JSON.stringify(permissions), isDefault ? 1 : 0, isActive ? 1 : 0, priority, createdBy]
    );
    
    return { id: result.lastID, ...roleData };
  }

  static async findById(id) {
    const db = getDb();
    const role = await db.get('SELECT * FROM roles WHERE id = ?', [id]);
    if (role) {
      role.permissions = JSON.parse(role.permissions || '[]');
      role.isDefault = Boolean(role.isDefault);
      role.isActive = Boolean(role.isActive);
    }
    return role;
  }

  static async findByName(name) {
    const db = getDb();
    const role = await db.get('SELECT * FROM roles WHERE name = ? AND isActive = 1', [name]);
    if (role) {
      role.permissions = JSON.parse(role.permissions || '[]');
      role.isDefault = Boolean(role.isDefault);
      role.isActive = Boolean(role.isActive);
    }
    return role;
  }

  static async getDefault() {
    const db = getDb();
    const role = await db.get('SELECT * FROM roles WHERE isDefault = 1 AND isActive = 1');
    if (role) {
      role.permissions = JSON.parse(role.permissions || '[]');
      role.isDefault = Boolean(role.isDefault);
      role.isActive = Boolean(role.isActive);
    }
    return role;
  }

  static async getActive() {
    const db = getDb();
    const roles = await db.all('SELECT * FROM roles WHERE isActive = 1 ORDER BY priority DESC, name ASC');
    return roles.map(role => ({
      ...role,
      permissions: JSON.parse(role.permissions || '[]'),
      isDefault: Boolean(role.isDefault),
      isActive: Boolean(role.isActive)
    }));
  }

  static async findAll() {
    const db = getDb();
    const roles = await db.all('SELECT * FROM roles ORDER BY priority DESC, name ASC');
    return roles.map(role => ({
      ...role,
      permissions: JSON.parse(role.permissions || '[]'),
      isDefault: Boolean(role.isDefault),
      isActive: Boolean(role.isActive)
    }));
  }

  static async updateById(id, updateData) {
    const db = getDb();
    const { name, displayName, description, color, discordRoleId, permissions, isDefault, isActive, priority } = updateData;
    
    const result = await db.run(
      `UPDATE roles SET 
       name = ?, displayName = ?, description = ?, color = ?, discordRoleId = ?, 
       permissions = ?, isDefault = ?, isActive = ?, priority = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name, displayName, description, color, discordRoleId, JSON.stringify(permissions), isDefault ? 1 : 0, isActive ? 1 : 0, priority, id]
    );
    
    return result.changes > 0;
  }

  static async deleteById(id) {
    const db = getDb();
    const result = await db.run('DELETE FROM roles WHERE id = ?', [id]);
    return result.changes > 0;
  }

  static async updateMany(filter, update) {
    const db = getDb();
    let whereClause = '1=1';
    const params = [];
    
    if (filter._id && filter._id.$ne) {
      whereClause += ' AND id != ?';
      params.push(filter._id.$ne);
    }
    
    const result = await db.run(
      `UPDATE roles SET isDefault = ?, updated_at = CURRENT_TIMESTAMP WHERE ${whereClause}`,
      [update.isDefault ? 1 : 0, ...params]
    );
    
    return result.changes;
  }
}

module.exports = Role; 