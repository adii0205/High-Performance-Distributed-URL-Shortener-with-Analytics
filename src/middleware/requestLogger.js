/**
 * Request logging middleware
 */
function requestLogger(req, res, next) {
  const startTime = Date.now();

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });
  });

  next();
}

module.exports = requestLogger;
