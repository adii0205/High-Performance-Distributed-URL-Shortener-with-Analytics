/**
 * Error handling middleware
 */
function errorHandler(err, req, res, next) {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Validation errors
  if (err.isJoi) {
    return res.status(400).json({
      error: 'Validation error',
      details: err.details?.map(d => ({
        field: d.path.join('.'),
        message: d.message,
      })),
    });
  }

  // Custom app errors
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      error: err.message,
    });
  }

  // Database errors
  if (err.code === '23505') { // Unique constraint
    return res.status(409).json({
      error: 'Resource already exists',
    });
  }

  if (err.code === '23503') { // Foreign key constraint
    return res.status(400).json({
      error: 'Referenced resource does not exist',
    });
  }

  // Default error
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
}

module.exports = errorHandler;
