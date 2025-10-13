'use strict';

/**
 * Controller: Auth OTP and basic auth stubs
 * Note: Minimal TDD-friendly stub implementation for frontend/Cypress integration.
 */

// Helpers
function isTenDigitMobile(mobile) {
  return typeof mobile === 'string' && /^[0-9]{10}$/.test(mobile);
}
function isSixDigitOtp(otp) {
  return typeof otp === 'string' && /^[0-9]{6}$/.test(otp);
}
function isValidEmail(email) {
  // simplistic validation for stub; frontend will apply stronger checks
  return typeof email === 'string' && email.length <= 50 && /^[^\s@]+@^[^\s@]+\.[^\s@]+$/.test ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) : (/^[^\s@]+@[^\s@]+\.[^\s@]+$/).test(email);
}

/**
 * Utility to generate a simple request ID for tracing,
 * not cryptographically secure; used only for temporary logs.
 */
function genRequestId() {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 8);
  return `req_${ts}_${rnd}`;
}

class AuthController {
  // PUBLIC_INTERFACE
  /** Send OTP to mobile (stub)
   * Request: { mobile: "9876543210" }
   * Response: 200 { success: true, message: 'OTP sent', requestId?: string }
   * Errors: 400 { success:false, error:'...' }
   */
  sendMobileOtp(req, res) {
    const requestId = genRequestId();
    const path = `${req.method} ${req.originalUrl || req.url}`;
    const headers = {
      'content-type': req.get('content-type'),
      origin: req.get('origin'),
      referer: req.get('referer'),
    };

    console.log('[auth.sendMobileOtp] inbound', { requestId, path, headers });
    console.log('[auth.sendMobileOtp] body', req.body);

    const { mobile } = req.body || {};
    if (!mobile) {
      console.warn('[auth.sendMobileOtp] validation failed: mobile missing', { requestId });
      return res.status(400).json({ success: false, error: 'mobile is required', requestId });
    }
    if (!isTenDigitMobile(mobile)) {
      console.warn('[auth.sendMobileOtp] validation failed: not 10 digits', { requestId, mobile });
      return res.status(400).json({ success: false, error: 'mobile must be 10 digits', requestId });
    }

    // Stub path: pretend OTP has been sent via provider
    const responseBody = { success: true, message: 'OTP sent', requestId };
    console.log('[auth.sendMobileOtp] success response', { requestId, responseBody });
    return res.status(200).json(responseBody);
  }

  // PUBLIC_INTERFACE
  /** Verify mobile OTP (stub)
   * Request: { mobile: "9876543210", otp: "123456" }
   * Response: 200 { success: true, message: 'OTP verified', verified: true }
   */
  verifyMobileOtp(req, res) {
    const { mobile, otp } = req.body || {};
    if (!mobile || !otp) {
      return res.status(400).json({ success: false, error: 'mobile and otp are required' });
    }
    if (!isTenDigitMobile(mobile)) {
      return res.status(400).json({ success: false, error: 'mobile must be 10 digits' });
    }
    if (!isSixDigitOtp(otp)) {
      return res.status(400).json({ success: false, error: 'otp must be 6 digits' });
    }
    return res.status(200).json({ success: true, message: 'OTP verified', verified: true });
  }

  // PUBLIC_INTERFACE
  /** Send OTP to email (stub)
   * Request: { email: "user@example.com" }
   * Response: 200 { success: true }
   */
  sendEmailOtp(req, res) {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ success: false, error: 'email is required' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, error: 'invalid email' });
    }
    return res.status(200).json({ success: true });
  }

  // PUBLIC_INTERFACE
  /** Verify email OTP (stub)
   * Request: { email: "user@example.com", otp: "123456" }
   * Response: 200 { success: true, verified: true }
   */
  verifyEmailOtp(req, res) {
    const { email, otp } = req.body || {};
    if (!email || !otp) {
      return res.status(400).json({ success: false, error: 'email and otp are required' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, error: 'invalid email' });
    }
    if (!isSixDigitOtp(otp)) {
      return res.status(400).json({ success: false, error: 'otp must be 6 digits' });
    }
    return res.status(200).json({ success: true, verified: true });
  }

  // The following are placeholders to satisfy Postman suite items later.

  // PUBLIC_INTERFACE
  /** Register password (stub) */
  registerPassword(req, res) {
    const { identifier, password } = req.body || {};
    if (!identifier || !password) {
      return res.status(400).json({ success: false, error: 'identifier and password are required' });
    }
    return res.status(200).json({ created: true });
  }

  // PUBLIC_INTERFACE
  /** Login (stub) */
  login(req, res) {
    const { identifier, password } = req.body || {};
    if (!identifier || !password) {
      return res.status(400).json({ success: false, error: 'identifier and password are required' });
    }
    return res.status(200).json({ token: 'stub-token' });
  }

  // PUBLIC_INTERFACE
  /** Password recovery request (stub) */
  requestRecovery(req, res) {
    const { identifier } = req.body || {};
    if (!identifier) {
      return res.status(400).json({ success: false, error: 'identifier is required' });
    }
    return res.status(200).json({ success: true });
  }

  // PUBLIC_INTERFACE
  /** Password reset (stub) */
  resetPassword(req, res) {
    const { token, password } = req.body || {};
    if (!token || !password) {
      return res.status(400).json({ success: false, error: 'token and password are required' });
    }
    return res.status(200).json({ success: true });
  }

  // PUBLIC_INTERFACE
  /** Identifier validation (stub) */
  validateIdentifier(req, res) {
    const { identifier } = req.body || {};
    if (!identifier) {
      return res.status(400).json({ success: false, error: 'identifier is required' });
    }
    return res.status(200).json({ valid: true });
  }
}

module.exports = new AuthController();
