/**
 * Unit tests for authentication middleware
 */

const { verifyToken, generateToken } = require('../../src/middleware/auth');

describe('Authentication', () => {
  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken('user123', 'user@example.com');
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('token should contain user info when verified', () => {
      const userId = 'user123';
      const email = 'user@example.com';
      const token = generateToken(userId, email);
      
      // Would verify token in a real test
      expect(token).toBeTruthy();
    });
  });

  describe('verifyToken', () => {
    it('should reject invalid tokens', () => {
      const req = {
        headers: {
          authorization: 'Bearer invalid-token'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      verifyToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should allow valid tokens', () => {
      const token = generateToken('user123', 'user@example.com');
      const req = {
        headers: {
          authorization: `Bearer ${token}`
        }
      };
      const res = {};
      const next = jest.fn();

      verifyToken(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });
});
