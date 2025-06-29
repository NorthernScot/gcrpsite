const { getDb } = require('../config/database');

class Application {
  static async create(applicationData) {
    const db = getDb();
    const { user_id, department, position, content } = applicationData;
    
    const result = await db.run(
      `INSERT INTO applications (user_id, department, position, content, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [user_id, department, position, content]
    );
    
    return { id: result.lastID, ...applicationData, status: 'pending' };
  }

  static async findById(id) {
    const db = getDb();
    return await db.get('SELECT * FROM applications WHERE id = ?', [id]);
  }

  static async findByUserId(userId) {
    const db = getDb();
    return await db.all(
      'SELECT * FROM applications WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
  }

  static async findByStatus(status) {
    const db = getDb();
    return await db.all(
      'SELECT * FROM applications WHERE status = ? ORDER BY created_at ASC',
      [status]
    );
  }

  static async getPending() {
    const db = getDb();
    return await db.all(
      'SELECT * FROM applications WHERE status = ? ORDER BY created_at ASC',
      ['pending']
    );
  }

  static async getOverdue() {
    const db = getDb();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    return await db.all(
      'SELECT * FROM applications WHERE status = ? AND created_at < ? ORDER BY created_at ASC',
      ['pending', sevenDaysAgo]
    );
  }

  static async updateById(id, updateData) {
    const db = getDb();
    const { status, reviewed_by, review_notes } = updateData;
    
    let query = 'UPDATE applications SET updated_at = CURRENT_TIMESTAMP';
    const params = [];
    
    if (status) {
      query += ', status = ?';
      params.push(status);
    }
    
    if (reviewed_by) {
      query += ', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP';
      params.push(reviewed_by);
    }
    
    if (review_notes) {
      query += ', review_notes = ?';
      params.push(review_notes);
    }
    
    query += ' WHERE id = ?';
    params.push(id);
    
    const result = await db.run(query, params);
    return result.changes > 0;
  }

  static async updateStatus(id, status, reviewedBy = null, reviewNotes = null) {
    const db = getDb();
    const result = await db.run(
      `UPDATE applications SET 
       status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, 
       review_notes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status, reviewedBy, reviewNotes, id]
    );
    
    return result.changes > 0;
  }

  static async deleteById(id) {
    const db = getDb();
    const result = await db.run('DELETE FROM applications WHERE id = ?', [id]);
    return result.changes > 0;
  }

  static async findAll(options = {}) {
    const db = getDb();
    let query = 'SELECT * FROM applications';
    const params = [];
    
    if (options.status) {
      query += ' WHERE status = ?';
      params.push(options.status);
    }
    
    if (options.user_id) {
      if (params.length > 0) {
        query += ' AND user_id = ?';
      } else {
        query += ' WHERE user_id = ?';
      }
      params.push(options.user_id);
    }
    
    query += ' ORDER BY created_at DESC';
    
    if (options.limit) {
      query += ` LIMIT ${options.limit}`;
    }
    
    if (options.offset) {
      query += ` OFFSET ${options.offset}`;
    }
    
    return await db.all(query, params);
  }

  static async count(filter = {}) {
    const db = getDb();
    let query = 'SELECT COUNT(*) as count FROM applications';
    const params = [];
    
    if (Object.keys(filter).length > 0) {
      const conditions = Object.keys(filter).map(key => `${key} = ?`).join(' AND ');
      query += ` WHERE ${conditions}`;
      params.push(...Object.values(filter));
    }
    
    const result = await db.get(query, params);
    return result.count;
  }

  static async getStats() {
    const db = getDb();
    const stats = await db.get(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM applications
    `);
    
    return {
      total: stats.total || 0,
      pending: stats.pending || 0,
      approved: stats.approved || 0,
      rejected: stats.rejected || 0
    };
  }

  // Helper method to get application with user details
  static async findByIdWithUser(id) {
    const db = getDb();
    return await db.get(`
      SELECT a.*, u.username, u.email, u.profile_picture
      FROM applications a
      JOIN users u ON a.user_id = u.id
      WHERE a.id = ?
    `, [id]);
  }

  // Helper method to get all applications with user details
  static async findAllWithUsers(options = {}) {
    const db = getDb();
    let query = `
      SELECT a.*, u.username, u.email, u.profile_picture
      FROM applications a
      JOIN users u ON a.user_id = u.id
    `;
    const params = [];
    
    if (options.status) {
      query += ' WHERE a.status = ?';
      params.push(options.status);
    }
    
    query += ' ORDER BY a.created_at DESC';
    
    if (options.limit) {
      query += ` LIMIT ${options.limit}`;
    }
    
    if (options.offset) {
      query += ` OFFSET ${options.offset}`;
    }
    
    return await db.all(query, params);
  }
}

module.exports = Application; 