/**
 * Integration tests for URL endpoints
 */

const request = require('supertest');
const express = require('express');
const urlRoutes = require('../../src/routes/urls');

const app = express();
app.use(express.json());
app.use('/api/urls', urlRoutes);

describe('URL Endpoints', () => {
  describe('POST /api/urls', () => {
    it('should reject invalid URLs', async () => {
      const response = await request(app)
        .post('/api/urls')
        .send({
          originalUrl: 'not-a-valid-url'
        });

      expect(response.status).toBe(400);
    });

    it('should require URL parameter', async () => {
      const response = await request(app)
        .post('/api/urls')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/urls/:shortCode', () => {
    it('should return 404 for non-existent code', async () => {
      const response = await request(app)
        .get('/api/urls/nonexistent');

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/urls/:shortCode', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/urls/test123');

      expect(response.status).toBe(401);
    });
  });
});
