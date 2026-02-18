const { query } = require('../db/pool');
const { getRedis } = require('../cache/redisClient');
const { getLRUCache } = require('../cache/lruCache');
const { generateTimestampShortCode, generateRandomShortCode } = require('../utils/base62');

const CACHE_TTL = parseInt(process.env.CACHE_TTL_SECONDS || '3600');

/**
 * Generate a unique short code with collision resolution
 */
async function generateUniqueShortCode(length = 6) {
  const maxAttempts = 5;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateTimestampShortCode(length);
    
    // Check if code already exists
    const result = await query(
      'SELECT id FROM urls WHERE short_code = $1',
      [code]
    );

    if (result.rows.length === 0) {
      return code;
    }
  }

  // If collision happens 5 times, increase length
  return generateUniqueShortCode(length + 2);
}

/**
 * Create a new shortened URL
 */
async function createShortURL(data) {
  const {
    originalUrl,
    userId = null,
    customAlias = null,
    title = null,
    description = null,
    expiresAt = null,
    customDomain = null,
  } = data;

  let shortCode = customAlias;

  // If custom alias provided, validate it's unique
  if (customAlias) {
    const existing = await query(
      'SELECT id FROM urls WHERE custom_alias = $1',
      [customAlias]
    );
    if (existing.rows.length > 0) {
      throw new Error('Custom alias already exists');
    }
  } else {
    // Generate unique short code
    shortCode = await generateUniqueShortCode(
      parseInt(process.env.SHORT_CODE_LENGTH || '6')
    );
  }

  // Insert into database
  const result = await query(
    `INSERT INTO urls (
      short_code, original_url, user_id, custom_alias, 
      title, description, expires_at, custom_domain, is_active
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      shortCode,
      originalUrl,
      userId,
      customAlias,
      title,
      description,
      expiresAt,
      customDomain,
      true,
    ]
  );

  const url = result.rows[0];

  // Cache the URL
  await cacheURL(shortCode, {
    id: url.id,
    originalUrl: url.original_url,
    title: url.title,
    description: url.description,
    expiresAt: url.expires_at,
    isActive: url.is_active,
  });

  return url;
}

/**
 * Get URL by short code
 * Uses multi-tier caching: LRU → Redis → PostgreSQL
 */
async function getURLByShortCode(shortCode) {
  // Layer 1: LRU Cache (in-memory, <1ms)
  const lru = getLRUCache();
  let cachedUrl = lru.get(shortCode);
  if (cachedUrl) {
    return cachedUrl;
  }

  // Layer 2: Redis Cache (5-10ms)
  const redis = getRedis();
  const redisKey = `url:${shortCode}`;
  const redisData = await redis.get(redisKey);
  if (redisData) {
    cachedUrl = JSON.parse(redisData);
    lru.set(shortCode, cachedUrl);
    return cachedUrl;
  }

  // Layer 3: PostgreSQL (50-200ms)
  const result = await query(
    `SELECT id, original_url, title, description, expires_at, is_active 
     FROM urls WHERE short_code = $1`,
    [shortCode]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const url = result.rows[0];

  // Check if expired
  if (url.expires_at && new Date(url.expires_at) < new Date()) {
    return null;
  }

  // Check if active
  if (!url.is_active) {
    return null;
  }

  const urlData = {
    id: url.id,
    originalUrl: url.original_url,
    title: url.title,
    description: url.description,
    expiresAt: url.expires_at,
    isActive: url.is_active,
  };

  // Cache it for next time
  await cacheURL(shortCode, urlData);
  lru.set(shortCode, urlData);

  return urlData;
}

/**
 * Cache URL in Redis
 */
async function cacheURL(shortCode, urlData) {
  const redis = getRedis();
  const key = `url:${shortCode}`;
  
  try {
    await redis.setEx(
      key,
      CACHE_TTL,
      JSON.stringify(urlData)
    );
  } catch (error) {
    console.error('Redis cache error:', error);
    // Don't throw - cache failures shouldn't break main flow
  }
}

/**
 * Invalidate URL cache
 */
async function invalidateURLCache(shortCode) {
  const redis = getRedis();
  const lru = getLRUCache();

  lru.delete(shortCode);

  try {
    await redis.del(`url:${shortCode}`);
  } catch (error) {
    console.error('Redis delete error:', error);
  }
}

/**
 * Get URL statistics
 */
async function getURLStats(shortCode) {
  const result = await query(
    `SELECT 
      u.id, u.short_code, u.original_url, u.created_at,
      COALESCE(s.click_count, 0) as click_count,
      COALESCE(s.unique_ips, 0) as unique_ips,
      s.last_click_at
     FROM urls u
     LEFT JOIN analytics_summary s ON u.id = s.short_code_id
     WHERE u.short_code = $1`,
    [shortCode]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

/**
 * Delete a shortened URL
 */
async function deleteURL(shortCode) {
  const result = await query(
    'DELETE FROM urls WHERE short_code = $1 RETURNING *',
    [shortCode]
  );

  if (result.rows.length > 0) {
    await invalidateURLCache(shortCode);
  }

  return result.rows[0];
}

module.exports = {
  createShortURL,
  getURLByShortCode,
  cacheURL,
  invalidateURLCache,
  getURLStats,
  deleteURL,
  generateUniqueShortCode,
};
