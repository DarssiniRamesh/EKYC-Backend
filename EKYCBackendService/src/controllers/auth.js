'use strict';

/**
 * Controller: Auth OTP and basic auth endpoints
 * Implements Twilio-backed SMS OTP with PostgreSQL persistence.
 */

const { sendSms, maskMobileForLog } = require('../services/twilioSms');
const { generateOtp, hashOtp, verifyOtp, nextAllowedIn, maskMobileForUser } = require('../services/otp');
const { Pool } = require('pg');

// DB Pool using environment variables (must be provided by orchestrator via .env)
const pgPool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  // Alternatively use discrete vars if URL not provided:
  // user: process.env.POSTGRES_USER,
  // password: process.env.POSTGRES_PASSWORD,
  // host: process.env.POSTGRES_HOST,
  // port: Number(process.env.POSTGRES_PORT),
  // database: process.env.POSTGRES_DB,
});

// Env-configured OTP settings with defaults
const OTP_TTL_SECONDS = Number(process.env.OTP_TTL_SECONDS || 300);
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 5);
const OTP_RESEND_WINDOW_SECONDS = Number(process.env.OTP_RESEND_WINDOW_SECONDS || 60);
const NODE_ENV = process.env.NODE_ENV || 'development';

// Helpers
function isTenDigitMobile(mobile) {
  return typeof mobile === 'string' && /^[0-9]{10}$/.test(mobile);
}
function isSixDigitOtp(otp) {
  return typeof otp === 'string' && /^[0-9]{6}$/.test(otp);
}
function isValidEmail(email) {
  // simplistic validation
  return typeof email === 'string' && email.length <= 50 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Utility to generate a simple request ID for tracing,
 * not cryptographically secure; used only for logs.
 */
// PUBLIC_INTERFACE
function genRequestId() {
  /** Generate simple request id for tracing (public utility). */
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 8);
  return `req_${ts}_${rnd}`;
}

/**
 * Normalize Indian 10-digit to E164 +91 format
 */
function toE164India(mobile10) {
  return `+91${mobile10}`;
}

/**
 * Upsert or insert a new OTP record for mobile.
 * We keep a new row per request; verification works on the latest active, unless requestId provided.
 */
async function createOrUpdateOtpRecord(client, mobile10, opts = {}) {
  const requestId = opts.requestId;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_TTL_SECONDS * 1000);
  const otp = generateOtp(6);
  const { hash, salt } = hashOtp(otp);

  // Insert a fresh record (do not reuse consumed/expired). Keep attempts at 0.
  const sql = `
    INSERT INTO otp_verifications (mobile, otp_hash, salt, expires_at, attempts, max_attempts, last_sent_at, resend_count, request_id)
    VALUES ($1, $2, $3, $4, 0, $5, $6, COALESCE(
      (SELECT COALESCE(ov.resend_count,0) FROM otp_verifications ov
       WHERE ov.mobile=$1 AND ov.consumed_at IS NULL
       ORDER BY ov.created_at DESC
       LIMIT 1), 0) + 1, COALESCE($7, gen_random_uuid()))
    RETURNING id, request_id, last_sent_at, expires_at, attempts, max_attempts, resend_count
  `;
  const params = [mobile10, hash, salt, expiresAt, OTP_MAX_ATTEMPTS, now, requestId || null];
  const { rows } = await client.query(sql, params);
  const row = rows[0];

  return {
    otp, // return plaintext to caller (controller) to send SMS; DO NOT LOG
    id: row.id,
    requestId: row.request_id,
    lastSentAt: now,
    expiresAt: expiresAt,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    resendCount: row.resend_count,
  };
}

/**
 * Get latest active OTP record for a mobile (optionally by requestId)
 */
async function getActiveOtpRecord(client, mobile10, requestId) {
  let sql = `
    SELECT id, mobile, otp_hash, salt, expires_at, attempts, max_attempts, consumed_at, last_sent_at, resend_count, request_id, created_at
    FROM otp_verifications
    WHERE mobile=$1 AND consumed_at IS NULL AND expires_at > NOW()
  `;
  const params = [mobile10];
  if (requestId) {
    sql += ' AND request_id=$2';
    params.push(requestId);
  }
  sql += ' ORDER BY created_at DESC LIMIT 1';
  const { rows } = await client.query(sql, params);
  return rows[0] || null;
}

/**
 * Update attempts on failure (and optionally lock by consuming)
 */
async function incrementAttempts(client, id, attempts, maxAttempts) {
  const newAttempts = attempts + 1;
  const lockNow = newAttempts >= maxAttempts;
  const sql = lockNow
    ? 'UPDATE otp_verifications SET attempts=$1, consumed_at=NOW() WHERE id=$2'
    : 'UPDATE otp_verifications SET attempts=$1 WHERE id=$2';
  await client.query(sql, [newAttempts, id]);
  return { newAttempts, locked: lockNow };
}

/**
 * Mark OTP as consumed on success
 */
async function consumeOtp(client, id) {
  await client.query('UPDATE otp_verifications SET consumed_at=NOW() WHERE id=$1', [id]);
}

class AuthController {
  // PUBLIC_INTERFACE
  /** Send OTP to mobile (Twilio)
   * Request: { mobile: "9876543210" }
   * Response: 200 { success:true, requestId, expiresIn, nextResendIn, maskedMobile }
   * Errors:
   *   400 invalid input
   *   429 resend too soon { nextAllowedIn }
   */
  async sendMobileOtp(req, res) {
    const requestId = genRequestId();
    const { mobile } = req.body || {};
    if (!mobile) {
      return res.status(400).json({ success: false, error: 'mobile is required', requestId });
    }
    if (!isTenDigitMobile(mobile)) {
      return res.status(400).json({ success: false, error: 'mobile must be 10 digits', requestId });
    }

    const client = await pgPool.connect();
    try {
      // Rate limit: check last active record
      const existing = await getActiveOtpRecord(client, mobile);
      let waitSec = 0;
      if (existing && existing.last_sent_at) {
        waitSec = nextAllowedIn(new Date(existing.last_sent_at), OTP_RESEND_WINDOW_SECONDS);
      }
      if (waitSec > 0) {
        return res.status(429).json({
          success: false,
          error: 'resend_not_allowed_yet',
          nextAllowedIn: waitSec,
          requestId,
        });
      }

      // Create new OTP record
      const created = await createOrUpdateOtpRecord(client, mobile, { requestId });
      const e164 = toE164India(mobile);
      const body = `Your OTP is ${created.otp}. It expires in ${Math.floor(
        OTP_TTL_SECONDS / 60
      )} minutes. Do not share.`;

      // Send via Twilio
      await sendSms(e164, body, { requestId });

      // Update last_sent_at (already set via insert), compute response values
      const nextResendIn = OTP_RESEND_WINDOW_SECONDS;
      const expiresIn = OTP_TTL_SECONDS;
      const maskedMobile = maskMobileForUser(mobile);

      const response = {
        success: true,
        requestId: created.requestId,
        expiresIn,
        nextResendIn,
        maskedMobile,
      };

      // Never log OTP/plaintext
      console.log('[auth.sendMobileOtp] success', {
        requestId,
        to: maskMobileForLog(e164),
        recordId: created.id,
      });

      return res.status(200).json(response);
    } catch (e) {
      // Normalize Twilio/Config errors to JSON
      let status = 500;
      let errorCode = 'otp_send_failed';
      if (e.code === 'CONFIG_MISSING') {
        errorCode = 'twilio_config_missing';
      } else if (typeof e.status === 'number' && e.status >= 400) {
        status = e.status;
      }
      console.error('[auth.sendMobileOtp] error', {
        requestId,
        code: e.code,
        status,
        message: e.message
      });
      return res.status(status).type('application/json').json({
        success: false,
        error: errorCode,
        requestId
      });
    } finally {
      client.release();
    }
  }

  // PUBLIC_INTERFACE
  /** Verify mobile OTP
   * Request: { mobile: "9876543210", otp: "123456", requestId?: "uuid" }
   * Responses:
   *   200 { success:true, verified:true }
   *   400 validation errors
   *   410 expired
   *   423 locked (max attempts)
   */
  async verifyMobileOtp(req, res) {
    const { mobile, otp, requestId } = req.body || {};
    if (!mobile || !otp) {
      return res.status(400).json({ success: false, error: 'mobile and otp are required' });
    }
    if (!isTenDigitMobile(mobile)) {
      return res.status(400).json({ success: false, error: 'mobile must be 10 digits' });
    }
    if (!isSixDigitOtp(otp)) {
      return res.status(400).json({ success: false, error: 'otp must be 6 digits' });
    }

    const client = await pgPool.connect();
    try {
      const record = await getActiveOtpRecord(client, mobile, requestId);
      if (!record) {
        // Determine if expired or not found
        // Check latest record regardless of expiry to tailor message
        const { rows } = await client.query(
          'SELECT expires_at, consumed_at FROM otp_verifications WHERE mobile=$1 ORDER BY created_at DESC LIMIT 1',
          [mobile]
        );
        if (rows[0]?.expires_at && new Date(rows[0].expires_at) < new Date()) {
          return res.status(410).type('application/json').json({ success: false, error: 'otp_expired' });
        }
        return res.status(400).type('application/json').json({ success: false, error: 'otp_not_found' });
      }

      // Check attempts
      if (record.attempts >= record.max_attempts) {
        return res.status(423).type('application/json').json({ success: false, error: 'max_attempts_reached' });
      }

      // Check expiry
      if (new Date(record.expires_at) <= new Date()) {
        return res.status(410).type('application/json').json({ success: false, error: 'otp_expired' });
      }

      // Verify
      const ok = verifyOtp(otp, record.otp_hash, record.salt);
      if (!ok) {
        const { newAttempts, locked } = await incrementAttempts(client, record.id, record.attempts, record.max_attempts);
        if (locked) {
          return res.status(423).type('application/json').json({ success: false, error: 'max_attempts_reached' });
        }
        return res.status(400).type('application/json').json({ success: false, error: 'otp_incorrect', attempts: newAttempts });
      }

      // Success: consume
      await consumeOtp(client, record.id);
      console.log('[auth.verifyMobileOtp] success', { mobileMasked: maskMobileForUser(mobile) });
      return res.status(200).type('application/json').json({ success: true, verified: true });
    } catch (e) {
      console.error('[auth.verifyMobileOtp] error', { message: e.message, code: e.code });
      return res.status(500).type('application/json').json({ success: false, error: 'otp_verify_failed' });
    } finally {
      client.release();
    }
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
