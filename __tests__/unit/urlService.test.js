/**
 * Unit tests for URL shortening service
 */

const { generateUniqueShortCode, getURLByShortCode } = require('../../src/services/urlService');

describe('URL Service', () => {
  describe('generateUniqueShortCode', () => {
    it('should generate a short code', async () => {
      const shortCode = generateUniqueShortCode(1);
      expect(shortCode).toBeDefined();
      expect(shortCode.length).toBeGreaterThanOrEqual(6);
    });

    it('should generate different codes for different ids', () => {
      const code1 = generateUniqueShortCode(1);
      const code2 = generateUniqueShortCode(2);
      expect(code1).not.toEqual(code2);
    });
  });

  describe('getURLByShortCode', () => {
    it('should handle non-existent codes', async () => {
      const result = await getURLByShortCode('nonexistent');
      expect(result).toBeNull();
    });
  });
});
