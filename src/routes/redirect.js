const express = require('express');
const router = express.Router();
const { getURLByShortCode } = require('../services/urlService');
const { getRedis } = require('../cache/redisClient');
const Queue = require('bull');

// Create analytics queue
const analyticsQueue = new Queue('analytics', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
  },
});

/**
 * Redirect to original URL
 * GET /:shortCode
 * 
 * This is the critical path - must be ultra-fast (<5ms)
 */
router.get('/:shortCode', async (req, res, next) => {
  try {
    const { shortCode } = req.params;

    // Get URL from cache (fast)
    const url = await getURLByShortCode(shortCode);

    if (!url) {
      return res.status(404).json({
        error: 'Short URL not found or expired',
      });
    }

    // Queue analytics in background (non-blocking)
    try {
      analyticsQueue.add(
        {
          shortCodeId: url.id,
          shortCode,
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent'),
          referer: req.get('referer'),
          timestamp: Date.now(),
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
        }
      );
    } catch (queueError) {
      // Log but don't block the redirect
      console.error('Analytics queue error:', queueError);
    }

    // Don't wait for analytics - redirect immediately
    res.redirect(301, url.originalUrl);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
