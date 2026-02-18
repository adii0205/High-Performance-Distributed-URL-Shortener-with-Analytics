/**
 * Middleware for setting caching headers based on response type
 */

const setCachingHeaders = (req, res, next) => {
  const originalEnd = res.end;
  const originalJson = res.json;

  // For API responses, set appropriate cache-control headers
  res.json = function(data) {
    // Cache API responses for 5 minutes for GET requests
    if (req.method === 'GET') {
      res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
      res.set('ETag', `"${Buffer.from(JSON.stringify(data)).toString('base64')}")`);
    } else {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    }

    return originalJson.call(this, data);
  };

  // For static files, set longer cache
  res.on('finish', function() {
    if (res.statusCode < 400) {
      const contentType = res.get('content-type') || '';

      // Images - cache for 1 year
      if (contentType.includes('image')) {
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
      }
      // CSS/JS - cache for 1 year
      else if (contentType.includes('javascript') || contentType.includes('css')) {
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
      }
      // HTML - don't cache or cache for short period
      else if (contentType.includes('html')) {
        res.set('Cache-Control', 'public, max-age=3600'); // 1 hour
      }
    }
  });

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
