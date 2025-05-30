// routes/errorHandler.js

function errorHandler(err, req, res, next) {
  console.error('❌ ERROR:', err.stack || err);

  res.status(500).json({
    success: false,
    message: 'Something went wrong. Please try again later.',
    error: process.env.NODE_ENV === 'development' ? (err.message || err) : undefined,
  });
}

module.exports = errorHandler;
