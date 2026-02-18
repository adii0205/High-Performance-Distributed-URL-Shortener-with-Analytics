const express = require('express');
const router = express.Router();
const { simpleRateLimit } = require('../middleware/rateLimit');
const { query } = require('../db/pool');

// Rate limiting for analytics queries
const analyticsLimiter = simpleRateLimit(
  parseInt(process.env.RATE_LIMIT_REDIRECTS || '1000'),
  parseInt(process.env.RATE_LIMIT_WINDOW_MS || '3600000')
);

/**
 * Get analytics for a short code
 * GET /api/analytics/:shortCode
 */
router.get('/:shortCode', analyticsLimiter, async (req, res, next) => {
  try {
    const { shortCode } = req.params;
    const {
      startDate,
      endDate,
      groupBy = 'day',
    } = req.query;

    let whereClause = 'WHERE short_code = $1';
    const params = [shortCode];
    let paramIndex = 2;

    if (startDate) {
      whereClause += ` AND created_at >= $${paramIndex}`;
      params.push(new Date(startDate));
      paramIndex++;
    }

    if (endDate) {
      whereClause += ` AND created_at <= $${paramIndex}`;
      params.push(new Date(endDate));
      paramIndex++;
    }

    // Total clicks and unique IPs
    const statsResult = await query(
      `SELECT COUNT(*) as total_clicks, COUNT(DISTINCT ip_address) as unique_ips
       FROM analytics ${whereClause}`,
      params
    );

    // Clicks by country
    const countryResult = await query(
      `SELECT country_name, country_code, COUNT(*) as clicks
       FROM analytics ${whereClause}
       GROUP BY country_name, country_code
       ORDER BY clicks DESC
       LIMIT 10`,
      params
    );

    // Clicks by device
    const deviceResult = await query(
      `SELECT device_type, COUNT(*) as clicks
       FROM analytics ${whereClause}
       GROUP BY device_type
       ORDER BY clicks DESC`,
      params
    );

    // Clicks by browser
    const browserResult = await query(
      `SELECT browser, COUNT(*) as clicks
       FROM analytics ${whereClause}
       GROUP BY browser
       ORDER BY clicks DESC
       LIMIT 10`,
      params
    );

    // Top referrers
    const referrerResult = await query(
      `SELECT referrer, COUNT(*) as clicks
       FROM analytics ${whereClause} AND referrer IS NOT NULL
       GROUP BY referrer
       ORDER BY clicks DESC
       LIMIT 10`,
      params
    );

    res.json({
      shortCode,
      summary: {
        totalClicks: parseInt(statsResult.rows[0]?.total_clicks || 0),
        uniqueIPs: parseInt(statsResult.rows[0]?.unique_ips || 0),
      },
      breakdown: {
        byCountry: countryResult.rows.map(r => ({
          country: r.country_name,
          countryCode: r.country_code,
          clicks: parseInt(r.clicks),
        })),
        byDevice: deviceResult.rows.map(r => ({
          device: r.device_type,
          clicks: parseInt(r.clicks),
        })),
        byBrowser: browserResult.rows.map(r => ({
          browser: r.browser,
          clicks: parseInt(r.clicks),
        })),
        byReferrer: referrerResult.rows.map(r => ({
          referrer: r.referrer,
          clicks: parseInt(r.clicks),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
