const { gql } = require('apollo-server-express');
const pool = require('../db/pool').pool;
const { verifyToken } = require('../middleware/auth');

// GraphQL Type Definitions
const typeDefs = gql`
  type User {
    id: ID!
    email: String!
    username: String!
    createdAt: String!
    totalLinks: Int!
    totalClicks: Int!
  }

  type URL {
    id: ID!
    shortCode: String!
    originalUrl: String!
    userId: ID!
    clickCount: Int!
    createdAt: String!
    expiresAt: String
    qrCode: String
  }

  type Analytics {
    shortCode: String!
    totalClicks: Int!
    uniqueVisitors: Int!
    countries: [CountryStats!]!
    devices: [DeviceStats!]!
    browsers: [BrowserStats!]!
    hourlyData: [HourlyStats!]!
  }

  type CountryStats {
    country: String!
    clicks: Int!
  }

  type DeviceStats {
    device: String!
    clicks: Int!
  }

  type BrowserStats {
    browser: String!
    clicks: Int!
  }

  type HourlyStats {
    hour: String!
    clicks: Int!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Query {
    me: User
    user(id: ID!): User
    url(shortCode: String!): URL
    userLinks(limit: Int, offset: Int): [URL!]!
    urlAnalytics(shortCode: String!): Analytics
    topLinks(limit: Int): [URL!]!
  }

  type Mutation {
    register(email: String!, password: String!, username: String!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    createURL(originalUrl: String!, expiresAt: String): URL!
    deleteURL(shortCode: String!): Boolean!
    updateURL(shortCode: String!, expiresAt: String): URL!
  }
`;

// GraphQL Resolvers
const resolvers = {
  Query: {
    me: async (_, __, context) => {
      if (!context.user) throw new Error('Not authenticated');
      
      const result = await pool.query(
        `SELECT id, email, username, created_at,
                (SELECT COUNT(*) FROM urls WHERE user_id = $1) as total_links,
                (SELECT SUM(click_count) FROM urls WHERE user_id = $1) as total_clicks
         FROM users WHERE id = $1`,
        [context.user.userId]
      );

      return result.rows[0];
    },

    user: async (_, { id }) => {
      const result = await pool.query(
        'SELECT id, email, username, created_at FROM users WHERE id = $1',
        [id]
      );
      return result.rows[0];
    },

    url: async (_, { shortCode }) => {
      const result = await pool.query(
        'SELECT * FROM urls WHERE short_code = $1',
        [shortCode]
      );
      return result.rows[0];
    },

    userLinks: async (_, { limit = 10, offset = 0 }, context) => {
      if (!context.user) throw new Error('Not authenticated');

      const result = await pool.query(
        `SELECT * FROM urls 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2 OFFSET $3`,
        [context.user.userId, limit, offset]
      );
      return result.rows;
    },

    urlAnalytics: async (_, { shortCode }) => {
      const result = await pool.query(
        `SELECT short_code, SUM(click_count) as total_clicks
         FROM urls WHERE short_code = $1
         GROUP BY short_code`,
        [shortCode]
      );
      
      // Additional analytics data would be fetched from analytics table
      return result.rows[0];
    },

    topLinks: async (_, { limit = 10 }) => {
      const result = await pool.query(
        `SELECT * FROM urls 
         ORDER BY click_count DESC 
         LIMIT $1`,
        [limit]
      );
      return result.rows;
    }
  },

  Mutation: {
    register: async (_, { email, password, username }) => {
      // Implementation similar to user controller
      throw new Error('Use REST API for registration');
    },

    login: async (_, { email, password }) => {
      // Implementation similar to user controller
      throw new Error('Use REST API for login');
    },

    createURL: async (_, { originalUrl, expiresAt }, context) => {
      if (!context.user) throw new Error('Not authenticated');
      // Implementation here
      throw new Error('Use REST API for URL creation');
    },

    deleteURL: async (_, { shortCode }, context) => {
      if (!context.user) throw new Error('Not authenticated');
      // Implementation here
      return true;
    },

    updateURL: async (_, { shortCode, expiresAt }, context) => {
      if (!context.user) throw new Error('Not authenticated');
      // Implementation here
      return null;
    }
  }
};

module.exports = { typeDefs, resolvers };
