const Queue = require('bull');
const { query } = require('../db/pool');
const geoip = require('geoip-country');
const UAParser = require('ua-parser-js');

// Initialize database (for migrations)
const { initDatabase } = require('../db/pool');
const { runMigrations } = require('../db/migrations');

// Create queue
const analyticsQueue = new Queue('analytics', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
  },
});

/**
 * Process analytics events
 * This worker runs in background and doesn't need to be fast
 */
async function processAnalytics(job) {
  const { shortCodeId, shortCode, ip, userAgent, referer, timestamp } = job.data;

  try {
    // Get geolocation from IP
    let countryCode = null;
    let countryName = null;
    let latitude = null;
    let longitude = null;

    try {
      const geo = geoip.lookup(ip);
      if (geo) {
        countryCode = geo.country;
        countryName = geo.name;
      }
    } catch (geoError) {
      console.warn('Geolocation lookup failed:', geoError.message);
    }

    // Parse user agent
    const parser = new UAParser(userAgent);
    const result = parser.getResult();
    const deviceType = result.device.type || 'desktop';
    const browser = result.browser.name || 'Unknown';
    const browserVersion = result.browser.version || null;
    const os = result.os.name || 'Unknown';
    const osVersion = result.os.version || null;

    // Insert into analytics table
    await query(
      `INSERT INTO analytics (
        short_code_id, short_code, ip_address, country_code, country_name,
        device_type, browser, browser_version, os, os_version, referrer, user_agent,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        shortCodeId,
        shortCode,
        ip,
        countryCode,
        countryName,
        deviceType,
        browser,
        browserVersion,
        os,
        osVersion,
        referer || null,
        userAgent,
        new Date(timestamp),
      ]
    );

    // Update analytics summary (upsert pattern)
    await query(
      `INSERT INTO analytics_summary (short_code_id, short_code, click_count, unique_ips, last_click_at, updated_at)
       VALUES ($1, $2, 1, 1, $3, NOW())
       ON CONFLICT (short_code_id) DO UPDATE SET
         click_count = analytics_summary.click_count + 1,
         last_click_at = GREATEST(analytics_summary.last_click_at, $3),
         updated_at = NOW()`,
      [shortCodeId, shortCode, new Date(timestamp)]
    );

    console.log(`Analytics processed: ${shortCode} from ${countryCode || 'Unknown'}`);
  } catch (error) {
    console.error('Analytics processing error:', error);
    throw error; // Throw to trigger retry
  }
}

/**
 * Set up event handlers
 */
analyticsQueue.process(
  parseInt(process.env.ANALYTICS_WORKERS || '4'),
  processAnalytics
);

analyticsQueue.on('failed', (job, error) => {
  console.error(`Job ${job.id} failed:`, error.message);
});

analyticsQueue.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

analyticsQueue.on('error', (error) => {
  console.error('Queue error:', error);
});

/**
 * Start worker
 */
async function startWorker() {
  try {
    console.log('Initializing analytics worker...');

    // Initialize database
    await initDatabase();
    console.log('✓ Database connected');

    // Run migrations
    await runMigrations();
    console.log('✓ Migrations completed');

    console.log('✓ Analytics worker started');
    console.log(`Processing up to ${parseInt(process.env.ANALYTICS_WORKERS || '4')} jobs concurrently`);
  } catch (error) {
    console.error('Failed to start worker:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await analyticsQueue.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await analyticsQueue.close();
  process.exit(0);
});

// Start worker
startWorker();

module.exports = { analyticsQueue, processAnalytics };
