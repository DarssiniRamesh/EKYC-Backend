'use strict';

/**
 * Twilio SMS sending service.
 * Uses environment variables for configuration.
 *
 * Required env:
 * - TWILIO_ACCOUNT_SID
 * - TWILIO_AUTH_TOKEN
 * - TWILIO_FROM_NUMBER
 *
 * Notes:
 * - Never log OTP or message bodies. Only log requestId and destination masked.
 */

const twilio = require('twilio');

// PUBLIC_INTERFACE
/**
 * Send SMS via Twilio
 * @param {string} to E164 formatted mobile number (e.g., +919876543210)
 * @param {string} body Message body (Do not include secrets in logs)
 * @param {object} options Optional tracing object { requestId?: string }
 * @returns {Promise<{sid:string,to:string,status:string}>}
 */
async function sendSms(to, body, options = {}) {
  /** This function sends an SMS using Twilio. */
  const { requestId } = options;
  const {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_FROM_NUMBER,
  } = process.env;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    const err = new Error('Twilio environment not configured');
    err.code = 'CONFIG_MISSING';
    throw err;
  }

  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

  // Mask recipient for logs
  const masked = maskMobileForLog(to);
  try {
    const msg = await client.messages.create({
      body,
      to,
      from: TWILIO_FROM_NUMBER,
    });
    console.log('[twilioSms] sent', { requestId, to: masked, sid: msg.sid, status: msg.status });
    return { sid: msg.sid, to, status: msg.status };
  } catch (e) {
    console.error('[twilioSms] send failed', { requestId, to: masked, code: e.code, message: e.message });
    throw e;
  }
}

/**
 * Mask mobile for logs (keep last 2 digits)
 */
function maskMobileForLog(m) {
  if (!m) return '';
  const s = String(m);
  const last2 = s.slice(-2);
  return s.replace(/.(?=.{2})/g, '*').replace(/\+/g, '+');
}

module.exports = {
  sendSms,
  maskMobileForLog,
};
