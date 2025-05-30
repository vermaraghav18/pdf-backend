const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Configure logging
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: path.join(__dirname, '../logs/requests-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      level: 'info'
    }),
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    })
  ]
});

// Production request logger middleware
module.exports = (req, res, next) => {
  const startTime = process.hrtime();
  
  res.on('finish', () => {
    const duration = process.hrtime(startTime);
    const responseTimeMs = (duration[0] * 1e3 + duration[1] * 1e-6).toFixed(2);
    
    logger.info({
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      responseTime: `${responseTimeMs}ms`,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      referrer: req.headers['referer'] || '',
      contentType: res.get('Content-Type')
    });
  });

  next();
};