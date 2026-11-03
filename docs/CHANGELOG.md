# 📝 Changelog: WorkTrack

All notable changes to the WorkTrack platform are documented in this file.  
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), adhering to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- Axios interceptor client (`src/services/apiClient.js`) linking React UI directly to DRF endpoints.
- WebSocket real-time live alert stream for high-risk CCTV anomaly broadcasts.
- Production deployment scripts for Ubuntu Linux / AWS EC2.

---

## [1.0.0-rc.1] - 2026-11-02

### Added
- **Complete Authentication & Authorization System:**
  - Implemented public registration API `POST /api/v1/auth/register/` strictly restricted to `EMPLOYEE` and `CUSTOMER` roles; rejects `ADMIN` with HTTP 400 Bad Request.
  - Automatically provisions `EmployeeProfile` (`EMP-XXXXXX`) or `CustomerProfile` (`CUST-XXXXXX`) upon registration.
  - Added secure password reset endpoints (`POST /api/v1/auth/password-reset/` & `POST /api/v1/auth/password-reset/confirm/`) with timing-resistant tokens and Django password validation.
  - Added user profile retrieval `GET /api/v1/auth/me/` and token blacklist logout `POST /api/v1/auth/logout/`.
  - Added in-app password change `POST /api/v1/auth/change-password/`.
- **Frontend Authentication Integration:**
  - Built `src/services/apiClient.js` with auto-refresh on 401 Unauthorized using SimpleJWT refresh rotation.
  - Built `src/components/common/ProtectedRoute.jsx` for client-side RBAC and unauthorized redirect protection.
  - Created `src/pages/auth/SignUp.jsx` supporting Employee and Customer onboarding with password strength validation.
  - Created `src/pages/auth/ForgotPassword.jsx` and `src/pages/auth/ResetPassword.jsx` with token decoding.
  - Updated `src/pages/auth/Login.jsx` with show/hide password, error alerts, and evaluator persona shortcuts.
  - Updated `src/App.jsx` with guarded `/admin/*`, `/employee/*`, and `/customer/*` routes.
- **Automated Test Suite Expansion:**
  - Added 15 new authentication and RBAC tests, bringing test suite to 34 passing tests (100% pass rate).

---

## [1.0.0-beta.2] - 2026-11-02

### Added
- **Attendance Engine API:** `/api/v1/attendance/` with sequential check-in, duplicate prevention, and UTC duration calculation.
- **Daily Reports & Version Snapshots API:** `/api/v1/reports/` with automatic immutable `ReportVersion` creation on every update.
- **Hourly CCTV Surveillance API:** `/api/v1/surveillance/` with 10-camera batch inspection, AI telemetry, and operator verification.
- **Role Dashboards:** Admin KPI aggregations, Employee Roster feed, and Customer store feeds.
- **Automated Test Suite:** 19 automated tests in `backend/tests/` using `pytest` and `pytest-django`, achieving 100% pass rate.
- **OpenAPI 3.0 Documentation:** Interactive Swagger UI at `/api/v1/docs/` generated via `drf-spectacular`.

### Changed
- Configured decoupled database engine in `settings.py` supporting both PostgreSQL and SQLite.
- Added `joining_date` default to `EmployeeProfile` for zero-configuration testing.

---

## [1.0.0-beta.1] - 2026-10-31

### Added
- Initialized Django 5.1 project with 11 modular apps under `backend/apps/`.
- Created custom `User` model with email-based authentication and SimpleJWT integration.
- Applied database schema migrations across all 11 modules.
- Created management command `seed_demo_data` to initialize demo accounts (`admin@worktrack.demo`, `employee@worktrack.demo`, `customer@worktrack.demo`).

---

## [1.0.0-alpha.1] - 2026-10-30

### Added
- Completed 28 responsive React 19 frontend views covering Admin, Employee, and Customer dashboards.
- Implemented Tailwind CSS styling with dark theme accents, Recharts data visualization, and Lucide React icons.
- Built prototype state management using React Context API (`AuthContext`, `AppContext`) and LocalStorage fallback.

