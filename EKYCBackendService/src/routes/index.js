const express = require('express');
const healthController = require('../controllers/health');
const authRoutes = require('./auth');

const router = express.Router();

// Health endpoints (both / and /health return the same)
router.get('/', healthController.check.bind(healthController));
router.get('/health', healthController.check.bind(healthController));

// Mount auth routes under /api/auth
router.use('/api/auth', authRoutes);

 // Validation route expected by tests
router.post('/api/validation/identifier', (req, res, next) => {
  // delegate to auth controller to avoid extra import here
  try {
    const authController = require('../controllers/auth');
    return authController.validateIdentifier(req, res);
  } catch (e) {
    return next(e);
  }
});

// Catch-all for unknown API routes to ensure JSON error (prevents HTML)
router.all(['/api/*', '/api'], (req, res) => {
  const hint =
    'If you see this from the frontend, confirm API_BASE_URL points to the backend (e.g., http://localhost:3001), not the React dev server.';
  return res.status(404).json({
    success: false,
    error: 'not_found',
    path: req.originalUrl || req.url,
    hint
  });
});

/**
 * Temporary: route map for debugging registered endpoints.
 * Lists method and path for each route registered on the app.
 * Remove this once verification is complete.
 */
router.get('/debug/routes', (req, res) => {
  const app = req.app;
  const routes = [];

  function parseStack(stack, prefix = '') {
    stack.forEach((layer) => {
      if (layer.route && layer.route.path) {
        const methods = Object.keys(layer.route.methods)
          .filter((m) => layer.route.methods[m])
          .map((m) => m.toUpperCase());
        routes.push({
          methods,
          path: `${prefix}${layer.route.path}`.replace(/\/+/g, '/'),
        });
      } else if (layer.name === 'router' && layer.handle && layer.regexp) {
        // Extract mount path from layer.regexp if possible
        const match = layer.regexp.toString().match(/\\\/(.*?)\\\//);
        const mount = match && match[1] ? `/${match[1]}` : '';
        if (layer.handle.stack) {
          parseStack(layer.handle.stack, `${prefix}${mount}`);
        }
      }
    });
  }

  if (app && app._router && app._router.stack) {
    parseStack(app._router.stack);
  }
  res.json({ count: routes.length, routes });
});

/**
 * @swagger
 * /:
 *   get:
 *     summary: Health endpoint (root)
 *     responses:
 *       200:
 *         description: Service health check passed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 message:
 *                   type: string
 *                   example: Service is healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 environment:
 *                   type: string
 *                   example: development
 * /health:
 *   get:
 *     summary: Health endpoint
 *     responses:
 *       200:
 *         description: Service health check passed
 */
/**
 * PUBLIC_INTERFACE
 * Export the main router that mounts:
 * - GET / and GET /health for health checks
 * - /api/auth/* for authentication and OTP
 * - /api/validation/identifier for simple validation
 * Includes /debug/routes for route introspection
 */
module.exports = router;
