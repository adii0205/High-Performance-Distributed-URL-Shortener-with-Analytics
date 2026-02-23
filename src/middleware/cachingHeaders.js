/**
 * Middleware for setting caching headers based on response type
 */

const setCachingHeaders = (req, res, next) => {
  // Set default cache control headers for API responses
  if (req.path.includes('/api/') || req.path.includes('/graphql')) {
    if (req.method === 'GET') {
      res.set('Cache-Control', 'public, max-age=300'); // 5 minutes for GET
    } else {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    }
  }

  next();
};

/**
 * Middleware for compressing responses
 */
const compression = require('compression');

const compressionMiddleware = compression({
  level: 6,
  threshold: 1024 // Only compress responses larger than 1KB
});

module.exports = {
  setCachingHeaders,
  compressionMiddleware
};
