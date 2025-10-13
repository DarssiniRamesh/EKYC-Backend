'use strict';

const crypto = require('crypto');

// PUBLIC_INTERFACE
/**
 * Generate an n-digit numeric OTP (default 6)
 * @param {number} digits number of digits
 * @returns {string}
 */
function generateOtp(digits = 6) {
  /** This is a public function to generate an OTP string. */
  const max = Math.pow(10, digits);
  const num = crypto.randomInt(0, max);
  return String(num).padStart(digits, '0');
}

/**
 * Hash OTP using sha256 with random salt
 * @param {string} otp
 * @returns {{hash:string,salt:string}}
 */
function hashOtp(otp) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = sha256(otp + ':' + salt);
  return { hash, salt };
}

/**
 * Verify plain OTP against stored hash+salt
 * @param {string} otp
 * @param {string} hash
 * @param {string} salt
 * @returns {boolean}
 */
function verifyOtp(otp, hash, salt) {
  const calc = sha256(otp + ':' + salt);
  // Constant-time compare
  return crypto.timingSafeEqual(Buffer.from(calc), Buffer.from(hash));
}

function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

// PUBLIC_INTERFACE
/**
 * Compute seconds until next allowed send based on lastSent and window seconds
 * @param {Date|null} lastSent
 * @param {number} windowSec
 * @returns {number} seconds remaining (>=0)
 */
function nextAllowedIn(lastSent, windowSec) {
  /** Public function that returns remaining seconds before next resend is allowed. */
  if (!lastSent) return 0;
  const now = Date.now();
  const diff = Math.floor((lastSent.getTime() + windowSec * 1000 - now) / 1000);
  return diff > 0 ? diff : 0;
}

// PUBLIC_INTERFACE
/**
 * Mask a 10-digit mobile for responses. Returns +91-XXXXXX12 (example).
 * @param {string} mobile10 ten-digit string
 * @returns {string}
 */
function maskMobileForUser(mobile10) {
  /** Public function to mask a mobile number for UI. */
  if (!mobile10 || mobile10.length < 2) return '**********';
  const last2 = mobile10.slice(-2);
  return `******${last2}`;
}

module.exports = {
  generateOtp,
  hashOtp,
  verifyOtp,
  nextAllowedIn,
  maskMobileForUser,
};
