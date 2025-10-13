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
module.exports = router;
