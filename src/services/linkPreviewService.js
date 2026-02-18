/**
 * Phase 7: Link Preview Service
 * Fetch and cache OpenGraph metadata from URLs
 */

const { getRedis } = require('../cache/redisClient');
const { query } = require('../db/pool');

const PREVIEW_CACHE_TTL = 86400 * 7; // 7 days (previews can change)

/**
 * Fetch metadata from a URL using OpenGraph parsing
 */
async function fetchLinkPreview(url) {
  try {
    // For production, use a library like metascraper or microlink API
    // This is a simplified version that fetches HTML and extracts OG tags

    const response = await fetch(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; URLShortenerBot/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const html = await response.text();

    // Extract OpenGraph tags using regex
    const ogTags = extractOGTags(html);

    return {
      title: ogTags.title || extractTitle(html),
      description: ogTags.description || extractDescription(html),
      image: ogTags.image,
      url: ogTags.url || url,
      type: ogTags.type || 'website',
      author: ogTags.author,
      siteName: ogTags.siteName,
    };
  } catch (error) {
    console.error('Link preview fetch error:', error);
    return {
      error: error.message,
      url,
    };
  }
}

/**
 * Extract OpenGraph meta tags from HTML
 */
function extractOGTags(html) {
  const tags = {};

  // Common OG tags
  const ogPatterns = {
    title: /<meta\s+property="og:title"\s+content="([^"]+)"/i,
    description: /<meta\s+property="og:description"\s+content="([^"]+)"/i,
    image: /<meta\s+property="og:image"\s+content="([^"]+)"/i,
    url: /<meta\s+property="og:url"\s+content="([^"]+)"/i,
    type: /<meta\s+property="og:type"\s+content="([^"]+)"/i,
    author: /<meta\s+name="author"\s+content="([^"]+)"/i,
    siteName: /<meta\s+property="og:site_name"\s+content="([^"]+)"/i,
  };

  for (const [key, pattern] of Object.entries(ogPatterns)) {
    const match = html.match(pattern);
    if (match) {
      tags[key] = match[1].substring(0, 500); // Limit length
    }
  }

  return tags;
}

/**
 * Extract title fallback from HTML
 */
function extractTitle(html) {
  const match = html.match(/<title>([^<]+)<\/title>/i);
  return match ? match[1].substring(0, 200) : null;
}

/**
 * Extract meta description from HTML
 */
function extractDescription(html) {
  const match = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
  return match ? match[1].substring(0, 300) : null;
}

/**
 * Get or fetch link preview (with caching)
 */
async function getOrFetchPreview(url, shortCodeId) {
  try {
    const redis = getRedis();
    const cacheKey = `preview:${shortCodeId}`;

    // Try to get from cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      return {
        ...JSON.parse(cached),
        cached: true,
      };
    }

    // Fetch new preview
    const preview = await fetchLinkPreview(url);

    if (!preview.error) {
      // Cache it
      try {
        await redis.setEx(cacheKey, PREVIEW_CACHE_TTL, JSON.stringify(preview));
      } catch (e) {
        console.warn('Failed to cache preview:', e.message);
      }

      // Store in database (optional)
      try {
        await storePreviewInDB(shortCodeId, preview);
      } catch (e) {
        console.warn('Failed to store preview in DB:', e.message);
      }
    }

    return {
      ...preview,
      cached: false,
    };
  } catch (error) {
    console.error('Error in getOrFetchPreview:', error);
    return {
      error: error.message,
      cached: false,
    };
  }
}

/**
 * Store preview in database for persistence
 */
async function storePreviewInDB(shortCodeId, preview) {
  try {
    await query(
      `UPDATE urls 
       SET title = COALESCE($1, title), 
           description = COALESCE($2, description),
           ogimage = $3,
           preview_fetched_at = NOW()
       WHERE id = $4`,
      [
        preview.title || null,
        preview.description || null,
        preview.image || null,
        shortCodeId,
      ]
    );
  } catch (error) {
    console.error('Failed to store preview in DB:', error);
  }
}

/**
 * Invalidate preview cache
 */
async function invalidatePreviewCache(shortCodeId) {
  try {
    const redis = getRedis();
    await redis.del(`preview:${shortCodeId}`);
  } catch (error) {
    console.error('Failed to invalidate preview cache:', error);
  }
}

module.exports = {
  fetchLinkPreview,
  getOrFetchPreview,
  storePreviewInDB,
  invalidatePreviewCache,
};
