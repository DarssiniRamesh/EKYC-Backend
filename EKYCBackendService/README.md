# EKYC Backend Service

Twilio-backed SMS OTP with PostgreSQL persistence.

Start the API locally:
- npm install
- npm start            # starts on PORT (defaults to 3001)
- npm run dev          # starts with nodemon, defaults to 3001

Health check:
- http://localhost:3001/health
- http://localhost:3001/

Swagger docs:
- http://localhost:3001/docs
- http://localhost:3001/openapi.json

Temporary debug (for route verification during setup):
- http://localhost:3001/debug/routes  # lists all registered routes

Common issue: Unexpected token '<' "<!DOCTYPE..." is not valid JSON
- This happens if the frontend calls http://localhost:3000/api/... (React dev server) instead of backend.
- Ensure API_BASE_URL points to http://localhost:3001 (or your deployed backend URL).
- All unknown API paths return JSON { success:false, error:'not_found' } to avoid HTML fallbacks.

## Environment variables

Copy .env.example to .env and populate secrets (the orchestrator will mount them):

Required for DB:
- POSTGRES_URL OR (POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_HOST, POSTGRES_PORT)

Required for Twilio:
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_FROM_NUMBER       # E164, e.g. +1XXXXXXXXXX

OTP config (optional overrides):
- OTP_TTL_SECONDS=300
- OTP_MAX_ATTEMPTS=5
- OTP_RESEND_WINDOW_SECONDS=60

Server:
- PORT=3001

## Database migration

Run this SQL on your PostgreSQL instance before using OTP APIs:

- File: src/db/migrations/001_create_otp_verifications.sql

Example using psql:
psql "$POSTGRES_URL" -f src/db/migrations/001_create_otp_verifications.sql

This creates:
- otp_verifications table
- indexes on (mobile), (expires_at)
- partial index for active (unconsumed, unexpired) rows
- uses extension pgcrypto for UUIDs

## API: Mobile OTP

Send OTP:
POST /api/auth/otp/mobile/send
Body: { "mobile": "9876543210" }
Response 200:
{
  "success": true,
  "requestId": "uuid",
  "expiresIn": 300,
  "nextResendIn": 60,
  "maskedMobile": "******10"
}

Verify OTP:
POST /api/auth/otp/mobile/verify
Body: { "mobile": "9876543210", "otp": "123456", "requestId": "uuid" }
Response 200:
{ "success": true, "verified": true }

Failure codes:
- 400 invalid input / otp_incorrect
- 410 otp_expired
- 423 max_attempts_reached
- 429 resend_not_allowed_yet (send endpoint), includes nextAllowedIn

Example cURL:
- curl -i -X POST http://localhost:3001/api/auth/otp/mobile/send \
    -H 'Content-Type: application/json' \
    -d '{"mobile":"9876543210"}'
- curl -i -X POST http://localhost:3001/api/auth/otp/mobile/verify \
    -H 'Content-Type: application/json' \
    -d '{"mobile":"9876543210","otp":"123456","requestId":"<uuid from send>"}'

## CORS

CORS is enabled with origin="*". Adjust in src/app.js for stricter environments.

## Security notes

- OTP is never logged or returned (except within SMS body to the user).
- Logs include only requestId and masked mobile.
- Ensure .env is not committed. Secrets are provided at runtime.
- Consider scheduled job to purge expired rows.

## Tests

Run API tests with:
- npm run test:api
- npm run test:api:ci
