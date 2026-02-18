/**
 * Phase 5: Database Performance Optimization
 * Query optimization, statistics, and monitoring
 */

const { query } = require('../db/pool');

/**
 * Gather query statistics to help with performance tuning
 */
async function gatherQueryStats() {
  try {
    const stats = await query(`
      SELECT 
        query,
        calls,
        total_time,
        mean_time,
        max_time,
        rows,
        CASE 
          WHEN mean_time > 100 THEN 'SLOW'
          WHEN mean_time > 10 THEN 'MEDIUM'
          ELSE 'FAST'
        END as performance
      FROM pg_stat_statements
      ORDER BY total_time DESC
      LIMIT 20;
    `);

    return stats.rows;
  } catch (error) {
    console.error('Failed to gather query stats:', error.message);
    return [];
  }
}

/**
 * Analyze table to update statistics
 * Should be run periodically (daily/weekly)
 */
async function analyzeAllTables() {
  try {
    const tables = ['urls', 'analytics', 'analytics_summary', 'rate_limit_logs', 'users'];

    for (const table of tables) {
      await query(`ANALYZE ${table};`);
    }

    console.log('✓ Analyzed all tables');
  } catch (error) {
    console.error('Failed to analyze tables:', error);
  }
}

/**
 * Reindex tables to optimize performance
 * Can be run periodically
 */
async function reindexTables() {
  try {
    const tables = ['urls', 'analytics', 'analytics_summary', 'rate_limit_logs'];

    for (const table of tables) {
      await query(`REINDEX TABLE CONCURRENTLY ${table};`);
    }

    console.log('✓ Reindexed all tables');
  } catch (error) {
    console.error('Failed to reindex tables:', error);
  }
}

/**
 * Get index usage statistics
 */
async function getIndexStats() {
  try {
    const stats = await query(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan as scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched,
        pg_size_pretty(pg_relation_size(indexrelid)) as size
      FROM pg_stat_user_indexes
      ORDER BY idx_scan DESC;
    `);

    return stats.rows;
  } catch (error) {
    console.error('Failed to get index stats:', error);
    return [];
  }
}

/**
 * Identify unused/redundant indexes
 */
async function findUnusedIndexes() {
  try {
    const stats = await query(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan as scans,
        pg_size_pretty(pg_relation_size(indexrelid)) as size
      FROM pg_stat_user_indexes
      WHERE idx_scan = 0
      AND indexname NOT LIKE 'pg_toast%'
      ORDER BY pg_relation_size(indexrelid) DESC;
    `);

    return stats.rows;
  } catch (error) {
    console.error('Failed to find unused indexes:', error);
    return [];
  }
}

/**
 * Get table size statistics
 */
async function getTableStats() {
  try {
    const stats = await query(`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
        pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
        pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as indexes_size,
        n_live_tup as live_rows,
        n_dead_tup as dead_rows
      FROM pg_stat_user_tables
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
    `);

    return stats.rows;
  } catch (error) {
    console.error('Failed to get table stats:', error);
    return [];
  }
}

/**
 * Get database connections info
 */
async function getConnections() {
  try {
    const stats = await query(`
      SELECT 
        datname,
        usename,
        application_name,
        state,
        query_start,
        state_change,
        COUNT(*) as connection_count
      FROM pg_stat_activity
      WHERE datname IS NOT NULL
      GROUP BY datname, usename, application_name, state, query_start, state_change
      ORDER BY connection_count DESC;
    `);

    return stats.rows;
  } catch (error) {
    console.error('Failed to get connections:', error);
    return [];
  }
}

/**
 * Get cache hit ratio (should be >99%)
 */
async function getCacheHitRatio() {
  try {
    const stats = await query(`
      SELECT 
        sum(heap_blks_read) as heap_read,
        sum(heap_blks_hit) as heap_hit,
        sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio,
        ROUND(100 * sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)), 2) as percentage
      FROM pg_statio_user_tables;
    `);

    if (stats.rows[0] && stats.rows[0].ratio) {
      const ratio = (stats.rows[0].percentage || 0).toFixed(2);
      return {
        cacheHitRatio: ratio + '%',
        heapRead: stats.rows[0].heap_read,
        heapHit: stats.rows[0].heap_hit,
      };
    }

    return { cacheHitRatio: 'N/A' };
  } catch (error) {
    console.error('Failed to get cache hit ratio:', error);
    return { cacheHitRatio: 'N/A' };
  }
}

/**
 * Query optimization recommendations
 */
async function getOptimizationRecommendations() {
  const recommendations = [];

  try {
    // Check cache hit ratio
    const cacheStats = await getCacheHitRatio();
    if (cacheStats.cacheHitRatio !== 'N/A') {
      const ratio = parseFloat(cacheStats.cacheHitRatio);
      if (ratio < 99) {
        recommendations.push({
          type: 'CACHE',
          severity: 'HIGH',
          message: `Cache hit ratio is ${cacheStats.cacheHitRatio}. Consider increasing shared_buffers.`,
        });
      }
    }

    // Check for missing indexes (from query analysis)
    const unusedIndexes = await findUnusedIndexes();
    if (unusedIndexes.length > 0) {
      recommendations.push({
        type: 'INDEXES',
        severity: 'MEDIUM',
        message: `Found ${unusedIndexes.length} unused indexes that could be dropped to free space.`,
        details: unusedIndexes,
      });
    }

    // Check for bloated tables
    const tableStats = await getTableStats();
    const bloatedTables = tableStats.filter(t => {
      const deadRowsPercent = (t.dead_rows / (t.live_rows + t.dead_rows)) * 100;
      return deadRowsPercent > 10;
    });

    if (bloatedTables.length > 0) {
      recommendations.push({
        type: 'VACUUM',
        severity: 'MEDIUM',
        message: `Found ${bloatedTables.length} tables with >10% dead rows. Consider VACUUM ANALYZE.`,
        tables: bloatedTables.map(t => t.tablename),
      });
    }
  } catch (error) {
    console.error('Error generating recommendations:', error);
  }

  return recommendations;
}

/**
 * Performance summary endpoint
 */
async function getPerformanceSummary() {
  try {
    const [
      tableStats,
      indexStats,
      cacheStats,
      connections,
      recommendations,
    ] = await Promise.all([
      getTableStats(),
      getIndexStats(),
      getCacheHitRatio(),
      getConnections(),
      getOptimizationRecommendations(),
    ]);

    return {
      timestamp: new Date().toISOString(),
      cache: cacheStats,
      tables: {
        count: tableStats.length,
        stats: tableStats,
      },
      indexes: {
        count: indexStats.length,
        stats: indexStats,
      },
      connections: {
        active: connections.reduce((sum, c) => sum + c.connection_count, 0),
        details: connections,
      },
      recommendations,
    };
  } catch (error) {
    console.error('Failed to generate performance summary:', error);
    return { error: error.message };
  }
}

module.exports = {
  gatherQueryStats,
  analyzeAllTables,
  reindexTables,
  getIndexStats,
  findUnusedIndexes,
  getTableStats,
  getConnections,
  getCacheHitRatio,
  getOptimizationRecommendations,
  getPerformanceSummary,
};
