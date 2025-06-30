const express = require('express');
const multer = require('multer');
const path = require('path');
const { auth } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Multer setup for avatar uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/avatars'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `user_${req.userData.id}_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

// GET /api/profile - Get current user profile
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userData.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/profile/username - Update username
router.put('/username', auth, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ success: false, message: 'Username required' });
    await User.updateById(req.userData.id, { username });
    res.json({ success: true, message: 'Username updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/profile/avatar - Update avatar
router.put('/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await User.setAvatar(req.userData.id, avatarUrl);
    res.json({ success: true, message: 'Avatar updated', avatarUrl });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router; 