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

Run API tests with:
- npm run test:api
- npm run test:api:ci

These tests are expected to fail until endpoints are implemented per the acceptance criteria.
