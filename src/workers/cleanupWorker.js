/**
 * Phase 7: Cleanup Cron Worker
 * Runs scheduled maintenance tasks
 */

const cron = require('node-cron');
const { initDatabase } = require('../db/pool');
const { runMaintenanceJob } = require('../services/cleanupService');

/**
 * Initialize and start cron jobs
 */
async function initializeCronJobs() {
  console.log('Initializing cron jobs...');

  // Daily maintenance at 2 AM
  // Pattern: 0 2 * * * (2:00 AM every day)
  cron.schedule('0 2 * * *', async () => {
    console.log('Running scheduled daily maintenance...');
    try {
      await runMaintenanceJob();
    } catch (error) {
      console.error('Cron job failed:', error);
    }
  });

  console.log('✓ Cron job scheduled: Daily maintenance at 2 AM');

  // Hourly cache refresh for hot URLs (optional)
  // Pattern: 0 * * * * (every hour at minute 0)
  cron.schedule('0 * * * *', async () => {
    console.log('Running hourly cache optimization...');
    // Can implement cache warming here
  });

  console.log('✓ Cron job scheduled: Hourly cache optimization');

  // Weekly analytics rollup (optional)
  // Pattern: 0 3 * * 0 (3 AM every Sunday)
  cron.schedule('0 3 * * 0', async () => {
    console.log('Running weekly analytics rollup...');
    // Can implement weekly aggregation here
  });

  console.log('✓ Cron job scheduled: Weekly analytics rollup on Sundays');
}

/**
 * Start cleanup worker
 */
async function startCleanupWorker() {
  try {
    console.log('Initializing cleanup worker...');

    // Initialize database
    await initDatabase();
    console.log('✓ Database connected');

    // Initialize cron jobs
    await initializeCronJobs();

    console.log('✓ Cleanup worker ready');
  } catch (error) {
    console.error('Failed to start cleanup worker:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start worker if run directly
if (require.main === module) {
  startCleanupWorker();
}

module.exports = { initializeCronJobs, startCleanupWorker };
