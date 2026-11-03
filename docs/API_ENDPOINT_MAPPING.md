# 🗺️ API Endpoint Mapping: Frontend-to-Backend Matrix

> **Purpose:** Traceability matrix correlating React.js components, user interactions, and UI actions to backend Django REST Framework endpoints.

---

## 1. Authentication & Session Endpoints

| Frontend Page / Component | User Action | HTTP | Backend Endpoint | Role | Payload / Parameters | Success Response | Business Validation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `src/pages/auth/Login.jsx` | Submits login credentials | `POST` | `/api/v1/auth/login/` | Public | `{"email", "password"}` | `{tokens: {access, refresh}, user}` | Verifies email & hashed password |
| `src/pages/auth/SignUp.jsx` | Self-registers as employee or customer | `POST` | `/api/v1/auth/register/` | Public | `{"full_name", "email", "password", "confirm_password", "role", "company_name"}` | `{message, tokens, user}` | Only Employee/Customer allowed; creates profile |
| `src/context/AuthContext.jsx` | Silent token refresh loop / on 401 | `POST` | `/api/v1/auth/refresh/` | Public | `{"refresh"}` | `{access, refresh}` | Validates refresh token signature & rotates |
| `src/context/AuthContext.jsx` | Clicks "Log Out" | `POST` | `/api/v1/auth/logout/` | Auth | `{"refresh"}` | `{detail}` | Blacklists refresh token |
| `src/context/AuthContext.jsx` | App initialization / hydration | `GET` | `/api/v1/auth/me/` | Auth | None (Bearer header) | `{id, email, fullName, role, ...}` | Returns active user and role profile |
| `src/pages/auth/ForgotPassword.jsx` | Submits recovery email | `POST` | `/api/v1/auth/password-reset/` | Public | `{"email"}` | `{detail}` | Generates reset token & dispatches email |
| `src/pages/auth/ResetPassword.jsx` | Submits new credentials | `POST` | `/api/v1/auth/password-reset/confirm/` | Public | `{"uid", "token", "new_password", "confirm_new_password"}` | `{detail}` | Validates token and updates password |
| `src/pages/employee/EmployeeProfile.jsx` | Updates password | `POST` | `/api/v1/auth/change-password/` | Auth | `{"old_password", "new_password", "confirm_new_password"}` | `{detail}` | Validates old password |

---

## 2. Administration & Master Data Endpoints

| Frontend Page / Component | User Action | HTTP | Backend Endpoint | Role | Payload / Parameters | Success Response | Business Validation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `src/pages/admin/AdminEmployees.jsx` | Reads employee list | `GET` | `/api/v1/employees/` | `ADMIN` | Query: `?search=`, `?page=` | Paginated `[EmployeeProfile]` | Admin role required |
| `src/pages/admin/AdminEmployees.jsx` | Adds new employee | `POST` | `/api/v1/employees/` | `ADMIN` | `{user: {email, password, ...}, employee_code, designation}` | Created `EmployeeProfile` | Enforces unique `email` & `employee_code` |
| `src/pages/admin/AdminEmployees.jsx` | Deactivates employee | `DELETE` | `/api/v1/employees/{id}/` | `ADMIN` | Path `id` | HTTP 204 No Content | Soft-deletes linked user (`is_active=False`) |
| `src/pages/admin/AdminCustomers.jsx` | Reads client stores | `GET` | `/api/v1/customers/` | `ADMIN` | Query: `?search=`, `?page=` | Paginated `[CustomerProfile]` | Admin role required |
| `src/pages/admin/AdminCustomers.jsx` | Registers client store | `POST` | `/api/v1/customers/` | `ADMIN` | `{user: {email, password}, customer_code, company_name, timezone}` | Created `CustomerProfile` | Enforces unique `customer_code` |
| `src/pages/admin/AdminAssignments.jsx`| Reads contract pairings | `GET` | `/api/v1/assignments/` | `ADMIN` | Query: `?status=ACTIVE` | Paginated `[Assignment]` | Admin role required |
| `src/pages/admin/AdminAssignments.jsx`| Pairs guard to store | `POST` | `/api/v1/assignments/` | `ADMIN` | `{employee: <id>, customer: <id>, notes}` | Created `Assignment` | Rejects duplicate active pairing |
| `src/pages/admin/AdminShifts.jsx` | Reads shift templates | `GET` | `/api/v1/shifts/templates/` | Auth | None | `[Shift]` | Read-only for non-admins |
| `src/pages/admin/AdminShifts.jsx` | Creates shift template | `POST` | `/api/v1/shifts/templates/` | `ADMIN` | `{name, start_time, end_time, is_overnight, color_tag}` | Created `Shift` | Validates time ranges |
| `src/pages/admin/AdminShifts.jsx` | Schedules shift | `POST` | `/api/v1/shifts/schedules/` | `ADMIN` | `{assignmentId, shiftId, shiftDate}` | Created `ShiftAssignment` | Assignment must be ACTIVE |

---

## 3. Attendance & Punch Clock Endpoints

| Frontend Page / Component | User Action | HTTP | Backend Endpoint | Role | Payload / Parameters | Success Response | Business Validation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `src/pages/employee/EmployeeAttendance.jsx` | Clicks "Punch In" | `POST` | `/api/v1/attendance/check_in/` | `EMPLOYEE` | `{shift_assignment_id, notes, location_verified}` | `Attendance` record | Rejects duplicate; must belong to user |
| `src/pages/employee/EmployeeAttendance.jsx` | Clicks "Punch Out" | `POST` | `/api/v1/attendance/check_out/` | `EMPLOYEE` | `{shift_assignment_id, notes}` | `Attendance` record | Requires check-in; cannot precede check-in |
| `src/pages/employee/EmployeeDashboard.jsx` | Loads punch banner | `GET` | `/api/v1/attendance/current/` | `EMPLOYEE` | None | `{active_shift, attendance, is_checked_in}` | Returns today's active shift status |
| `src/pages/admin/AdminAttendance.jsx` | Audits attendance | `GET` | `/api/v1/attendance/` | `ADMIN` | Query: `?shift_date=`, `?status=` | Paginated `[Attendance]` | Multi-tenant query filter |

---

## 4. Daily Reports, Versions & Feedback Endpoints

| Frontend Page / Component | User Action | HTTP | Backend Endpoint | Role | Payload / Parameters | Success Response | Business Validation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `src/pages/employee/DailyReportForm.jsx` | Drafts shift report | `POST` | `/api/v1/reports/` | `EMPLOYEE` | `{shift_assignment, title, work_summary, ...}` | `DailyReport` (v1) | Creates `ReportVersion` #1 automatically |
| `src/pages/employee/DailyReportForm.jsx` | Submits shift report | `POST` | `/api/v1/reports/{id}/submit/` | `EMPLOYEE` | None | `DailyReport` (SUBMITTED) | Sets `submitted_at`; snapshots version |
| `src/pages/employee/DailyReportForm.jsx` | Edits submitted report| `PATCH` | `/api/v1/reports/{id}/` | `EMPLOYEE` | `{title, work_summary, change_summary}` | `DailyReport` (v+1) | Auto-increments version; preserves JSON snapshot |
| `src/pages/customer/CustomerDailyReports.jsx`| Reads store reports | `GET` | `/api/v1/reports/` | `CUSTOMER` | Query: `?status=SUBMITTED` | `[DailyReport]` | Filtered strictly to client's store |
| `src/pages/common/ReportDetail.jsx` | Views version history | `GET` | `/api/v1/reports/{id}/versions/` | Auth | Path `id` | `[ReportVersion]` | Ordered by `version_number DESC` |
| `src/pages/common/ReportDetail.jsx` | Uploads photo/log | `POST` | `/api/v1/reports/{id}/attachments/` | Auth | Multipart: `file` | `ReportAttachment` | Max 10MB limit; validates MIME |
| `src/pages/customer/CustomerShiftWiseReports.jsx`| Compares shifts | `GET` | `/api/v1/reports/shift-wise/` | Auth | Query: `?date=YYYY-MM-DD` | Grouped shift reports | Side-by-side shift comparison |
| `src/components/reports/CommentThread.jsx` | Posts store feedback | `POST` | `/api/v1/feedback/comments/` | `CUSTOMER` | `{daily_report: <id>, content: "..."}` | `ReportComment` | Customer must own report |
| `src/components/reports/CommentThread.jsx` | Staff replies | `POST` | `/api/v1/feedback/comments/{id}/reply/` | `EMPLOYEE` | `{content: "..."}` | Nested `ReportComment` | Staff must be assigned to report |

---

## 5. Hourly CCTV Surveillance Endpoints

| Frontend Page / Component | User Action | HTTP | Backend Endpoint | Role | Payload / Parameters | Success Response | Business Validation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `src/pages/employee/HourlySurveillance.jsx` | Loads hourly batch | `GET` | `/api/v1/surveillance/batches/` | `EMPLOYEE` | Query: `?date=`, `?status=Ready for Review` | `[SurveillanceBatch]` | Batch contains 10 snapshots |
| `src/pages/employee/HourlySurveillance.jsx` | Audits camera frame | `PATCH` | `/api/v1/surveillance/snapshots/{id}/verify/`| `EMPLOYEE` | `{employee_verification, employee_notes}` | Updated `CameraSnapshot`| Operator overrides/verifies AI tag |
| `src/pages/employee/HourlySurveillance.jsx` | Submits 1-hr package | `POST` | `/api/v1/surveillance/batches/{id}/submit/` | `EMPLOYEE` | `{overall_assessment, actions_taken}` | `SurveillanceBatch` | Flags `customer_notified=True` |
| `src/pages/customer/CustomerSurveillance.jsx` | Store owner feed | `GET` | `/api/v1/surveillance/batches/` | `CUSTOMER` | Query: `?status=Submitted` | `[SurveillanceBatch]` | Filtered to client's store |

---

## 6. Notifications & Dashboard KPI Endpoints

| Frontend Page / Component | User Action | HTTP | Backend Endpoint | Role | Payload / Parameters | Success Response | Business Validation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `src/components/common/Header.jsx` | Notification bell | `GET` | `/api/v1/notifications/unread_count/` | Auth | None | `{"unread_count": 3}` | Counts where `read_at IS NULL` |
| `src/pages/customer/CustomerNotificationSettings.jsx`| Updates cadence | `PUT` | `/api/v1/notifications/preferences/my_preference/`| `CUSTOMER` | `{frequency: "6HOURS", immediate_alert_on_suspicious: true}` | `NotificationPreference` | Validates cadence choices |
| `src/pages/admin/AdminDashboard.jsx` | Renders Admin KPIs | `GET` | `/api/v1/dashboard/admin/` | `ADMIN` | None | `{kpis, weekly_trend, shift_distribution}` | Computes rates via database aggregations |
| `src/pages/employee/EmployeeDashboard.jsx`| Renders Guard Home | `GET` | `/api/v1/dashboard/employee/` | `EMPLOYEE` | None | `{today_shift, punch_status, today_report}` | Custom profile lookup |
| `src/pages/customer/CustomerDashboard.jsx`| Renders Client Home| `GET` | `/api/v1/dashboard/customer/` | `CUSTOMER` | None | `{assigned_staff_count, active_shifts, recent_reports}` | Client profile lookup |

