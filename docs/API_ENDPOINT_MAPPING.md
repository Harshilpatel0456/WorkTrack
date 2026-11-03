# 🗺️ API Endpoint Mapping: Frontend-to-Backend Matrix

> **Purpose:** Traceability matrix correlating React.js components, user interactions, and UI actions to backend Django REST Framework endpoints.
> **Integration status:** Phase 1 Admin employee, customer, and assignment workflows are connected to these APIs. Later workflow sections document available backend endpoints; they are not yet fully integrated into their frontend pages.

---

## 1. Authentication & Session Endpoints

| Frontend Page / Component | User Action | HTTP | Backend Endpoint | Role | Payload / Parameters | Success Response | Business Validation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `src/pages/auth/Login.jsx` | Submits login credentials | `POST` | `/api/v1/auth/login/` | Public | `{"email", "password"}` | `{access, refresh, user}` | Verifies email & hashed password |
| `src/pages/auth/SignUp.jsx` | Self-registers as employee or customer | `POST` | `/api/v1/auth/register/` | Public | `{"first_name", "last_name", "email", "password", "confirm_password", "role", "company_name"}` | `{message, access, refresh, user}` | Only Employee/Customer allowed; creates profile |
| `src/context/AuthContext.jsx` | Silent token refresh loop / on 401 | `POST` | `/api/v1/auth/refresh/` | Public | `{"refresh"}` | `{access, refresh}` | Validates refresh token signature & rotates |
| `src/context/AuthContext.jsx` | Clicks "Log Out" | `POST` | `/api/v1/auth/logout/` | Auth | `{"refresh"}` | `{message}` | Blacklists refresh token |
| `src/context/AuthContext.jsx` | App initialization / hydration | `GET` | `/api/v1/auth/me/` | Auth | None; access token in `Authorization: Bearer` header | `{id, email, username, fullName, role, employeeProfile, customerProfile, ...}` | Returns the authenticated user's profile |
| `src/pages/auth/ForgotPassword.jsx` | Submits recovery email | `POST` | `/api/v1/auth/password-reset/` | Public | `{"email"}` | `{message}` | Generic response prevents account enumeration |
| `src/pages/auth/ResetPassword.jsx` | Submits new credentials | `POST` | `/api/v1/auth/password-reset/confirm/` | Public | `{"uid", "token", "new_password", "confirm_new_password"}` | `{message}` | Validates token and updates password |
| `src/pages/employee/EmployeeProfile.jsx` | Updates password | `POST` | `/api/v1/auth/change-password/` | Auth | `{"old_password", "new_password", "confirm_new_password"}` | `{message}` | Validates old password |

---

## 2. Administration & Master Data Endpoints

| Frontend Page / Component | User Action | HTTP | Backend Endpoint | Role | Payload / Parameters | Success Response | Business Validation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `src/pages/admin/EmployeeManagement.jsx` | Lists employees | `GET` | `/api/v1/employees/` | `ADMIN` | Page-number pagination; frontend loads all pages | Paginated employee profiles | Admin sees all; employee sees self only; other roles see none |
| `src/pages/admin/EmployeeManagement.jsx` | Creates employee login/profile | `POST` | `/api/v1/employees/` | `ADMIN` | `{employeeId, email, firstName, lastName, password, phone, roleTitle, department, joiningDate, status}` | Created employee profile (password omitted) | Unique email/code; password validated/hashed |
| `src/pages/admin/EmployeeManagement.jsx` | Edits employee profile | `PATCH` | `/api/v1/employees/{id}/` | `ADMIN` | Profile fields; no password | Updated employee profile | Email uniqueness validated |
| `src/pages/admin/EmployeeManagement.jsx` | Activates/deactivates employee login | `POST` | `/api/v1/employees/{id}/toggle_status/` | `ADMIN` | Empty body | `{id, status}` | Updates profile and linked user `is_active` |
| `src/services/adminApi.js` | Soft-deletes employee profile | `DELETE` | `/api/v1/employees/{id}/` | `ADMIN` | Path `id` | HTTP 204 | Preserves profile and disables linked login; management UI uses status toggle |
| `src/pages/admin/CustomerManagement.jsx` | Lists customers | `GET` | `/api/v1/customers/` | `ADMIN` | Page-number pagination; frontend loads all pages | Paginated customer profiles | Admin sees all; customer sees self only; other roles see none |
| `src/pages/admin/CustomerManagement.jsx` | Creates customer login/profile | `POST` | `/api/v1/customers/` | `ADMIN` | `{companyName, industry, contactPerson, email, password, phone, address, accountStatus}` | Created customer profile with generated `customerCode` | Unique email; password validated/hashed |
| `src/pages/admin/CustomerManagement.jsx` | Edits customer profile | `PATCH` | `/api/v1/customers/{id}/` | `ADMIN` | Profile fields; no password | Updated customer profile | Email uniqueness validated |
| `src/pages/admin/CustomerManagement.jsx` | Activates/suspends customer login | `POST` | `/api/v1/customers/{id}/toggle_status/` | `ADMIN` | Empty body | `{id, accountStatus}` | Updates profile and linked user `is_active` |
| `src/services/adminApi.js` | Soft-deletes customer profile | `DELETE` | `/api/v1/customers/{id}/` | `ADMIN` | Path `id` | HTTP 204 | Preserves profile and disables linked login; management UI uses status toggle |
| `src/pages/admin/EmployeeAssignments.jsx` | Lists employee-customer assignments | `GET` | `/api/v1/assignments/` | `ADMIN` | Page-number pagination; optional status/employee/customer filters | Paginated assignments | Employee/customer see only their related assignments |
| `src/pages/admin/EmployeeAssignments.jsx` | Creates assignment | `POST` | `/api/v1/assignments/` | `ADMIN` | `{employeeId, customerId, notes, status}` | Created assignment | Requires active employee/customer; rejects duplicate active assignment |
| `src/pages/admin/EmployeeAssignments.jsx` | Revokes/reactivates assignment | `POST` | `/api/v1/assignments/{id}/revoke/` or `/approve/` | `ADMIN` | Empty body | `{id, status}` | Re-activation rechecks active profiles and duplicate assignments |
| `src/services/adminApi.js` | Deletes assignment record | `DELETE` | `/api/v1/assignments/{id}/` | `ADMIN` | Path `id` | HTTP 204 | Removes the assignment record |
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
