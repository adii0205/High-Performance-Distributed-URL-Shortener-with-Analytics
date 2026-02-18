/**
 * Phase 7: URL Cleanup Service
 * Manage URL expiration, archival, and cleanup
 */

const { query } = require('../db/pool');
const { getRedis } = require('../cache/redisClient');

/**
 * Soft delete expired URLs (set as inactive)
 */
async function softDeleteExpiredURLs() {
  try {
    const result = await query(`
      UPDATE urls
      SET is_active = FALSE, expires_at = NOW()
      WHERE expires_at IS NOT NULL 
        AND expires_at < NOW()
        AND is_active = TRUE
      RETURNING id, short_code;
    `);

    console.log(`✓ Soft deleted ${result.rows.length} expired URLs`);

    // Clear cache for expired URLs
    const redis = getRedis();
    for (const row of result.rows) {
      try {
        await redis.del(`url:${row.short_code}`);
      } catch (e) {
        // Continue on cache miss
      }
    }

    return result.rows;
  } catch (error) {
    console.error('Failed to soft delete expired URLs:', error);
    return [];
  }
}

/**
 * Archive old analytics (>90 days)
 */
async function archiveOldAnalytics(daysOld = 90) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await query(`
      -- Create archive table if doesn't exist
      CREATE TABLE IF NOT EXISTS analytics_archive AS
      SELECT * FROM analytics WHERE created_at < $1 AND FALSE;

      -- Insert old records into archive
      INSERT INTO analytics_archive
      SELECT * FROM analytics 
      WHERE created_at < $1
      ON CONFLICT DO NOTHING;

      -- Delete from main table
      DELETE FROM analytics 
      WHERE created_at < $1
      AND id NOT IN (
        -- Keep recent data for trending analysis
        SELECT id FROM analytics 
        ORDER BY created_at DESC 
        LIMIT 1000000
      );

      -- Return count
      SELECT COUNT(*) as archived FROM analytics_archive
      WHERE created_at < $1;
    `, [cutoffDate]);

    console.log(`✓ Archived analytics older than ${daysOld} days`);
    return result.rows[0];
  } catch (error) {
    // Ignore if feature not critical
    console.warn('Analytics archival failed (non-critical):', error.message);
    return { archived: 0 };
  }
}

/**
 * Cleanup dead data and optimize tables
 */
async function cleanupDatabase() {
  try {
    // Remove analytics from deleted URLs
    await query(`
      DELETE FROM analytics
      WHERE short_code NOT IN (SELECT short_code FROM urls);
    `);

    // Remove analytics_summary from deleted URLs
    await query(`
      DELETE FROM analytics_summary
      WHERE short_code NOT IN (SELECT short_code FROM urls);
    `);

    // Clean stale rate limit logs
    await query(`
      DELETE FROM rate_limit_logs
      WHERE window_end < NOW() - INTERVAL '7 days';
    `);

    console.log('✓ Database cleanup completed');
  } catch (error) {
    console.error('Database cleanup failed:', error);
  }
}

/**
 * Generate daily statistics
 */
async function generateDailyStatistics() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await query(`
      INSERT INTO daily_stats (date, total_urls, total_clicks, unique_visitors, avg_clicks)
      SELECT 
        $1::date as date,
        COUNT(DISTINCT u.id) as total_urls,
        COUNT(a.id) as total_clicks,
        COUNT(DISTINCT a.ip_address) as unique_visitors,
        CASE 
          WHEN COUNT(DISTINCT u.id) > 0 THEN COUNT(a.id)::float / COUNT(DISTINCT u.id)
          ELSE 0
        END as avg_clicks
      FROM urls u
      LEFT JOIN analytics a ON u.id = a.short_code_id 
        AND DATE(a.created_at) = $1::date
      ON CONFLICT (date) DO UPDATE SET
        total_urls = EXCLUDED.total_urls,
        total_clicks = EXCLUDED.total_clicks,
        unique_visitors = EXCLUDED.unique_visitors,
        avg_clicks = EXCLUDED.avg_clicks;
    `, [today]);

    console.log('✓ Generated daily statistics');
    return result.rowCount;
  } catch (error) {
    if (error.code === '42P1') {
      // Table doesn't exist yet - skip
      return 0;
    }
    console.error('Failed to generate daily statistics:', error);
    return 0;
  }
}

/**
 * Cleanup expired cache entries
 */
async function cleanupExpiredCache() {
  try {
    const redis = getRedis();

    // Redis automatically expires keys, but we can force cleanup
    // Get all URL cache keys and check if URLs still exist
    const keys = await redis.keys('url:*');

    let cleaned = 0;
    for (const key of keys) {
      const code = key.replace('url:', '');
      const result = await query(
        'SELECT id FROM urls WHERE short_code = $1',
        [code]
      );

      if (result.rows.length === 0) {
        await redis.del(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`✓ Cleaned ${cleaned} invalid cache entries`);
    }

    return cleaned;
  } catch (error) {
    console.error('Cache cleanup failed:', error);
    return 0;
  }
}

/**
 * Run full maintenance job
 */
async function runMaintenanceJob() {
  console.log('Starting maintenance job...');
  const startTime = Date.now();

  try {
    // Run all cleanup tasks
    await Promise.all([
      softDeleteExpiredURLs(),
      cleanupDatabase(),
      cleanupExpiredCache(),
    ]);

    // Run less urgent tasks
    await archiveOldAnalytics(90);
    await generateDailyStatistics();

    const duration = Date.now() - startTime;
    console.log(`✓ Maintenance job completed in ${duration}ms`);
  } catch (error) {
    console.error('Maintenance job failed:', error);
  }
}

module.exports = {
  softDeleteExpiredURLs,
  archiveOldAnalytics,
  cleanupDatabase,
  generateDailyStatistics,
  cleanupExpiredCache,
  runMaintenanceJob,
};
