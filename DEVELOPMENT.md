# Development Guide - Distributed URL Shortener

## Getting Started

### 1. Initial Setup

```bash
# Copy environment file
cp .env.example .env

# Install dependencies
npm install
```

### 2. Running with Docker Compose (Recommended)

```bash
# Build images
npm run docker:build

# Start all services
npm run docker:up

# Run migrations
docker-compose exec app npm run migrate

# View logs
docker-compose logs -f app
docker-compose logs -f worker
docker-compose logs -f postgres
docker-compose logs -f redis

# Stop services
npm run docker:down
```

### 3. Local Development (Without Docker)

**Prerequisites:**
- PostgreSQL running locally (port 5432)
- Redis running locally (port 6379)

```bash
# Terminal 1: Start Express server
npm run dev

# Terminal 2: Start analytics worker
npm run worker
```

Update `.env`:
```
DB_HOST=localhost
REDIS_HOST=localhost
```

## File Structure

```
src/
├── index.js              # Main application entry
├── app.js                # Express app setup
├── cache/
│   ├── redisClient.js    # Redis connection pool
│   └── lruCache.js       # In-memory LRU cache (hot URLs)
├── db/
│   ├── pool.js           # PostgreSQL connection pool
│   └── migrations.js     # Database schema setup
├── middleware/
│   ├── errorHandler.js   # Express error middleware
│   ├── requestLogger.js  # Request logging
│   ├── rateLimit.js      # Sliding window rate limiter
│   └── validation.js     # Input validation (Joi)
├── routes/
│   ├── health.js         # Health check endpoints
│   ├── urls.js           # POST /api/urls (create)
│   ├── analytics.js      # GET /api/analytics/:code
│   └── redirect.js       # GET /:shortCode (main redirect)
├── services/
│   └── urlService.js     # Core business logic
├── utils/
│   └── base62.js         # Short code generation
└── workers/
    └── analyticsWorker.js # Background job processor
```

## API Testing

### Create a Short URL
```bash
curl -X POST http://localhost:3000/api/urls \
  -H "Content-Type: application/json" \
  -d '{
    "originalUrl": "https://www.example.com/very/long/url",
    "title": "Example Site",
    "customAlias": "example"
  }'
```

Response:
```json
{
  "id": 1,
  "shortCode": "a1b2c3",
  "originalUrl": "https://www.example.com/very/long/url",
  "shortURL": "http://localhost:3000/a1b2c3",
  "createdAt": "2026-02-16T..."
}
```

### Redirect (Test in Browser)
```
http://localhost:3000/a1b2c3
```

### Get Analytics
```bash
curl http://localhost:3000/api/analytics/a1b2c3
```

Response:
```json
{
  "shortCode": "a1b2c3",
  "summary": {
    "totalClicks": 42,
    "uniqueIPs": 12
  },
  "breakdown": {
    "byCountry": [
      {"country": "United States", "countryCode": "US", "clicks": 30},
      {"country": "Canada", "countryCode": "CA", "clicks": 10}
    ],
    "byDevice": [
      {"device": "desktop", "clicks": 32},
      {"device": "mobile", "clicks": 10}
    ],
    "byBrowser": [
      {"browser": "Chrome", "clicks": 25}
    ],
    "byReferrer": [...]
  }
}
```

### Get URL Statistics
```bash
curl http://localhost:3000/api/urls/a1b2c3/stats
```

### Health Check
```bash
curl http://localhost:3000/health
curl http://localhost:3000/health/deep
```

## Database

### Access PostgreSQL
```bash
# With Docker
docker-compose exec postgres psql -U postgres -d url_shortener

# Without Docker
psql -U postgres -d url_shortener -h localhost
```

### Useful Queries

```sql
-- List all URLs
SELECT short_code, original_url, created_at FROM urls LIMIT 10;

-- Get analytics for a URL
SELECT country_name, device_type, COUNT(*) as clicks
FROM analytics
WHERE short_code = 'a1b2c3'
GROUP BY country_name, device_type;

-- Top URLs by clicks
SELECT u.short_code, u.original_url, s.click_count
FROM urls u
LEFT JOIN analytics_summary s ON u.id = s.short_code_id
ORDER BY s.click_count DESC
LIMIT 10;

-- Cache performance
SELECT c.hit_rate, c.size FROM cache_stats c;
```

## Redis

### Monitor Redis
```bash
# With Docker
docker-compose exec redis redis-cli

# Commands
PING
KEYS url:*
GET url:a1b2c3
ZRANGE ratelimit:* 0 -1
```

## Performance Testing

### Artillery Load Testing
```bash
# Install globally
npm install -g artillery

# Run load test (500 users, 50 requests each)
artillery quick --count 500 -n 50 http://localhost:3000

# Advanced profile
artillery run --target http://localhost:3000 load-test.yml
```

### Simple Benchmark
```bash
# Create test URL
curl -X POST http://localhost:3000/api/urls \
  -H "Content-Type: application/json" \
  -d '{"originalUrl": "https://example.com"}'

# Benchmark redirects
ab -n 10000 -c 100 http://localhost:3000/a1b2c3
```

## Monitoring

### View Logs
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs -f app
docker-compose logs -f worker

# Real-time tail
docker-compose logs -f --tail=50
```

### Database Connections
```bash
# Check active connections
docker-compose exec postgres psql -U postgres -d url_shortener -c "SELECT count(*) FROM pg_stat_activity;"
```

### Redis Memory
```bash
docker-compose exec redis redis-cli INFO memory
```

### LRU Cache Stats
```bash
curl http://localhost:3000/api/debug/cache-stats
```

## Troubleshooting

### Port Already in Use
```bash
# Find process using port
lsof -i :3000
kill -9 <PID>
```

### Database Connection Error
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Restart
docker-compose restart postgres

# Check logs
docker-compose logs postgres
```

### Redis Connection Error
```bash
# Check Redis is running
docker-compose ps redis

# Restart
docker-compose restart redis

# Test connection
docker-compose exec redis redis-cli ping
```

### Analytics Not Recording
```bash
# Check worker is running
docker-compose ps worker

# Check queue jobs
docker-compose exec redis redis-cli LLEN bull:analytics:* 

# Restart worker
docker-compose restart worker
```

## Environment Variables

Key configurations in `.env`:

```
# Server
PORT=3000

# Database
DB_HOST=postgres
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=url_shortener

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Rate Limiting (requests per hour)
RATE_LIMIT_CREATE_URLS=100
RATE_LIMIT_REDIRECTS=1000

# Cache
CACHE_TTL_SECONDS=3600
LRU_CACHE_MAX_SIZE=100

# Short Codes
SHORT_CODE_LENGTH=6
```

## Next Steps

1. **Test Basic Flow**: Create URL → Click redirect → Check analytics
2. **Load Test**: Run artillery or ab to see performance
3. **Monitor**: Check cache hit rates and database query times
4. **Optimize**: Implement database indexes (Phase 5)
5. **Scale**: Add more app servers behind load balancer (Phase 6)

## Useful Commands

```bash
# Development
npm run dev              # Start server (watch mode)
npm run worker           # Start analytics worker
npm run migrate          # Run database migrations
npm test                 # Run tests

# Docker
npm run docker:build     # Build images
npm run docker:up        # Start services
npm run docker:down      # Stop services
docker-compose logs -f   # Follow logs

# Database
docker-compose exec postgres psql -U postgres -d url_shortener
docker-compose exec postgres pg_dump -U postgres url_shortener > backup.sql

# Redis
docker-compose exec redis redis-cli
docker-compose exec redis redis-cli FLUSHDB  # Clear cache
```

## Common Issues

**Issue**: Migrations fail to run
```bash
Solution: docker-compose exec app npm run migrate
```

**Issue**: Rate limiting too strict
```bash
Solution: Update .env RATE_LIMIT_* values and restart
```

**Issue**: Analytics not showing
```bash
Solution: Check worker is running: docker-compose ps worker
```

**Issue**: Cache hit rate is low
```bash
Solution: Increase LRU_CACHE_MAX_SIZE or CACHE_TTL_SECONDS
```
