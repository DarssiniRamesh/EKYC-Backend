const app = require('./app');

/**
 * PUBLIC_INTERFACE
 * Starts the Express server.
 * - Respects process.env.PORT (defaults to 3001)
 * - Binds to 0.0.0.0 for container environments
 * - Logs a startup line with health URL
 */
const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  const base = `http://${HOST}:${PORT}`;
  console.log(`EKYC Backend Service running at ${base}`);
  console.log(`Health: ${base}/health or ${base}/`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = server;
