const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || 
                  req.cookies?.token ||
                  req.body?.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token is invalid'
      });
    }

    if (user.is_banned) {
      return res.status(403).json({
        success: false,
        message: 'Account is banned',
        ban_reason: user.ban_reason
      });
    }

    req.user = decoded;
    req.userData = user;
    next();

  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      message: 'Token is invalid'
    });
  }
};

// Optional auth middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || 
                  req.cookies?.token ||
                  req.body?.token;

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      const user = await User.findById(decoded.userId);

      if (user && !user.is_banned) {
        req.user = decoded;
        req.userData = user;
      }
    }

    next();

  } catch (error) {
    // Continue without authentication
    next();
  }
};

// Permission middleware
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.userData) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const hasPermission = await User.hasPermission(req.userData.id, permission);
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      next();

    } catch (error) {
      console.error('Permission middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  };
};

// Require any of the given permissions
const requireAnyPermission = (permissions) => {
  return async (req, res, next) => {
    try {
      if (!req.userData) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const hasAnyPermission = await User.hasAnyPermission(req.userData.id, permissions);
      if (!hasAnyPermission) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      next();

    } catch (error) {
      console.error('Permission middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  };
};

module.exports = {
  auth,
  optionalAuth,
  requirePermission,
  requireAnyPermission
}; 