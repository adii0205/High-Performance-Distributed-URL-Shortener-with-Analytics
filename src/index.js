const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const { initDatabase } = require('./db/pool');
const { initRedis } = require('./cache/redisClient');

// Routes
const urlRoutes = require('./routes/urls');
const analyticsRoutes = require('./routes/analytics');
const healthRoutes = require('./routes/health');
const debugRoutes = require('./routes/debug');

// Middleware
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (Frontend)
app.use(express.static('public'));

// Request logging
app.use(requestLogger);

// Routes
app.use('/health', healthRoutes);
app.use('/api/urls', urlRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/debug', debugRoutes);  // Phase 5 & 6: Performance monitoring
app.use('/', require('./routes/redirect'));

// SPA fallback - serve index.html for non-API routes (client-side routing)
app.use((req, res) => {
  // For any other request, serve index.html if it's not an API call
  if (!req.path.startsWith('/api')) {
    res.sendFile('public/index.html', { root: '.' });
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// Error handler (must be last)
app.use(errorHandler);

// Initialize services and start server
async function startServer() {
  try {
    console.log('Initializing database...');
    const db = await initDatabase();
    console.log('✓ Database connected');

    console.log('Initializing Redis...');
    const redis = await initRedis();
    console.log('✓ Redis connected');

    // Make services available to routes
    app.locals.db = db;
    app.locals.redis = redis;

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  process.exit(0);
});

startServer();

module.exports = app;
