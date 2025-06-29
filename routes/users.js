const express = require('express');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Get user profile
router.get('/profile/:username', optionalAuth, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .populate('roles')
      .select('-password -email -discordId');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if current user is following this user
    let isFollowing = false;
    if (req.userData) {
      isFollowing = req.userData.following.includes(user._id);
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        profile: user.profile,
        roles: user.roles,
        followers: user.followers.length,
        following: user.following.length,
        isFollowing,
        joinDate: user.profile.joinDate,
        lastActivity: user.lastActivity
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Update user profile
router.put('/profile', auth, [
  body('displayName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Display name must be between 1 and 50 characters'),
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio must be less than 500 characters'),
  body('location')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Location must be less than 100 characters'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format')
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

    const { displayName, bio, location, dateOfBirth } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update profile fields
    if (displayName !== undefined) user.profile.displayName = displayName;
    if (bio !== undefined) user.profile.bio = bio;
    if (location !== undefined) user.profile.location = location;
    if (dateOfBirth !== undefined) {
      user.profile.dateOfBirth = new Date(dateOfBirth);
      // Calculate age
      const today = new Date();
      const birthDate = new Date(dateOfBirth);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      user.profile.age = age;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: user.profile
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Upload avatar
router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update avatar path
    user.profile.avatar = `/uploads/${req.file.filename}`;
    await user.save();

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      avatar: user.profile.avatar
    });

  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Upload banner
router.post('/banner', auth, upload.single('banner'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update banner path
    user.profile.banner = `/uploads/${req.file.filename}`;
    await user.save();

    res.json({
      success: true,
      message: 'Banner uploaded successfully',
      banner: user.profile.banner
    });

  } catch (error) {
    console.error('Upload banner error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Follow user
router.post('/follow/:userId', auth, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (targetUser._id.toString() === req.user.userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot follow yourself'
      });
    }

    const currentUser = await User.findById(req.user.userId);
    
    // Check if already following
    if (currentUser.following.includes(targetUser._id)) {
      return res.status(400).json({
        success: false,
        message: 'Already following this user'
      });
    }

    // Add to following
    currentUser.following.push(targetUser._id);
    targetUser.followers.push(currentUser._id);

    await Promise.all([currentUser.save(), targetUser.save()]);

    res.json({
      success: true,
      message: 'User followed successfully'
    });

  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Unfollow user
router.delete('/follow/:userId', auth, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const currentUser = await User.findById(req.user.userId);
    
    // Check if following
    if (!currentUser.following.includes(targetUser._id)) {
      return res.status(400).json({
        success: false,
        message: 'Not following this user'
      });
    }

    // Remove from following
    currentUser.following = currentUser.following.filter(id => id.toString() !== targetUser._id.toString());
    targetUser.followers = targetUser.followers.filter(id => id.toString() !== currentUser._id.toString());

    await Promise.all([currentUser.save(), targetUser.save()]);

    res.json({
      success: true,
      message: 'User unfollowed successfully'
    });

  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get user's followers
router.get('/:userId/followers', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const user = await User.findById(req.params.userId)
      .populate({
        path: 'followers',
        select: 'username profile.displayName profile.avatar',
        options: {
          limit: limit * 1,
          skip: (page - 1) * limit
        }
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const total = user.followers.length;

    res.json({
      success: true,
      followers: user.followers,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get user's following
router.get('/:userId/following', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const user = await User.findById(req.params.userId)
      .populate({
        path: 'following',
        select: 'username profile.displayName profile.avatar',
        options: {
          limit: limit * 1,
          skip: (page - 1) * limit
        }
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const total = user.following.length;

    res.json({
      success: true,
      following: user.following,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Mark notifications as read
router.patch('/notifications/read', auth, async (req, res) => {
  try {
    const { notificationIds } = req.body;

    if (!Array.isArray(notificationIds)) {
      return res.status(400).json({
        success: false,
        message: 'Notification IDs must be an array'
      });
    }

    await User.findByIdAndUpdate(req.user.userId, {
      $set: {
        'notifications.$[elem].read': true
      }
    }, {
      arrayFilters: [{ 'elem._id': { $in: notificationIds } }]
    });

    res.json({
      success: true,
      message: 'Notifications marked as read'
    });

  } catch (error) {
    console.error('Mark notifications read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router; 