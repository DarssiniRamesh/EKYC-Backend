const express = require('express');
const authController = require('../controllers/auth');

const router = express.Router();

/**
 * Lightweight router-level logger for tracing during setup.
 * Logs method and path for each request hitting this router.
 * Remove after verification.
 */
router.use((req, res, next) => {
  console.log('[router:auth]', req.method, req.originalUrl || req.url);
  // Enforce JSON requests and responses for API routes
  res.type('application/json');
  next();
});

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: OTP and authentication routes
 */

/**
 * @swagger
 * /api/auth/otp/mobile/send:
 *   post:
 *     summary: Send OTP to mobile (stub)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mobile:
 *                 type: string
 *                 description: 10 digit mobile number
 *                 example: "9876543210"
 *     responses:
 *       200:
 *         description: OTP sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: OTP sent
 *       400:
 *         description: Invalid input
 */
router.post('/otp/mobile/send', authController.sendMobileOtp.bind(authController));

/**
 * @swagger
 * /api/auth/otp/mobile/verify:
 *   post:
 *     summary: Verify mobile OTP (stub)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mobile:
 *                 type: string
 *                 example: "9876543210"
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP verified
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: OTP verified
 *                 verified:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Invalid input
 */
router.post('/otp/mobile/verify', authController.verifyMobileOtp.bind(authController));

/**
 * @swagger
 * /api/auth/otp/email/send:
 *   post:
 *     summary: Send OTP to email (stub)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "user@example.com"
 *     responses:
 *       200:
 *         description: OTP sent (email)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Invalid input
 */
router.post('/otp/email/send', authController.sendEmailOtp.bind(authController));

/**
 * @swagger
 * /api/auth/otp/email/verify:
 *   post:
 *     summary: Verify email OTP (stub)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "user@example.com"
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP verified (email)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 verified:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Invalid input
 */
router.post('/otp/email/verify', authController.verifyEmailOtp.bind(authController));

/**
 * Additional stub endpoints referenced by Postman tests. These are included for completeness and may be expanded later.
 */

/**
 * @swagger
 * /api/auth/register/password:
 *   post:
 *     summary: Create password (stub)
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Password created
 */
router.post('/register/password', authController.registerPassword.bind(authController));

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login (stub)
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Login ok
 */
router.post('/login', authController.login.bind(authController));

/**
 * @swagger
 * /api/auth/password/recovery:
 *   post:
 *     summary: Password recovery request (stub)
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Recovery success
 */
router.post('/password/recovery', authController.requestRecovery.bind(authController));

/**
 * @swagger
 * /api/auth/password/reset:
 *   post:
 *     summary: Password reset (stub)
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Reset success
 */
router.post('/password/reset', authController.resetPassword.bind(authController));

/**
 * PUBLIC_INTERFACE
 * Export the authentication router which provides:
 * - POST /otp/mobile/send
 * - POST /otp/mobile/verify
 * - POST /otp/email/send
 * - POST /otp/email/verify
 * - POST /register/password
 * - POST /login
 * - POST /password/recovery
 * - POST /password/reset
 */
module.exports = router;
