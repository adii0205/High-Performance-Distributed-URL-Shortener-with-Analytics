const { getRedis } = require('../cache/redisClient');

/**
 * Sliding window rate limiter using Redis
 * More accurate than fixed window, allows for burst patterns
 */
function slidingWindowRateLimit(limit, windowMs) {
  return async (req, res, next) => {
    try {
      const redis = getRedis();
      const key = `ratelimit:${req.ip}:${req.path}`;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Remove old entries outside the window
      await redis.zRemRangeByScore(key, 0, windowStart);

      // Count requests in current window
      const count = await redis.zCard(key);

      if (count >= limit) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil(windowMs / 1000),
        });
      }

      // Add current request
      const entryId = `${now}-${Math.random()}`;
      await redis.zAdd(key, { score: now, member: entryId });

      // Set expiration on the key
      await redis.expire(key, Math.ceil(windowMs / 1000));

      // Add rate limit info to response headers
      res.set('X-RateLimit-Limit', limit.toString());
      res.set('X-RateLimit-Remaining', (limit - count - 1).toString());
      res.set('X-RateLimit-Reset', new Date(now + windowMs).toISOString());

      next();
    } catch (error) {
      console.error('Rate limit error:', error);
      // On error, allow request to go through (fail open)
      next();
    }
  };
}

/**
 * Simple IP-based rate limiter
 */
function simpleRateLimit(maxRequests = 100, windowMs = 3600000) {
  return slidingWindowRateLimit(maxRequests, windowMs);
}

module.exports = {
  slidingWindowRateLimit,
  simpleRateLimit,
};
