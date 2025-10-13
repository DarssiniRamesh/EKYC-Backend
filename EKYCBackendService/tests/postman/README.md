# Epic 126321 - Backend API Tests (Postman/Newman)

Collection: tests/postman/ekyc_auth_collection.json
Environment: tests/postman/environments/local.postman_environment.json

Run with Newman:
- npx newman run tests/postman/ekyc_auth_collection.json -e tests/postman/environments/local.postman_environment.json
- CI example:
  npx newman run tests/postman/ekyc_auth_collection.json -e tests/postman/environments/local.postman_environment.json --reporters cli,junit --reporter-junit-export newman-report.xml

These tests intentionally expect 200 and specific bodies; they will fail until endpoints are implemented per:
kavia-docs/TestCases_Epic_126321_User_Registration_and_Authentication.md
