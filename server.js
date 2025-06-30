const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

// Import database configuration
const { initDatabase } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const applicationRoutes = require('./routes/applications');
const adminRoutes = require('./routes/admin');
const discordRoutes = require('./routes/discord');
const profileRoutes = require('./routes/profile');

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Static files
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize database
async function startServer() {
  try {
    // Initialize database tables
    await initDatabase();
    console.log('✅ Database initialized successfully');

    // Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/applications', applicationRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/discord', discordRoutes);
    app.use('/api/profile', profileRoutes);

    // Serve frontend pages
    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'index.html'));
    });

    app.get('/lspd', (req, res) => {
      res.sendFile(path.join(__dirname, 'lspd.html'));
    });

    app.get('/bcso', (req, res) => {
      res.sendFile(path.join(__dirname, 'bcso.html'));
    });

    app.get('/lsfd', (req, res) => {
      res.sendFile(path.join(__dirname, 'lsfd.html'));
    });

    app.get('/sahp', (req, res) => {
      res.sendFile(path.join(__dirname, 'sahp.html'));
    });

    app.get('/sacd', (req, res) => {
      res.sendFile(path.join(__dirname, 'sacd.html'));
    });

    app.get('/civilian', (req, res) => {
      res.sendFile(path.join(__dirname, 'civilian.html'));
    });

    // API routes fallback
    app.get('/api/*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'API endpoint not found'
      });
    });

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).json({ 
        success: false, 
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    });

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📱 Open http://localhost:${PORT} in your browser`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

module.exports = app; 