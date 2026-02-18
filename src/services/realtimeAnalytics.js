const redisClient = require('../cache/redisClient').client;

/**
 * Real-time analytics using Redis and WebSockets
 * Track clicks in real-time counter
 */

const REALTIME_KEY_PREFIX = 'realtime:';
const HOUR_KEY_PREFIX = 'hourly:';

/**
 * Increment real-time click counter
 */
const incrementRealTimeClicks = async (shortCode, timestamp = Date.now()) => {
  try {
    const hour = Math.floor(timestamp / (1000 * 60 * 60)); // Group by hour
    const key = `${REALTIME_KEY_PREFIX}${shortCode}`;
    const hourKey = `${HOUR_KEY_PREFIX}${shortCode}:${hour}`;

    // Increment real-time counter
    await redisClient.incr(key);
    
    // Increment hourly counter
    await redisClient.incr(hourKey);
    
    // Set expiry on real-time key (1 hour)
    await redisClient.expire(key, 3600);
    
    // Set expiry on hourly key (24 hours)
    await redisClient.expire(hourKey, 86400);

    return true;
  } catch (error) {
    console.error('Real-time analytics error:', error);
    return false;
  }
};

/**
 * Get real-time click count
 */
const getRealTimeClicks = async (shortCode) => {
  try {
    const key = `${REALTIME_KEY_PREFIX}${shortCode}`;
    const count = await redisClient.get(key);
    return parseInt(count || 0);
  } catch (error) {
    console.error('Get real-time error:', error);
    return 0;
  }
};

/**
 * Get hourly analytics for a link
 */
const getHourlyAnalytics = async (shortCode, hours = 24) => {
  try {
    const now = Math.floor(Date.now() / (1000 * 60 * 60));
    const analytics = [];

    for (let i = 0; i < hours; i++) {
      const hour = now - i;
      const hourKey = `${HOUR_KEY_PREFIX}${shortCode}:${hour}`;
      const count = await redisClient.get(hourKey);
      
      analytics.unshift({
        hour: new Date(hour * 1000 * 60 * 60).toISOString(),
        clicks: parseInt(count || 0)
      });
    }

    return analytics;
  } catch (error) {
    console.error('Get hourly analytics error:', error);
    return [];
  }
};

/**
 * Get top links by real-time clicks
 */
const getTopLinksRealTime = async (limit = 10) => {
  try {
    const keys = await redisClient.keys(`${REALTIME_KEY_PREFIX}*`);
    
    if (keys.length === 0) return [];

    const topLinks = [];
    for (const key of keys) {
      const count = await redisClient.get(key);
      const shortCode = key.replace(REALTIME_KEY_PREFIX, '');
      topLinks.push({ shortCode, clicks: parseInt(count || 0) });
    }

    return topLinks
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, limit);
  } catch (error) {
    console.error('Get top links error:', error);
    return [];
  }
};

/**
 * Reset real-time counter for a link
 */
const resetRealTimeCounter = async (shortCode) => {
  try {
    const key = `${REALTIME_KEY_PREFIX}${shortCode}`;
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error('Reset counter error:', error);
    return false;
  }
};

module.exports = {
  incrementRealTimeClicks,
  getRealTimeClicks,
  getHourlyAnalytics,
  getTopLinksRealTime,
  resetRealTimeCounter
};
