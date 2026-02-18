const express = require('express');
const router = express.Router();

/**
 * Health check endpoint
 */
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * Deep health check with service status
 */
router.get('/deep', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const redis = req.app.locals.redis;

    // Check database
    let dbOk = false;
    try {
      const result = await db.query('SELECT 1');
      dbOk = result.rows.length > 0;
    } catch (error) {
      dbOk = false;
    }

    // Check Redis
    let redisOk = false;
    try {
      await redis.ping();
      redisOk = true;
    } catch (error) {
      redisOk = false;
    }

    const allHealthy = dbOk && redisOk;

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: dbOk ? 'ok' : 'down',
        redis: redisOk ? 'ok' : 'down',
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
    });
  }
});

module.exports = router;
