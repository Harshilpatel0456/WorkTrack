# 📑 Requirements Specification: WorkTrack

> **Document Status:** `APPROVED REQUIREMENTS SPECIFICATION`  
> **Traceability Index:** `REQ-2026-WT`

---

## 1. Functional Requirements (FR)

### 1.1 Authentication & User Management
* **FR-AUTH-001:** The system shall use the user's unique email address as the primary login credential.
* **FR-AUTH-002:** The system shall issue JSON Web Tokens (JWT) comprising a short-lived access token (60 minutes) and a long-lived refresh token (7 days).
* **FR-AUTH-003:** The system shall enforce password hashing using Django's PBKDF2 with SHA-256 algorithm.
* **FR-AUTH-004:** The system shall assign every user exactly one system role: `ADMIN`, `EMPLOYEE`, or `CUSTOMER`.
* **FR-AUTH-005:** Users shall not be permitted to modify their own system role.
* **FR-AUTH-006:** The system shall provide a secure token refresh endpoint (`/api/v1/auth/refresh/`) with refresh token rotation and blacklisting upon logout.
* **FR-AUTH-007:** The system shall provide an authenticated endpoint (`/api/v1/auth/me/`) returning current profile metadata and role permissions.

### 1.2 Employee Management
* **FR-EMP-001:** Only users with the `ADMIN` role shall have permission to create, update, or deactivate employee accounts.
* **FR-EMP-002:** Every employee must have a unique employee code (e.g., `EMP-AARAV`, `EMP-001`).
* **FR-EMP-003:** An employee profile shall record personal details, phone number, designation, department, joining date, and optional avatar image.
* **FR-EMP-004:** Deactivating an employee shall immediately revoke their login permissions while preserving all historical shift, attendance, and report records.

### 1.3 Customer Management
* **FR-CUST-001:** Only users with the `ADMIN` role shall have permission to create, update, or deactivate customer accounts.
* **FR-CUST-002:** Every customer account must record a unique customer code, company name (e.g., `Acme Store #104`), contact person, phone, physical address, and operating timezone.
* **FR-CUST-003:** The system shall strictly isolate customer data such that a customer can only read or query data linked to their own customer profile.

### 1.4 Employee-Customer Assignments
* **FR-ASGN-001:** Only administrators shall be authorized to create, update, or revoke employee-customer assignments (`EmployeeCustomerAssignment`).
* **FR-ASGN-002:** An employee can be assigned to multiple customers, and a customer can have multiple assigned employees.
* **FR-ASGN-003:** The system shall enforce a unique database constraint preventing duplicate active assignments between the same employee and customer.
* **FR-ASGN-004:** Revoking an assignment shall transition its status to `REVOKED` while retaining the assignment history.

### 1.5 Shift Templates & Scheduling
* **FR-SHFT-001:** Administrators shall be able to define reusable shift templates (e.g., Morning: 06:00–14:00, Afternoon: 14:00–22:00, Night: 22:00–06:00).
* **FR-SHFT-002:** Shift templates shall support an `is_overnight` flag indicating shifts that cross midnight.
* **FR-SHFT-003:** A shift schedule (`ShiftAssignment`) must link an active `EmployeeCustomerAssignment` to a shift template for a designated date.
* **FR-SHFT-004:** For overnight shifts, the assignment date shall represent the calendar day on which the shift starts.
* **FR-SHFT-005:** A shift assignment shall transition through lifecycle statuses: `SCHEDULED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `COMPLETED` (or `CANCELLED`).

### 1.6 Attendance Management
* **FR-ATND-001:** Exactly one attendance record shall be created per `ShiftAssignment`.
* **FR-ATND-002:** Only the employee assigned to the specific `ShiftAssignment` shall be permitted to record check-in and check-out.
* **FR-ATND-003:** The system shall record timestamps in UTC and convert them to the customer's or user's local timezone for presentation.
* **FR-ATND-004:** Check-in must precede check-out. Check-out without prior check-in shall be rejected with HTTP 400.
* **FR-ATND-005:** Duplicate check-in attempts on the same shift assignment shall be rejected with HTTP 400.
* **FR-ATND-006:** Check-out timestamp cannot precede check-in timestamp.
* **FR-ATND-007:** Upon check-out, the system shall compute shift duration in decimal hours rounded to two decimal places.
* **FR-ATND-008:** Recording check-in shall automatically transition the `ShiftAssignment` status to `IN_PROGRESS`.
* **FR-ATND-009:** Recording check-out shall automatically transition the `ShiftAssignment` status to `COMPLETED`.

### 1.7 Daily Reports & Version Auditing
* **FR-REPT-001:** Exactly one daily report (`DailyReport`) shall exist per `ShiftAssignment`.
* **FR-REPT-002:** An employee can create a draft report for their own assigned shift during or after the shift.
* **FR-REPT-003:** Submitting a report shall transition its status from `DRAFT` to `SUBMITTED` and record `submitted_at`.
* **FR-REPT-004:** Employees shall be permitted to modify reports after submission.
* **FR-REPT-005:** Every modification to an existing report shall automatically create an immutable `ReportVersion` record storing a complete JSON snapshot of all fields, author ID, timestamp, and a change summary.
* **FR-REPT-006:** Customers shall only have permission to view reports that belong to their store and have a status of `SUBMITTED`.
* **FR-REPT-007:** Reports shall support uploading attachments (PDF, PNG, JPG) up to 10MB in size.
* **FR-REPT-008:** The system shall provide a shift-wise report endpoint (`/api/v1/reports/shift-wise/?date=YYYY-MM-DD`) allowing customers and admins to compare reports side-by-side across shifts.

### 1.8 Threaded Feedback & Comments
* **FR-FDBK-001:** Customers shall have permission to post comments on any submitted report associated with their account.
* **FR-FDBK-002:** Employees shall have permission to reply to customer comments on reports assigned to them.
* **FR-FDBK-003:** Comments shall support recursive parent-child reply relationships.
* **FR-FDBK-004:** Users outside the assignment relationship shall be barred from viewing or participating in comment threads.

### 1.9 Hourly Surveillance & CCTV Auditing
* **FR-SURV-001:** The system shall structure store video auditing into 1-hour inspection batches (`SurveillanceBatch`) across 10 designated cameras.
* **FR-SURV-002:** Each camera snapshot shall record AI telemetry: `human_detected`, `human_count`, `ai_status` (`OK`, `Suspicious`), confidence score, and analysis notes.
* **FR-SURV-003:** High-risk store zones (Front Cash Registers, Safe Room Vault, Electronics, Emergency Exit) shall be tagged with `is_high_risk=True`.
* **FR-SURV-004:** An employee auditor shall review each snapshot and apply an audit status: `Verified OK` or `Flagged Suspicious`, with optional notes.
* **FR-SURV-005:** Submitting a batch shall update total flagged counts, set `submitted_at`, and flag `customer_notified=True`.
* **FR-SURV-006:** Customers shall have read-only access to submitted surveillance batches for their store.

### 1.10 Notification System
* **FR-NOTF-001:** The system shall automatically generate notification records immediately upon: report submission, report update, comment posted, employee reply, assignment change, or attendance anomaly.
* **FR-NOTF-002:** The system shall support customer notification frequency preferences: `INSTANT`, `HOURLY`, `6HOURS`, and `DAILY`.
* **FR-NOTF-003:** An emergency override (`immediate_alert_on_suspicious=True`) shall dispatch high-priority notifications immediately when a suspicious incident is flagged in a high-risk zone, regardless of digest cadence.
* **FR-NOTF-004:** Users shall be able to retrieve unread notification counts, mark individual notifications as read, and mark all notifications as read.

### 1.11 Role Analytics & Dashboards
* **FR-DASH-001:** The Admin Dashboard shall aggregate: total active staff, total clients, shifts scheduled today, present staff, real-time attendance rate (%), reports submitted today, 7-day attendance trends, shift distribution, and recent audit logs.
* **FR-DASH-002:** The Employee Dashboard shall display: active assigned shift, live check-in/out status, today's report progress, pending surveillance batches, and unread notifications.
* **FR-DASH-003:** The Customer Dashboard shall display: assigned staff count, active shifts coverage today, submitted reports count, flagged CCTV incidents today, live roster feed, and recent reports.

---

## 2. Non-Functional Requirements (NFR)

### 2.1 Security & Data Isolation
* **NFR-SEC-001:** All API requests must be validated against bearer JWT authentication except public documentation and login endpoints.
* **NFR-SEC-002:** Insecure Direct Object References (IDOR) must be prevented at the database query level by scoping queries to `request.user`.
* **NFR-SEC-003:** Passwords must adhere to strict validation rules (minimum 8 characters, alphanumeric).
* **NFR-SEC-004:** File uploads must validate MIME types and reject executable file extensions (`.exe`, `.sh`, `.bat`, `.js`).
* **NFR-SEC-005:** Cross-Origin Resource Sharing (CORS) shall whitelist only designated frontend development and production origins.

### 2.2 Performance & Responsiveness
* **NFR-PERF-001:** Standard CRUD API responses shall return in under 200ms under nominal loads.
* **NFR-PERF-002:** Dashboard metric aggregations shall return in under 500ms using optimized database annotations and indexing.
* **NFR-PERF-003:** Background tasks (digest dispatch, email sending) must be offloaded to asynchronous workers (Celery) without blocking HTTP threads.

### 2.3 Reliability & Availability
* **NFR-REL-001:** The backend system shall support graceful database error handling and return standardized JSON error bodies.
* **NFR-REL-002:** Report version snapshots must be executed in atomic database transactions (`transaction.atomic`) to ensure data consistency.
* **NFR-REL-003:** The system architecture shall target 99.9% uptime during operational shift hours.

### 2.4 Scalability & Maintainability
* **NFR-SCAL-001:** Database design must utilize Foreign Key indexes on all frequently filtered columns (`shift_date`, `status`, `created_at`, `employee_id`, `customer_id`).
* **NFR-SCAL-002:** The codebase must adhere to Django modular app separation with decoupled concerns (models, serializers, views, permissions, urls).
* **NFR-SCAL-003:** API contracts shall follow OpenAPI 3.0 specification generated automatically via `drf-spectacular`.

