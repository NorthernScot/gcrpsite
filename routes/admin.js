const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Role = require('../models/Role');
const Application = require('../models/Application');
const { auth, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Apply admin middleware to all routes
router.use(auth);
router.use(requirePermission('admin.dashboard'));

// Get admin dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalUsers,
      pendingApplications,
      overdueApplications,
      bannedUsers,
      recentUsers
    ] = await Promise.all([
      User.countDocuments(),
      Application.countDocuments({ status: 'pending' }),
      Application.getOverdue().then(apps => apps.length),
      User.countDocuments({ isBanned: true }),
      User.find().sort({ createdAt: -1 }).limit(5).select('username profile.displayName createdAt')
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        pendingApplications,
        overdueApplications,
        bannedUsers
      },
      recentUsers
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get all users
router.get('/users', requirePermission('users.view'), async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role, status } = req.query;
    
    const filter = {};
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'profile.displayName': { $regex: search, $options: 'i' } }
      ];
    }
    if (role) filter.roles = role;
    if (status === 'banned') filter.isBanned = true;
    if (status === 'active') filter.isBanned = false;

    const users = await User.find(filter)
      .populate('roles')
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      users: users.map(user => ({
        id: user._id,
        username: user.username,
        email: user.email,
        profile: user.profile,
        roles: user.roles,
        isBanned: user.isBanned,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        lastActivity: user.lastActivity
      })),
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Ban user
router.post('/users/:id/ban', requirePermission('users.ban'), [
  body('reason')
    .isString()
    .notEmpty()
    .withMessage('Ban reason is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { reason } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isBanned) {
      return res.status(400).json({
        success: false,
        message: 'User is already banned'
      });
    }

    // Ban user
    user.isBanned = true;
    user.banReason = reason;
    user.banDate = new Date();
    user.roles = []; // Remove all roles
    user.permissions = []; // Remove all permissions

    await user.save();

    res.json({
      success: true,
      message: 'User banned successfully'
    });

  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get all roles
router.get('/roles', requirePermission('roles.view'), async (req, res) => {
  try {
    const roles = await Role.find().sort({ priority: -1, name: 1 });

    res.json({
      success: true,
      roles: roles.map(role => ({
        id: role._id,
        name: role.name,
        displayName: role.displayName,
        description: role.description,
        color: role.color,
        discordRoleId: role.discordRoleId,
        permissions: role.permissions,
        isDefault: role.isDefault,
        isActive: role.isActive,
        priority: role.priority,
        createdAt: role.createdAt
      }))
    });

  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Create new role
router.post('/roles', requirePermission('roles.create'), [
  body('name')
    .isString()
    .isLength({ min: 1, max: 50 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Role name must be alphanumeric with underscores only'),
  body('displayName')
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Display name is required'),
  body('permissions')
    .isArray()
    .withMessage('Permissions must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, displayName, description, color, discordRoleId, permissions, isDefault } = req.body;

    // Check if role name already exists
    const existingRole = await Role.findOne({ name });
    if (existingRole) {
      return res.status(400).json({
        success: false,
        message: 'Role name already exists'
      });
    }

    // Create role
    const role = new Role({
      name,
      displayName,
      description,
      color,
      discordRoleId,
      permissions,
      isDefault,
      createdBy: req.user.userId
    });

    await role.save();

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      role: {
        id: role._id,
        name: role.name,
        displayName: role.displayName,
        description: role.description,
        color: role.color,
        discordRoleId: role.discordRoleId,
        permissions: role.permissions,
        isDefault: role.isDefault,
        isActive: role.isActive
      }
    });

  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router; 