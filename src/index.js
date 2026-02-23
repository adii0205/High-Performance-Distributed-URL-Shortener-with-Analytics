const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');
const { ApolloServer } = require('apollo-server-express');
require('dotenv').config();

const { initDatabase } = require('./db/pool');
const { initRedis } = require('./cache/redisClient');

// v2.0: New imports
const swaggerDocs = require('./config/swagger');
const { typeDefs, resolvers } = require('./config/graphql');
const { setCachingHeaders, compressionMiddleware } = require('./middleware/cachingHeaders');
const { optionalAuth, verifyToken } = require('./middleware/auth');

// Routes
const urlRoutes = require('./routes/urls');
const analyticsRoutes = require('./routes/analytics');
const healthRoutes = require('./routes/health');
const debugRoutes = require('./routes/debug');
const authRoutes = require('./routes/auth');  // v2.0: Authentication routes

// Middleware
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Compression middleware (v2.0)
app.use(compressionMiddleware);

// Parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// v2.0: Caching headers middleware
app.use(setCachingHeaders);

// Serve static files (Frontend)
app.use(express.static('public'));

// Request logging
app.use(requestLogger);

// v2.0: Authentication routes (no auth required)
app.use('/api/auth', authRoutes);

// v2.0: Swagger/OpenAPI documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'URL Shortener API Docs'
}));

// Health check (no auth required)
app.use('/health', healthRoutes);

// API Routes
app.use('/api/urls', optionalAuth, urlRoutes);  // Optional auth for user-specific features
app.use('/api/analytics', analyticsRoutes);
app.use('/api/debug', verifyToken, debugRoutes);  // v2.0: Require auth for debug endpoints
app.use('/', require('./routes/redirect'));

// v2.0: GraphQL endpoint
let apolloServer = null;

async function initApollo() {
  apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => {
      // Extract user from JWT token if present
      const user = req.user || null;
      return { user };
    },
    introspection: process.env.NODE_ENV !== 'production'
  });

  await apolloServer.start();
  apolloServer.applyMiddleware({ app, path: '/graphql' });
}

// SPA fallback - serve index.html for non-API routes (client-side routing)
app.use((req, res) => {
  // For any other request, serve index.html if it's not an API call
  if (!req.path.startsWith('/api') && !req.path.startsWith('/graphql')) {
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
    console.log('🚀 Starting URL Shortener v2.0...');

    console.log('📊 Initializing database...');
    const db = await initDatabase();
    console.log('✓ Database connected');

    console.log('💾 Initializing Redis...');
    const redis = await initRedis();
    console.log('✓ Redis connected');

    // v2.0: Initialize GraphQL
    console.log('⚙️  Initializing GraphQL...');
    await initApollo();
    console.log('✓ GraphQL ready at /graphql');

    // Make services available to routes
    app.locals.db = db;
    app.locals.redis = redis;

    const PORT = process.env.PORT || 3000;
    const server = app.listen(PORT, () => {
      console.log(`\n✨ Server running on port ${PORT}`);
      console.log(`📖 API Documentation: http://localhost:${PORT}/api/docs`);
      console.log(`🚀 GraphQL Playground: http://localhost:${PORT}/graphql`);
      console.log(`📱 Web Interface: http://localhost:${PORT}`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV}`);
    });

    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

startServer();

module.exports = app;

