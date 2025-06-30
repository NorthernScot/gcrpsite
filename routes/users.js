const express = require('express');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth, optionalAuth } = require('../middleware/auth');
const path = require('path');

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

// Get user profile by username
router.get('/profile/:username', optionalAuth, async (req, res) => {
  try {
    const user = await User.findByUsername(req.params.username);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const roles = await User.getRoles(user.id);
    const followers = await User.getFollowers(user.id);
    const badges = await User.getBadges(user.id);
    const activity = await User.getActivity(user.id, 10);
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        bio: user.bio,
        roles,
        followers: followers.map(f => f.follower_id),
        badges,
        joinDate: user.created_at,
        lastLogin: user.last_login,
        activity
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Edit own profile (bio, display name, etc.)
router.put('/profile', auth, async (req, res) => {
  try {
    const { bio } = req.body;
    if (bio !== undefined) {
      await User.setBio(req.user.userId, bio);
    }
    res.json({ success: true, message: 'Profile updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Avatar upload
router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const avatarUrl = '/uploads/' + req.file.filename;
    await User.setAvatar(req.user.userId, avatarUrl);
    res.json({ success: true, message: 'Avatar uploaded', avatar: avatarUrl });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Follow a user
router.post('/:id/follow', auth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (userId === req.user.userId) {
      return res.status(400).json({ success: false, message: 'Cannot follow yourself' });
    }
    await User.addFollower(userId, req.user.userId);
    res.json({ success: true, message: 'Followed user' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Unfollow a user
router.post('/:id/unfollow', auth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    await User.removeFollower(userId, req.user.userId);
    res.json({ success: true, message: 'Unfollowed user' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get followers
router.get('/:id/followers', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const followers = await User.getFollowers(userId);
    res.json({ success: true, followers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get following
router.get('/:id/following', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const following = await User.getFollowing(userId);
    res.json({ success: true, following });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get badges
router.get('/:id/badges', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const badges = await User.getBadges(userId);
    res.json({ success: true, badges });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Add badge (admin only, for now just allow any logged-in user for demo)
router.post('/:id/badges', auth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { badge } = req.body;
    let badges = await User.getBadges(userId);
    badges.push(badge);
    await User.setBadges(userId, badges);
    res.json({ success: true, badges });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get recent activity
router.get('/:id/activity', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const activity = await User.getActivity(userId, 10);
    res.json({ success: true, activity });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
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