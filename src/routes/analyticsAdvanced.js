const express = require('express');
const { optionalAuth, verifyToken } = require('../middleware/auth');
const {
  incrementRealTimeClicks,
  getRealTimeClicks,
  getHourlyAnalytics,
  getTopLinksRealTime
} = require('../services/realtimeAnalytics');
const pool = require('../db/pool').pool;

const router = express.Router();

/**
 * GET /api/analytics/:shortCode
 * Get analytics for a specific link
 */
router.get('/:shortCode', optionalAuth, async (req, res) => {
  try {
    const { shortCode } = req.params;
    const { days = 30, userOnly = false } = req.query;

    // Get URL info
    const urlResult = await pool.query(
      'SELECT id, user_id, visibility, click_count FROM urls WHERE short_code = $1',
      [shortCode]
    );

    if (urlResult.rows.length === 0) {
      return res.status(404).json({ error: 'URL not found' });
    }

    const url = urlResult.rows[0];

    // Check visibility permissions
    if (url.visibility === 'analytics-only' && (!req.user || req.user.userId !== url.user_id)) {
      return res.status(403).json({ error: 'Analytics not available' });
    }

    if (url.visibility === 'private' && (!req.user || req.user.userId !== url.user_id)) {
      return res.status(403).json({ error: 'Link is private' });
    }

    // Get analytics breakdown
    const analyticsResult = await pool.query(
      `SELECT 
        country_code, country_name, COUNT(*) as clicks,
        device_type, browser, os
       FROM analytics 
       WHERE short_code = $1 
       AND created_at > NOW() - INTERVAL '1 day' * $2
       GROUP BY country_code, country_name, device_type, browser, os`,
      [shortCode, days]
    );

    // Geographic breakdown
    const countries = {};
    const devices = {};
    const browsers = {};

    for (const row of analyticsResult.rows) {
      countries[row.country_name || 'Unknown'] = (countries[row.country_name || 'Unknown'] || 0) + row.clicks;
      devices[row.device_type || 'Unknown'] = (devices[row.device_type || 'Unknown'] || 0) + row.clicks;
      browsers[row.browser || 'Unknown'] = (browsers[row.browser || 'Unknown'] || 0) + row.clicks;
    }

    // Get hourly breakdown
    const hourlyResult = await pool.query(
      `SELECT 
        DATE_TRUNC('hour', created_at) as hour, COUNT(*) as clicks
       FROM analytics
       WHERE short_code = $1
       AND created_at > NOW() - INTERVAL '1 hour' * 24
       GROUP BY DATE_TRUNC('hour', created_at)
       ORDER BY hour DESC`,
      [shortCode]
    );

    const hourlyData = hourlyResult.rows.map(row => ({
      hour: row.hour,
      clicks: parseInt(row.clicks)
    }));

    // Get real-time data
    const realtimeClicks = await getRealTimeClicks(shortCode);

    res.json({
      shortCode,
      totalClicks: url.click_count || 0,
      realtimeClicks,
      countries,
      devices,
      browsers,
      hourlyData,
      period: `Last ${days} days`
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
 * GET /api/analytics/dashboard/:userId
 * Get user's dashboard with all their links' analytics
 */
router.get('/dashboard/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify user is accessing their own dashboard
    if (req.user.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get all user's links with click counts
    const linksResult = await pool.query(
      `SELECT 
        id, short_code, original_url, title, click_count, created_at, visibility
       FROM urls
       WHERE user_id = $1
       ORDER BY click_count DESC
       LIMIT 50`,
      [userId]
    );

    // Get top links real-time data
    const topLinks = await getTopLinksRealTime(10);

    // Get total stats
    const statsResult = await pool.query(
      `SELECT 
        COUNT(*) as total_links,
        SUM(click_count) as total_clicks,
        ROUND(AVG(click_count), 2) as avg_clicks_per_link
       FROM urls
       WHERE user_id = $1`,
      [userId]
    );

    const stats = statsResult.rows[0];

    res.json({
      user: { userId },
      stats: {
        totalLinks: parseInt(stats.total_links),
        totalClicks: parseInt(stats.total_clicks || 0),
        avgClicksPerLink: parseFloat(stats.avg_clicks_per_link || 0)
      },
      links: linksResult.rows,
      topLinksRealtime: topLinks
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

/**
 * GET /api/analytics/heatmap/:shortCode?date=YYYY-MM-DD
 * Get geographic heatmap data for a link
 */
router.get('/heatmap/:shortCode', optionalAuth, async (req, res) => {
  try {
    const { shortCode } = req.params;
    const { date } = req.query;

    let dateFilter = "AND created_at > NOW() - INTERVAL '7 days'";
    if (date) {
      dateFilter = `AND created_at::date = $2`;
    }

    const result = await pool.query(
      `SELECT 
        country_code, country_name, 
        latitude, longitude,
        COUNT(*) as clicks
       FROM analytics
       WHERE short_code = $1 ${dateFilter}
       GROUP BY country_code, country_name, latitude, longitude
       ORDER BY clicks DESC`,
      date ? [shortCode, date] : [shortCode]
    );

    res.json({
      shortCode,
      heatmapData: result.rows.map(row => ({
        country: row.country_name || 'Unknown',
        countryCode: row.country_code,
        coordinates: {
          lat: parseFloat(row.latitude) || 0,
          lng: parseFloat(row.longitude) || 0
        },
        clicks: parseInt(row.clicks)
      }))
    });
  } catch (error) {
    console.error('Heatmap error:', error);
    res.status(500).json({ error: 'Failed to fetch heatmap data' });
  }
});

/**
 * POST /api/analytics/track
 * Track a click (called from redirect)
 */
router.post('/track', async (req, res) => {
  try {
    const { shortCode, ...analyticsData } = req.body;

    // Store analytics
    await pool.query(
      `INSERT INTO analytics (
        short_code, ip_address, country_code, country_name, city,
        latitude, longitude, device_type, browser, browser_version,
        os, os_version, referrer, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        shortCode,
        analyticsData.ip,
        analyticsData.countryCode,
        analyticsData.countryName,
        analyticsData.city,
        analyticsData.latitude,
        analyticsData.longitude,
        analyticsData.deviceType,
        analyticsData.browser,
        analyticsData.browserVersion,
        analyticsData.os,
        analyticsData.osVersion,
        analyticsData.referrer,
        analyticsData.userAgent
      ]
    );

    // Increment real-time counter
    await incrementRealTimeClicks(shortCode);

    res.json({ success: true });
  } catch (error) {
    console.error('Track error:', error);
    res.json({ success: false }); // Don't fail the request
  }
});

module.exports = router;
