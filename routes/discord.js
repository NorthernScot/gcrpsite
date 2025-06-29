const express = require('express');
const { auth, requirePermission } = require('../middleware/auth');
const { syncDiscordRoles, banFromDiscord } = require('../services/discord');

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);

// Sync user roles with Discord
router.post('/sync-roles/:userId', requirePermission('discord.sync'), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate('roles');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.discordId) {
      return res.status(400).json({
        success: false,
        message: 'User does not have a Discord ID linked'
      });
    }

    // Sync roles with Discord
    await syncDiscordRoles(user.discordId, user.roles);

    res.json({
      success: true,
      message: 'Roles synced with Discord successfully'
    });

  } catch (error) {
    console.error('Sync roles error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync roles with Discord'
    });
  }
});

// Sync all users' roles with Discord
router.post('/sync-all-roles', requirePermission('discord.sync'), async (req, res) => {
  try {
    const users = await User.find({ discordId: { $exists: true, $ne: null } }).populate('roles');
    
    let successCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        await syncDiscordRoles(user.discordId, user.roles);
        successCount++;
      } catch (error) {
        console.error(`Failed to sync roles for user ${user.username}:`, error);
        errorCount++;
      }
    }

    res.json({
      success: true,
      message: `Role sync completed. ${successCount} successful, ${errorCount} failed.`
    });

  } catch (error) {
    console.error('Sync all roles error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync all roles with Discord'
    });
  }
});

// Ban user from Discord
router.post('/ban/:userId', requirePermission('users.ban'), async (req, res) => {
  try {
    const { reason } = req.body;

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.discordId) {
      return res.status(400).json({
        success: false,
        message: 'User does not have a Discord ID linked'
      });
    }

    // Ban from Discord
    await banFromDiscord(user.discordId, reason);

    res.json({
      success: true,
      message: 'User banned from Discord successfully'
    });

  } catch (error) {
    console.error('Discord ban error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to ban user from Discord'
    });
  }
});

// Get Discord server info
router.get('/server-info', requirePermission('discord.manage'), async (req, res) => {
  try {
    // This would typically fetch information about the Discord server
    // For now, we'll return a placeholder response
    res.json({
      success: true,
      serverInfo: {
        name: 'GCRP Community',
        memberCount: 0, // Would be fetched from Discord API
        roleCount: 0,   // Would be fetched from Discord API
        connected: true
      }
    });

  } catch (error) {
    console.error('Get server info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get Discord server information'
    });
  }
});

module.exports = router; 