const express = require('express');
const router = express.Router();
const { validate, createURLSchema } = require('../middleware/validation');
const { simpleRateLimit } = require('../middleware/rateLimit');
const {
  createShortURL,
  getURLStats,
  deleteURL,
} = require('../services/urlService');
const { getOrGenerateQRCode, deleteQRCodeCache } = require('../services/qrCodeService');
const { getOrFetchPreview, invalidatePreviewCache } = require('../services/linkPreviewService');

// Rate limiting
const createLimiter = simpleRateLimit(
  parseInt(process.env.RATE_LIMIT_CREATE_URLS || '100'),
  parseInt(process.env.RATE_LIMIT_WINDOW_MS || '3600000')
);

/**
 * Create a new short URL
 * POST /api/urls
 */
router.post('/', createLimiter, validate(createURLSchema), async (req, res, next) => {
  try {
    const url = await createShortURL(req.validatedData);
    const shortURL = `http://${req.get('host')}/${url.short_code}`;

    // Generate QR code if enabled
    let qrCode = null;
    if (process.env.ENABLE_QR_CODE === 'true') {
      try {
        const qrResult = await getOrGenerateQRCode(url.short_code, shortURL);
        qrCode = qrResult.qrUrl;
      } catch (e) {
        console.warn('QR code generation failed:', e.message);
      }
    }

    // Fetch link preview if enabled
    let preview = null;
    if (process.env.ENABLE_LINK_PREVIEW === 'true') {
      try {
        const previewResult = await getOrFetchPreview(
          req.validatedData.originalUrl,
          url.id
        );
        preview = {
          title: previewResult.title,
          description: previewResult.description,
          image: previewResult.image,
        };
      } catch (e) {
        console.warn('Link preview fetch failed:', e.message);
      }
    }

    res.status(201).json({
      id: url.id,
      shortCode: url.short_code,
      originalUrl: url.original_url,
      title: url.title,
      description: url.description,
      customAlias: url.custom_alias,
      customDomain: url.custom_domain,
      expiresAt: url.expires_at,
      shortURL,
      qrCode,  // Phase 7: QR code
      preview,  // Phase 7: Link preview
      createdAt: url.created_at,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get URL with full details including QR code and preview
 * GET /api/urls/:shortCode/details
 */
router.get('/:shortCode/details', async (req, res, next) => {
  try {
    const stats = await getURLStats(req.params.shortCode);

    if (!stats) {
      return res.status(404).json({
        error: 'URL not found',
      });
    }

    const shortURL = `http://${req.get('host')}/${req.params.shortCode}`;
    let qrCode = null;
    let preview = null;

    // Get QR code if enabled
    if (process.env.ENABLE_QR_CODE === 'true') {
      try {
        const qrResult = await getOrGenerateQRCode(req.params.shortCode, shortURL);
        qrCode = qrResult.qrUrl;
      } catch (e) {
        console.warn('QR code fetch failed');
      }
    }

    // Get preview if enabled
    if (process.env.ENABLE_LINK_PREVIEW === 'true') {
      try {
        const previewResult = await getOrFetchPreview(
          stats.original_url,
          stats.id
        );
        preview = {
          title: previewResult.title,
          description: previewResult.description,
          image: previewResult.image,
        };
      } catch (e) {
        console.warn('Preview fetch failed');
      }
    }

    res.json({
      shortCode: stats.short_code,
      originalUrl: stats.original_url,
      shortURL,
      qrCode,
      preview,
      analytics: {
        clickCount: parseInt(stats.click_count),
        uniqueIPs: parseInt(stats.unique_ips),
        lastClickAt: stats.last_click_at,
      },
      createdAt: stats.created_at,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get URL statistics
 * GET /api/urls/:shortCode/stats
 */
router.get('/:shortCode/stats', async (req, res, next) => {
  try {
    const stats = await getURLStats(req.params.shortCode);

    if (!stats) {
      return res.status(404).json({
        error: 'URL not found',
      });
    }

    res.json({
      shortCode: stats.short_code,
      originalUrl: stats.original_url,
      clickCount: parseInt(stats.click_count),
      uniqueIPs: parseInt(stats.unique_ips),
      lastClickAt: stats.last_click_at,
      createdAt: stats.created_at,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get QR code for a URL
 * GET /api/urls/:shortCode/qr
 */
router.get('/:shortCode/qr', async (req, res, next) => {
  try {
    const stats = await getURLStats(req.params.shortCode);

    if (!stats) {
      return res.status(404).json({ error: 'URL not found' });
    }

    const shortURL = `http://${req.get('host')}/${req.params.shortCode}`;
    const qrResult = await getOrGenerateQRCode(req.params.shortCode, shortURL);

    if (qrResult.error) {
      return res.status(500).json({ error: qrResult.error });
    }

    // If it's a data URL, decode it
    if (qrResult.format === 'data-url' && qrResult.qrUrl.startsWith('data:')) {
      const base64Data = qrResult.qrUrl.split(',')[1];
      const imageBuffer = Buffer.from(base64Data, 'base64');
      res.set('Content-Type', 'image/png');
      res.set('Cache-Control', 'public, max-age=86400');
      res.send(imageBuffer);
    } else {
      // Return as JSON with URL
      res.json({ qrUrl: qrResult.qrUrl });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * Delete a short URL
 * DELETE /api/urls/:shortCode
 */
router.delete('/:shortCode', async (req, res, next) => {
  try {
    const deleted = await deleteURL(req.params.shortCode);

    if (!deleted) {
      return res.status(404).json({
        error: 'URL not found',
      });
    }

    // Clear QR code cache
    await deleteQRCodeCache(req.params.shortCode);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
