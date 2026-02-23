/**
 * Prometheus metrics middleware for monitoring
 * Tracks request rates, latencies, and application-specific metrics
 */

const client = require('prom-client');

// Create a Registry
const register = new client.Registry();

// Default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.1, 5, 15, 50, 100, 500],
  registers: [register]
});

const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [register]
});

const urlsShortenedTotal = new client.Counter({
  name: 'urls_shortened_total',
  help: 'Total number of URLs shortened',
  registers: [register]
});

const redirectsTotal = new client.Counter({
  name: 'redirects_total',
  help: 'Total number of redirects served',
  registers: [register]
});

const cacheHits = new client.Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type'],
  registers: [register]
});

const cacheMisses = new client.Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type'],
  registers: [register]
});

const activeRequests = new client.Gauge({
  name: 'http_active_requests',
  help: 'Number of active HTTP requests',
  labelNames: ['method', 'path'],
  registers: [register]
});

const databaseConnections = new client.Gauge({
  name: 'database_connections',
  help: 'Number of active database connections',
  registers: [register]
});

const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_ms',
  help: 'Duration of database queries in ms',
  labelNames: ['query_type'],
  buckets: [0.1, 5, 15, 50, 100, 500],
  registers: [register]
});

// Middleware function
const prometheusMetrics = (req, res, next) => {
  const start = Date.now();
  const path = req.path;
  const method = req.method;

  // Track active requests
  activeRequests.inc({ method, path });

  // Capture response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;

    // Record metrics
    httpRequestDuration.observe({ method, path, status }, duration);
    httpRequestTotal.inc({ method, path, status });
    activeRequests.dec({ method, path });

    // Track specific routes
    if (path.includes('/api/urls') && method === 'POST') {
      urlsShortenedTotal.inc();
    }
    if (path.match(/^\/[a-zA-Z0-9]+$/)) {
      redirectsTotal.inc();
    }
  });

  next();
};

// Metrics endpoint handler
const metricsEndpoint = async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).end(error);
  }
};

module.exports = {
  prometheusMetrics,
  metricsEndpoint,
  register,
  // Export metric objects for direct usage
  httpRequestDuration,
  httpRequestTotal,
  urlsShortenedTotal,
  redirectsTotal,
  cacheHits,
  cacheMisses,
  activeRequests,
  databaseConnections,
  dbQueryDuration
};
