const express = require('express');
const { body, validationResult } = require('express-validator');
const Application = require('../models/Application');
const User = require('../models/User');
const { auth, requirePermission, requireAnyPermission } = require('../middleware/auth');

const router = express.Router();

// Submit new application
router.post('/submit', auth, [
  body('type')
    .isIn(['new_member', 'department_transfer', 'role_upgrade', 'custom'])
    .withMessage('Invalid application type'),
  body('title')
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  body('questions')
    .isArray()
    .withMessage('Questions must be an array'),
  body('questions.*.question')
    .isString()
    .notEmpty()
    .withMessage('Question text is required'),
  body('questions.*.answer')
    .isString()
    .notEmpty()
    .withMessage('Answer is required'),
  body('customFields.name')
    .optional()
    .isString()
    .withMessage('Name must be a string'),
  body('customFields.age')
    .optional()
    .isInt({ min: 13 })
    .withMessage('Age must be at least 13'),
  body('customFields.discordId')
    .optional()
    .isString()
    .withMessage('Discord ID must be a string')
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

    const { type, title, questions, customFields } = req.body;

    // Check if user is banned
    if (req.userData.isBanned) {
      return res.status(403).json({
        success: false,
        message: 'Banned users cannot submit applications'
      });
    }

    // Check if user already has a pending application of this type
    const existingApplication = await Application.findOne({
      applicant: req.user.userId,
      type,
      status: { $in: ['pending', 'under_review'] }
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending application of this type'
      });
    }

    // Create application
    const application = new Application({
      applicant: req.user.userId,
      type,
      title,
      questions,
      customFields
    });

    await application.save();

    // Add application to user's applications
    await User.findByIdAndUpdate(req.user.userId, {
      $push: { applications: application._id }
    });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      application: {
        id: application._id,
        type: application.type,
        title: application.title,
        status: application.status,
        submittedAt: application.submittedAt
      }
    });

  } catch (error) {
    console.error('Application submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during application submission'
    });
  }
});

// Get user's applications
router.get('/my-applications', auth, async (req, res) => {
  try {
    const applications = await Application.find({ applicant: req.user.userId })
      .sort({ submittedAt: -1 })
      .populate('assignedTo', 'username profile.displayName');

    res.json({
      success: true,
      applications: applications.map(app => ({
        id: app._id,
        type: app.type,
        title: app.title,
        status: app.status,
        submittedAt: app.submittedAt,
        reviewedAt: app.reviewedAt,
        assignedTo: app.assignedTo,
        priority: app.priority,
        isOverdue: app.isOverdue
      }))
    });

  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get specific application (user can only see their own)
router.get('/:id', auth, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('applicant', 'username profile.displayName')
      .populate('comments.author', 'username profile.displayName')
      .populate('assignedTo', 'username profile.displayName');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Check if user can view this application
    const canView = req.userData.hasPermission('applications.view') || 
                   application.applicant._id.toString() === req.user.userId;

    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this application'
      });
    }

    // Filter comments based on user permissions
    let filteredComments = application.comments;
    if (!req.userData.hasPermission('applications.view')) {
      // Regular users can only see non-internal comments
      filteredComments = application.comments.filter(comment => !comment.isInternal);
    }

    res.json({
      success: true,
      application: {
        id: application._id,
        type: application.type,
        title: application.title,
        status: application.status,
        questions: application.questions,
        customFields: application.customFields,
        comments: filteredComments,
        assignedTo: application.assignedTo,
        priority: application.priority,
        submittedAt: application.submittedAt,
        reviewedAt: application.reviewedAt,
        approvedAt: application.approvedAt,
        rejectedAt: application.rejectedAt,
        rejectionReason: application.rejectionReason,
        isLocked: application.isLocked
      }
    });

  } catch (error) {
    console.error('Get application error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Add comment to application
router.post('/:id/comments', auth, [
  body('content')
    .isString()
    .notEmpty()
    .withMessage('Comment content is required'),
  body('isInternal')
    .optional()
    .isBoolean()
    .withMessage('isInternal must be a boolean')
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

    const { content, isInternal = false } = req.body;

    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Check permissions
    const canComment = req.userData.hasPermission('applications.comment') ||
                      (application.applicant.toString() === req.user.userId && !isInternal);

    if (!canComment) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to comment on this application'
      });
    }

    // Check if application is locked
    if (application.isLocked) {
      return res.status(400).json({
        success: false,
        message: 'This application is locked and cannot be commented on'
      });
    }

    // Add comment
    await application.addComment(req.user.userId, content, isInternal);

    // Send notification to applicant if comment is from admin
    if (isInternal && application.applicant.toString() !== req.user.userId) {
      const applicant = await User.findById(application.applicant);
      if (applicant) {
        applicant.notifications.push({
          type: 'comment',
          message: `New comment on your application: ${application.title}`,
          link: `/applications/${application._id}`
        });
        await applicant.save();
      }
    }

    res.json({
      success: true,
      message: 'Comment added successfully'
    });

  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Admin: Get all applications
router.get('/admin/all', requirePermission('applications.view'), async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;

    const applications = await Application.find(filter)
      .populate('applicant', 'username profile.displayName')
      .populate('assignedTo', 'username profile.displayName')
      .sort({ submittedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Application.countDocuments(filter);

    res.json({
      success: true,
      applications: applications.map(app => ({
        id: app._id,
        type: app.type,
        title: app.title,
        status: app.status,
        applicant: app.applicant,
        assignedTo: app.assignedTo,
        priority: app.priority,
        submittedAt: app.submittedAt,
        isOverdue: app.isOverdue
      })),
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Get all applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Admin: Update application status
router.patch('/:id/status', requirePermission('applications.approve'), [
  body('status')
    .isIn(['pending', 'under_review', 'approved', 'rejected', 'on_hold'])
    .withMessage('Invalid status'),
  body('reason')
    .optional()
    .isString()
    .withMessage('Reason must be a string')
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

    const { status, reason } = req.body;

    const application = await Application.findById(req.params.id)
      .populate('applicant');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Update status
    await application.updateStatus(status, req.user.userId, reason);

    // Send notification to applicant
    if (application.applicant) {
      const applicant = await User.findById(application.applicant);
      if (applicant) {
        applicant.notifications.push({
          type: 'application_update',
          message: `Your application "${application.title}" has been ${status}`,
          link: `/applications/${application._id}`
        });
        await applicant.save();
      }
    }

    res.json({
      success: true,
      message: 'Application status updated successfully'
    });

  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Admin: Assign application to reviewer
router.patch('/:id/assign', requirePermission('applications.view'), [
  body('assignedTo')
    .isMongoId()
    .withMessage('Invalid user ID')
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

    const { assignedTo } = req.body;

    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    await application.assignReviewer(assignedTo);

    res.json({
      success: true,
      message: 'Application assigned successfully'
    });

  } catch (error) {
    console.error('Assign application error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router; 