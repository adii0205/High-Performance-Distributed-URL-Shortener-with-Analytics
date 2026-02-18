const redis = require('redis');

let redisClient;

async function initRedis() {
  redisClient = redis.createClient({
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
    },
    password: process.env.REDIS_PASSWORD || undefined,
    db: process.env.REDIS_DB || 0,
  });

  redisClient.on('error', (err) => {
    console.error('Redis error:', err);
  });

  redisClient.on('connect', () => {
    console.log('Connected to Redis');
  });

  await redisClient.connect();
  return redisClient;
}

function getRedis() {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
}

module.exports = {
  initRedis,
  getRedis,
};
