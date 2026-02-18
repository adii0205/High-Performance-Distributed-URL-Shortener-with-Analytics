# Quick Reference - Distributed URL Shortener

## 🚀 Quick Start (5 minutes)

### Windows
```batch
start.cmd
```

### Linux/Mac
```bash
chmod +x start.sh
./start.sh
```

or manually:
```bash
npm run docker:build
npm run docker:up
docker-compose exec app npm run migrate
```

## 📍 API Endpoints Reference

### Health Check
```bash
GET /health
GET /health/deep
```

### Create Short URL
```bash
POST /api/urls
Content-Type: application/json

{
  "originalUrl": "https://example.com/long/url",
  "customAlias": "mylink",          # optional
  "title": "My Title",               # optional
  "description": "Description",      # optional
  "expiresAt": "2026-12-31T23:59Z"  # optional
}

Response: 201 Created
{
  "id": 1,
  "shortCode": "a1b2c3",
  "shortURL": "http://localhost:3000/a1b2c3",
  ...
}
```

### Redirect (Main Endpoint - Must be <5ms)
```bash
GET /:shortCode

# Example
GET /a1b2c3
→ 301 redirect to original URL
→ Analytics tracked asynchronously
```

### Get Analytics
```bash
GET /api/analytics/:shortCode?startDate=2026-01-01&endDate=2026-02-01

Response:
{
  "summary": {
    "totalClicks": 42,
    "uniqueIPs": 12
  },
  "breakdown": {
    "byCountry": [...],
    "byDevice": [...],
    "byBrowser": [...],
    "byReferrer": [...]
  }
}
```

### Get URL Stats
```bash
GET /api/urls/:shortCode/stats

Response:
{
  "shortCode": "a1b2c3",
  "originalUrl": "https://example.com",
  "clickCount": 42,
  "uniqueIPs": 12,
  "lastClickAt": "2026-02-16T10:30:00Z"
}
```

### Delete URL
```bash
DELETE /api/urls/:shortCode
Response: 204 No Content
```

## 🧪 Testing

### Test API manually
```bash
chmod +x test-api.sh
./test-api.sh
```

### Test with curl
```bash
# Create URL
curl -X POST http://localhost:3000/api/urls \
  -H "Content-Type: application/json" \
  -d '{"originalUrl":"https://example.com"}'

# Redirect
curl -L http://localhost:3000/a1b2c3

# Analytics
curl http://localhost:3000/api/analytics/a1b2c3
```

### Load Testing
```bash
# Simple (requires abs - Apache Bench)
ab -n 1000 -c 10 http://localhost:3000/health

# Artillery (50K requests)
artillery quick --count 500 -n 50 http://localhost:3000
```

## 🔍 Monitoring

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f worker
```

### Database
```bash
# Access PostgreSQL
docker-compose exec postgres psql -U postgres -d url_shortener

# Check URLs
SELECT short_code, original_url, created_at FROM urls;

# Check analytics
SELECT * FROM analytics LIMIT 10;
```

### Redis
```bash
# Access Redis CLI
docker-compose exec redis redis-cli

# View cache keys
KEYS url:*

# Check queue
LLEN bull:analytics:*
```

## 📊 Performance Monitoring

### Cache Performance
```javascript
// LRU Cache Stats (from logs)
LRUCache {
  hits: 1000,
  misses: 50,
  hitRate: "95.24%",
  size: 45,
  maxSize: 100
}
```

### What each layer handles:
- **LRU Cache**: Top 100 URLs (<1ms)
- **Redis Cache**: Top 10K URLs (5-10ms)
- **PostgreSQL**: All URLs (50-200ms)

### Key Metrics to Track:
- **Redirect latency**: p95 < 5ms
- **Cache hit rate**: > 90%
- **Request throughput**: > 500 req/s
- **Analytics lag**: < 1s

## 🛠️ Configuration

Edit `.env` to change defaults:

```
# Server
PORT=3000

# Rate Limiting (per hour)
RATE_LIMIT_CREATE_URLS=100
RATE_LIMIT_REDIRECTS=1000

# Cache
CACHE_TTL_SECONDS=3600
LRU_CACHE_MAX_SIZE=100

# Short Codes
SHORT_CODE_LENGTH=6
```

## 🐳 Docker Commands

```bash
# Start all services
npm run docker:up

# Stop all services
npm run docker:down

# Rebuild images
npm run docker:build

# View status
docker-compose ps

# Run migrations
docker-compose exec app npm run migrate

# Execute command in service
docker-compose exec app <command>

# View service logs
docker-compose logs <service_name>

# Monitor real-time
docker-compose logs -f
```

## 📂 Key Files

| File | Purpose |
|------|---------|
| `src/index.js` | Main Express app |
| `src/services/urlService.js` | Core logic |
| `src/cache/lruCache.js` | In-memory cache |
| `src/cache/redisClient.js` | Redis pool |
| `src/db/migrations.js` | Database schema |
| `src/workers/analyticsWorker.js` | Background processor |
| `src/middleware/rateLimit.js` | Rate limiting |
| `docker-compose.yml` | Service config |

## 🔗 Important Concepts

### Base62 Encoding
- 56.8 billion unique codes with length 6
- 62 characters: 0-9, a-z, A-Z
- Collision resolution: auto-expand to length 8

### Two-Tier Caching
1. **LRU (In-memory)**: Keeps hottest 100 URLs
2. **Redis**: Keeps hot 10K URLs
3. **Database**: Source of truth

### Sliding Window Rate Limiting
- Uses Redis sorted sets
- Tracks requests per IP per endpoint
- More accurate than fixed windows

### Async Analytics
- Redirect returns immediately (<5ms)
- Analytics queued with Bull
- Worker processes in background
- Batch writes to database

## 🚨 Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 3000 in use | `lsof -i :3000` then kill process |
| Database won't connect | Restart: `docker-compose restart postgres` |
| Redis error | Restart: `docker-compose restart redis` |
| Analytics not recording | Check worker: `docker-compose ps worker` |
| Low cache hit rate | Increase `LRU_CACHE_MAX_SIZE` |
| Rate limiting too strict | Increase `RATE_LIMIT_*` values |

## 📈 Scaling Next Steps

1. **Database Optimization**: Add indexes (Phase 5)
2. **Load Balancing**: Run 3+ app instances behind Nginx (Phase 6)
3. **CDN**: Cache short URL redirects at edge
4. **Replication**: PostgreSQL replicas for read scaling
5. **Sharding**: Multiple databases by short code range

## 💡 Resume Takeaways

- **Caching**: Multi-tier strategy with LRU + Redis
- **Rate Limiting**: Sliding window algorithm
- **Databases**: Indexing, connection pooling, query optimization
- **Async**: Bull queues for background processing
- **Load Balancing**: Nginx, routing, health checks
- **Docker**: Multi-container orchestration
- **System Design**: Stateless, horizontally scalable

---

For detailed info, see README.md and DEVELOPMENT.md
