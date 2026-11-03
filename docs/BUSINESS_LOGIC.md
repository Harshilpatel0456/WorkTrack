# ⚖️ Business Logic & Operational Rules: WorkTrack

> **Document Status:** `VERIFIED BUSINESS INVARIANTS`  
> **Enforcement Layer:** Django ORM Validation, Model Constraints & Service Layer

---

## 1. Confirmed Core Business Invariants

### 1.1 Organizational Contracts & Assignments
1. **Many-to-Many Contract Allocation:** A single customer organization (store) can have multiple assigned employees; conversely, a single employee can be allocated across multiple client stores.
2. **Administrative Sovereignty:** Only users with the `ADMIN` role are permitted to create, approve, activate, or revoke `EmployeeCustomerAssignment` records.
3. **Unique Active Constraint:** The database strictly prohibits duplicate `ACTIVE` contract pairings between the exact same employee and customer.
4. **Historical Retention:** Revoking a contract changes its status to `REVOKED`; assignments are never physically deleted so that historical shift reports remain linked.

### 1.2 Shift Scheduling & Overnight Shifts
1. **Contract Prerequisite:** A `ShiftAssignment` can only be scheduled if an `ACTIVE` `EmployeeCustomerAssignment` exists between the employee and the customer store.
2. **Calendar Date Baseline:** For overnight shifts that cross midnight (e.g. 22:00 to 06:00), the assignment's `shift_date` is strictly defined as the calendar day on which the shift commences.
3. **Lifecycle Status Transitions:**
   $$\text{SCHEDULED} \xrightarrow{\text{Employee Check-In}} \text{IN\_PROGRESS} \xrightarrow{\text{Employee Check-Out}} \text{COMPLETED}$$
   Alternatively, an unworked shift may transition to $\text{CANCELLED}$ by an Administrator.

### 1.3 Attendance Punch Clock Logic
1. **Strict 1:1 Relationship:** Exactly one `Attendance` record exists per `ShiftAssignment`.
2. **Assigned Employee Exclusivity:** Only the employee designated in the shift assignment is authorized to punch in or out.
3. **Sequential Invariant:** Check-in must occur prior to check-out. Any attempt to check out without an existing check-in record is rejected with HTTP 400.
4. **Duplicate Punch Prevention:** Once an employee has checked in, duplicate check-in attempts on the same shift are rejected with HTTP 400.
5. **Temporal Consistency:** A check-out timestamp cannot precede the check-in timestamp ($T_{\text{checkout}} \ge T_{\text{checkin}}$).
6. **UTC Storage & Duration:** All punch timestamps are stored strictly in UTC. Shift duration is calculated at check-out as:
   $$\text{Duration (Hours)} = \text{round}\left(\frac{T_{\text{checkout}} - T_{\text{checkin}}}{3600}, 2\right)$$

### 1.4 Daily Reporting & Audit Versioning
1. **Report-to-Shift Pairing:** Exactly one `DailyReport` is created per `ShiftAssignment`.
2. **Permissive Post-Shift Editing:** Employees are allowed to update or expand submitted reports even after shift completion to add late-breaking incident logs or supervisor notes.
3. **Atomic Version Snapshots:** Any modification (`PATCH` or `PUT`) to a `DailyReport` automatically creates a corresponding immutable `ReportVersion` entry preserving:
   * Current integer version number ($v \leftarrow v + 1$)
   * Title snapshot
   * Complete serialized JSON snapshot of all fields (`work_summary`, `tasks_completed`, `pending_tasks`, `issues_or_blockers`, `additional_remarks`, `status`)
   * Editor user ID
   * Timestamp in UTC
   * Human-readable change summary note
4. **Customer Data Isolation:** Customers can only query reports belonging to their store and having a status of `SUBMITTED`. `DRAFT` reports remain private to the authoring employee and administrators.

### 1.5 Threaded Communication & Feedback
1. **Customer Feedback Privilege:** Customers can post feedback comments on any submitted report for their store.
2. **Employee Reply Privilege:** Assigned employees can reply to customer comments.
3. **Recursive Nesting:** Comments support parent-child reply relationships (`parent_comment_id`).
4. **Boundary Isolation:** Non-contracted third parties cannot view or participate in comment threads.

### 1.6 Hourly Surveillance & CCTV Auditing
1. **1-Hour Inspection Cadence:** Store surveillance is structured into 1-hour inspection batches (`SurveillanceBatch`) across 10 designated physical cameras.
2. **AI Pre-Analysis Telemetry:** Every camera frame records AI human detection flags, person count, confidence scores, and heuristic status (`OK` vs. `Suspicious`).
3. **Robbery Hotspot Flagging:** Critical store zones (Cash Register #1, Express Register #2, Safe Room Vault, Jewelry Counter, Rear Emergency Exit) are tagged `is_high_risk=True`.
4. **Human Verification:** A security guard reviews each snapshot, overrides or verifies the AI classification, enters operational notes, and submits the batch.

### 1.7 Multi-Cadence Notification Engine
1. **Immediate Event Creation:** Notification event rows are persisted immediately when a report is submitted, updated, or commented upon.
2. **Digest Delivery Channels:** Notifications are delivered according to the customer's chosen frequency:
   * `INSTANT`: Dispatched within 60 seconds.
   * `HOURLY`: Aggregated and dispatched once per hour.
   * `6HOURS`: Consolidated every 6 hours (06:00, 12:00, 18:00, 24:00).
   * `DAILY`: Consolidated at 23:00 local time.
3. **Emergency Robbery Override:** When a camera in a high-risk zone is flagged suspicious (`immediate_alert_on_suspicious=True`), an emergency notification bypasses the digest schedule and dispatches immediately via push and email.

---

## 2. Distinction: Confirmed vs. Assumed Rules

| Rule Domain | Rule Details | Status | Implementation Reference |
| :--- | :--- | :--- | :--- |
| **Shift Allocation** | Only Admins can pair guards and stores | `CONFIRMED` | `assignments/permissions.py` |
| **Punch Sequence** | Check-in must precede check-out | `CONFIRMED` | `attendance/views.py` |
| **Punch Duplication** | Duplicate check-in fails with HTTP 400 | `CONFIRMED` | Unit tested in `test_attendance.py` |
| **Report Versioning** | Full JSON snapshot on every report update | `CONFIRMED` | Unit tested in `test_reports.py` |
| **Customer IDOR** | Customer A cannot view Customer B reports | `CONFIRMED` | Unit tested in `test_isolation.py` |
| **Late Grace Period** | Automatic late status if punch > 15 mins after shift start | `ASSUMPTION` | Recorded in [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md) |
| **Leave Management** | Formal PTO and sick leave request workflow | `ASSUMPTION` | Deferred to Phase 2 roadmap |

