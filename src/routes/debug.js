const express = require('express');
const router = express.Router();
const dbOptimization = require('../services/dbOptimization');
const { getLRUCache } = require('../cache/lruCache');
const { getRedis } = require('../cache/redisClient');

/**
 * Debug endpoint for database performance metrics
 * GET /api/debug/performance
 */
router.get('/performance', async (req, res, next) => {
  try {
    const performance = await dbOptimization.getPerformanceSummary();
    res.json(performance);
  } catch (error) {
    next(error);
  }
});

/**
 * Get LRU cache statistics
 * GET /api/debug/cache/lru
 */
router.get('/cache/lru', (req, res) => {
  const cache = getLRUCache();
  res.json({
    type: 'LRU Cache (In-Memory)',
    stats: cache.getStats(),
    description: 'Keeps the hottest 100 URLs in memory for <1ms access',
  });
});

/**
 * Get Redis cache statistics
 * GET /api/debug/cache/redis
 */
router.get('/cache/redis', async (req, res, next) => {
  try {
    const redis = getRedis();
    const info = await redis.info('stats');
    const dbSize = await redis.dbSize();

    res.json({
      type: 'Redis Cache',
      stats: {
        info,
        keysCount: dbSize,
      },
      description: 'Second-tier cache for hot URLs, TTL-based expiration',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get table statistics
 * GET /api/debug/tables
 */
router.get('/tables', async (req, res, next) => {
  try {
    const tableStats = await dbOptimization.getTableStats();
    res.json({
      tables: tableStats,
      description: 'Size and row count for all tables',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get index statistics
 * GET /api/debug/indexes
 */
router.get('/indexes', async (req, res, next) => {
  try {
    const indexStats = await dbOptimization.getIndexStats();
    const unusedIndexes = await dbOptimization.findUnusedIndexes();

    res.json({
      allIndexes: indexStats,
      unusedIndexes,
      description: 'Index usage statistics and identification of unused indexes',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get cache hit ratio
 * GET /api/debug/cache-ratio
 */
router.get('/cache-ratio', async (req, res, next) => {
  try {
    const cacheRatio = await dbOptimization.getCacheHitRatio();
    res.json({
      ...cacheRatio,
      description: 'PostgreSQL buffer cache hit ratio (should be >99%)',
      target: '99%+',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get optimization recommendations
 * GET /api/debug/recommendations
 */
router.get('/recommendations', async (req, res, next) => {
  try {
    const recommendations = await dbOptimization.getOptimizationRecommendations();
    res.json({
      recommendations,
      description: 'Automatic recommendations for performance improvements',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Run ANALYZE on all tables
 * POST /api/debug/analyze
 */
router.post('/analyze', async (req, res, next) => {
  try {
    await dbOptimization.analyzeAllTables();
    res.json({
      success: true,
      message: 'Analyzed all tables to update statistics',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get active connections
 * GET /api/debug/connections
 */
router.get('/connections', async (req, res, next) => {
  try {
    const connections = await dbOptimization.getConnections();
    res.json({
      connections,
      description: 'Active database connections',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Full dashboard summary
 * GET /api/debug/dashboard
 */
router.get('/dashboard', async (req, res, next) => {
  try {
    const [
      performance,
      lruCache,
      recommendations,
    ] = await Promise.all([
      dbOptimization.getPerformanceSummary(),
      Promise.resolve(getLRUCache().getStats()),
      dbOptimization.getOptimizationRecommendations(),
    ]);

    res.json({
      timestamp: new Date().toISOString(),
      summary: {
        database: {
          tables: performance.tables.count,
          indexes: performance.indexes.count,
          activeConnections: performance.connections.active,
        },
        cache: {
          lru: lruCache,
          database: performance.cache,
        },
        alerts: recommendations.length > 0 ? recommendations : [],
      },
      details: performance,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
