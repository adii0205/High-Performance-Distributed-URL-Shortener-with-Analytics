const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Distributed URL Shortener API',
      version: '2.0.0',
      description: 'High-performance URL shortener with authentication, analytics, and advanced features',
      contact: {
        name: 'API Support'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'http://localhost',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            userId: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            username: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        URL: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            short_code: { type: 'string' },
            original_url: { type: 'string', format: 'uri' },
            user_id: { type: 'string', format: 'uuid' },
            click_count: { type: 'integer' },
            created_at: { type: 'string', format: 'date-time' },
            expires_at: { type: 'string', format: 'date-time' }
          }
        },
        Analytics: {
          type: 'object',
          properties: {
            short_code: { type: 'string' },
            total_clicks: { type: 'integer' },
            unique_visitors: { type: 'integer' },
            countries: { type: 'object' },
            devices: { type: 'object' },
            browsers: { type: 'object' },
            hourly_data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  hour: { type: 'string', format: 'date-time' },
                  clicks: { type: 'integer' }
                }
              }
            }
          }
        }
      }
    }
  },
  apis: [
    './src/routes/auth.js',
    './src/routes/urls.js',
    './src/routes/analytics.js',
    './src/routes/redirect.js'
  ]
};

const specs = swaggerJsdoc(options);

module.exports = specs;
