-- otp_verifications table to store mobile OTP lifecycle
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS otp_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile VARCHAR(15) NOT NULL,                              -- store 10-digit or E164 if needed
  otp_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  consumed_at TIMESTAMPTZ NULL,
  last_sent_at TIMESTAMPTZ NULL,
  resend_count INT NOT NULL DEFAULT 0,
  request_id UUID NOT NULL DEFAULT gen_random_uuid()
);

-- common lookups
CREATE INDEX IF NOT EXISTS idx_otp_mobile ON otp_verifications (mobile);
CREATE INDEX IF NOT EXISTS idx_otp_expires_at ON otp_verifications (expires_at);

-- partial index for active records (not consumed and not expired)
CREATE INDEX IF NOT EXISTS idx_otp_active ON otp_verifications (mobile, created_at DESC)
  WHERE consumed_at IS NULL AND expires_at > NOW();

-- housekeeping/hint: optionally remove expired entries with a scheduled job (not part of migration)
