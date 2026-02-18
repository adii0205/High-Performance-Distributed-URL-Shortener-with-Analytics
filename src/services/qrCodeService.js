/**
 * Phase 7: QR Code Generation Service
 * Generate QR codes for short URLs
 */

const { getRedis } = require('../cache/redisClient');
const { query } = require('../db/pool');

// QR code generation library (lightweight)
// Uses qrcode.js library (generates SVG or data URLs)
let QRCode;
try {
  QRCode = require('qrcode');
} catch (e) {
  console.warn('qrcode library not found - QR codes will be generated via external service');
}

const QR_CACHE_TTL = 86400 * 30; // 30 days (QR codes don't change)

/**
 * Generate QR code for a short URL
 */
async function generateQRCode(shortCode, shortURL, format = 'data-url') {
  try {
    if (!QRCode) {
      // Fallback: Use external QR code API
      return {
        qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shortURL)}`,
        format: 'external-api',
        cached: false,
      };
    }

    // Generate QR code data URL
    const qrDataUrl = await QRCode.toDataURL(shortURL, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 1,
      width: 300,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    return {
      qrUrl: qrDataUrl,
      format: 'data-url',
      cached: false,
    };
  } catch (error) {
    console.error('QR code generation error:', error);
    return {
      qrUrl: null,
      error: error.message,
    };
  }
}

/**
 * Get or generate QR code (with caching)
 */
async function getOrGenerateQRCode(shortCode, shortURL) {
  try {
    const redis = getRedis();
    const cacheKey = `qr:${shortCode}`;

    // Try to get from cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      return {
        qrUrl: cached,
        format: 'data-url',
        cached: true,
      };
    }

    // Generate new QR code
    const result = await generateQRCode(shortCode, shortURL, 'data-url');

    if (result.qrUrl) {
      // Cache it
      try {
        await redis.setEx(cacheKey, QR_CACHE_TTL, result.qrUrl);
      } catch (e) {
        console.warn('Failed to cache QR code:', e.message);
      }
    }

    return result;
  } catch (error) {
    console.error('Error in getOrGenerateQRCode:', error);
    return {
      qrUrl: null,
      error: error.message,
    };
  }
}

/**
 * Store QR code in database (optional)
 */
async function storeQRCode(shortCodeId, qrData) {
  try {
    await query(
      `UPDATE urls SET qr_code = $1, qr_generated_at = NOW() WHERE id = $2`,
      [qrData, shortCodeId]
    );
  } catch (error) {
    console.error('Failed to store QR code:', error);
  }
}

/**
 * Delete QR code cache
 */
async function deleteQRCodeCache(shortCode) {
  try {
    const redis = getRedis();
    await redis.del(`qr:${shortCode}`);
  } catch (error) {
    console.error('Failed to delete QR cache:', error);
  }
}

module.exports = {
  generateQRCode,
  getOrGenerateQRCode,
  storeQRCode,
  deleteQRCodeCache,
};
