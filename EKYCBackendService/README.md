# EKYC Backend Service

Test scaffolding for Epic 126321 is available in tests/postman.

Start the API locally:
- npm install
- npm start            # starts on PORT (defaults to 3001)
- npm run dev          # starts with nodemon, defaults to 3001

Health check:
- http://localhost:3001/health
- http://localhost:3001/

Swagger docs:
- http://localhost:3001/docs

Temporary debug (for route verification during setup):
- http://localhost:3001/debug/routes  # lists all registered routes

Quick cURL check for OTP route:
- curl -i -X POST http://localhost:3001/api/auth/otp/mobile/send \
    -H 'Content-Type: application/json' \
    -d '{"mobile":"9876543210"}'

CORS:
- CORS is enabled with origin="*". Adjust in src/app.js if needed for stricter environments.

DB readiness:
- No database tables are required for the current stub endpoints. This service can run without a DB for OTP/email/password placeholder routes. Future stories will introduce database integration and migrations.

Run API tests with:
- npm run test:api
- npm run test:api:ci

These tests are expected to fail until endpoints are implemented per the acceptance criteria.
