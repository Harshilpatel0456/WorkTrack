# WorkTrack REST API Specification (v1)

**Base URL:** `http://localhost:8000/api/v1/`  
**Authentication Standard:** JSON Web Token (JWT) via `Authorization: Bearer <access_token>`  
**Documentation:** Interactive Swagger UI at `/api/v1/docs/` and Redoc at `/api/v1/redoc/` via `drf-spectacular`.

---

## 1. Global Standards & Formats

### 1.1 Headers
```http
Authorization: Bearer <jwt_access_token>
Content-Type: application/json
Accept: application/json
```

### 1.2 Pagination Structure
All list endpoints return paginated responses:
```json
{
  "count": 42,
  "next": "http://localhost:8000/api/v1/employees/?page=2",
  "previous": null,
  "results": [...]
}
```

### 1.3 Standard Error Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid credentials or request data",
    "details": {
      "email": ["Enter a valid email address."]
    }
  }
}
```

---

## 2. Authentication Endpoints (`/auth/`)

### 2.1 Login & Obtain Tokens
- **Endpoint:** `POST /api/v1/auth/login/`
- **Auth Required:** No
- **Request Body:**
```json
{
  "email": "admin@worktrack.demo",
  "password": "admin123"
}
```
- **Response `200 OK`:**
```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "c7a8e0f1-8f5b-4b2a-8b1e-4c5e3d2a1f0a",
    "email": "admin@worktrack.demo",
    "firstName": "Alexander",
    "lastName": "Wright",
    "role": "ADMIN"
  }
}
```

### 2.2 Refresh Token
- **Endpoint:** `POST /api/v1/auth/refresh/`
- **Auth Required:** No
- **Request Body:**
```json
{
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
- **Response `200 OK`:**
```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2.3 Logout (Blacklist Refresh Token)
- **Endpoint:** `POST /api/v1/auth/logout/`
- **Auth Required:** Yes
- **Request Body:**
```json
{
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
- **Response `200 OK`:**
```json
{
  "message": "Successfully logged out."
}
```

### 2.4 Current User Profile
- **Endpoint:** `GET /api/v1/auth/me/`
- **Auth Required:** Yes
- **Response `200 OK`:**
```json
{
  "id": "c7a8e0f1-8f5b-4b2a-8b1e-4c5e3d2a1f0a",
  "email": "employee@worktrack.demo",
  "firstName": "Aarav",
  "lastName": "Shah",
  "role": "EMPLOYEE",
  "employeeProfile": {
    "id": "e1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
    "employeeCode": "EMP-AARAV",
    "phone": "+1 (555) 349-8201",
    "designation": "Senior CCTV Surveillance Operator",
    "department": "Operations",
    "joiningDate": "2024-03-15",
    "status": "ACTIVE"
  }
}
```

---

## 3. Employee Management Endpoints (`/employees/`)
*Role: Admin only for modifications; Employee for self profile.*

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/employees/` | List employees (filters: `status`, `department`, `search`) |
| `POST` | `/api/v1/employees/` | Onboard new employee (creates User + EmployeeProfile) |
| `GET` | `/api/v1/employees/{id}/` | Get employee details |
| `PATCH` | `/api/v1/employees/{id}/` | Update employee information |
| `DELETE` | `/api/v1/employees/{id}/` | Soft-deactivate employee account |

---

## 4. Customer Management Endpoints (`/customers/`)
*Role: Admin only for onboarding; Customer for self profile.*

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/customers/` | List customer clients (filters: `account_status`, `industry`, `search`) |
| `POST` | `/api/v1/customers/` | Register new customer account |
| `GET` | `/api/v1/customers/{id}/` | Customer details & active workforce metrics |
| `PATCH` | `/api/v1/customers/{id}/` | Update customer info |
| `DELETE` | `/api/v1/customers/{id}/` | Deactivate customer account |

---

## 5. Employee-Customer Assignments (`/assignments/`)
*Role: Admin only.*

- `POST /api/v1/assignments/`
```json
{
  "employeeId": "e1a2b3c4-...",
  "customerId": "f9e8d7c6-...",
  "notes": "Assigned to Acme Store #104 CCTV monitoring unit."
}
```
- `POST /api/v1/assignments/{id}/approve/`
- `POST /api/v1/assignments/{id}/revoke/`

---

## 6. Shifts & Scheduling Endpoints (`/shifts/`, `/shift-assignments/`)

### 6.1 Shift Templates
- `GET /api/v1/shifts/`
- `POST /api/v1/shifts/`
```json
{
  "name": "Morning Shift",
  "startTime": "06:00:00",
  "endTime": "14:00:00",
  "isOvernight": false,
  "description": "Store opening & morning register checkout security."
}
```

### 6.2 Shift Assignments
- `GET /api/v1/shift-assignments/?date=2026-10-31`
- `POST /api/v1/shift-assignments/` (Admin schedules employee for customer on date)
- `GET /api/v1/shift-assignments/my-shifts/` (Employee views own schedule)
- `POST /api/v1/shift-assignments/{id}/cancel/`

---

## 7. Attendance Telemetry Endpoints (`/attendance/`)

Attendance timestamps are stored in UTC and converted to the viewer's local timezone by the frontend. Shift schedules use the customer's IANA timezone; overnight attendance belongs to the shift's start date. All read endpoints are scoped to the authenticated role.

### 7.1 Employee Shifts and Punch Actions
- `GET /api/v1/attendance/my-shifts/` — today's assigned shifts, including an open overnight shift.
- `GET /api/v1/attendance/customer-shifts/?date=YYYY-MM-DD` — customer-scoped shift and punch status, including shifts without a punch.
- `GET /api/v1/attendance/my-attendance/` — paginated employee history; accepts `date`, `date_from`, `date_to`, and `status`.
- `POST /api/v1/attendance/check_in/` — employee may check in at/after shift start and before shift end.
- `POST /api/v1/attendance/check_out/` — employee may check out at/after shift end, after checking in.
- **Punch request body:**
```json
{
  "shift_assignment_id": "d1e2f3a4-...",
  "notes": "Punched in on-time via security terminal.",
  "location_verified": true
}
```
- Check-in status is `PRESENT` through the shift's configured `gracePeriodMinutes` (15 by default), then `LATE`. Duplicate check-ins, early/late punches outside the shift window, and check-outs without a check-in are rejected.
- Response records include `shift_date`, employee/customer/shift identifiers and names, `check_in`, `check_out`, `attendance_status`, and `duration_hours`.

### 7.2 Admin and Customer Attendance
- `GET /api/v1/attendance/` — admin sees all attendance; employees see only their own and customers only records for their own customer account. Supports `employee`, `customer`, `shift`, `date`, `date_from`, `date_to`, and `status`.
- `GET /api/v1/attendance/summary/?date=YYYY-MM-DD` — role-scoped daily and overall totals, status counts, and tracked hours.
- `PATCH /api/v1/attendance/{id}/correct/` — admin only; accepts `check_in`, `check_out`, `attendance_status`, and `notes`. Validates punch order/status and recalculates duration; every correction writes before/after values to the activity audit log.
- After shift end, a missing punch is recorded as `ABSENT`; a check-in without check-out is marked `INCOMPLETE`.

Attendance statuses: `PRESENT`, `ABSENT`, `LATE`, `INCOMPLETE` (legacy `HALF_DAY` and `OVERTIME` values remain readable).

Example correction:
```json
{
  "check_in": "2026-10-31T06:01:12Z",
  "check_out": "2026-10-31T14:02:45Z",
  "attendance_status": "PRESENT",
  "notes": "Approved correction"
}
```

---

## 8. Daily Shift Reporting & Versioning (`/reports/`)

### 8.1 Submit Daily Report
- **Endpoint:** `POST /api/v1/reports/`
- **Auth Required:** Employee
- **Request fields:** `shift_assignment`, `title`, `work_summary`, `tasks_completed`, `pending_tasks`, `issues_or_blockers`, `additional_remarks`, and optional `status` (`DRAFT` or `SUBMITTED`).
- The employee may report only on an active, non-cancelled assigned shift. A shift assignment can have only one report.
- `POST /api/v1/reports/{id}/submit/` submits a saved draft.
- **Request Body:**
```json
{
  "shift_assignment": "d1e2f3a4-...",
  "title": "Morning Shift Handover & Security Audit",
  "work_summary": "Supervised store opening and secured the premises.",
  "tasks_completed": "Completed the opening checklist.",
  "pending_tasks": "Handover the cash audit to the next shift.",
  "issues_or_blockers": "None.",
  "additional_remarks": "Staff adhering to badge policy.",
  "status": "SUBMITTED"
}
```

### 8.2 Edit Report & Create Historical Snapshot
- **Endpoint:** `PATCH /api/v1/reports/{id}/`
- **Request Body:**
```json
{
  "tasks_completed": "Completed the opening checklist and re-checked the storage lock.",
  "change_summary": "Added a missing security check."
}
```
- **Behavior:** Increments the version and saves immutable current and previous content snapshots, editor, timestamp, and change summary.

### 8.3 Get Report Versions
- **Endpoint:** `GET /api/v1/reports/{id}/versions/`
- **Response `200 OK`:**
```json
[
  {
    "version_number": 2,
    "modified_at": "2026-10-31T14:15:00Z",
    "modified_by_name": "Aarav Shah",
    "content_snapshot": {"title": "Morning Shift Handover", "work_summary": "Updated summary."},
    "previous_content_snapshot": {"title": "Morning Shift Handover", "work_summary": "Previous summary."},
    "change_summary": "Added a missing security check."
  },
  {
    "version_number": 1,
    "modified_at": "2026-10-31T13:55:00Z",
    "modified_by_name": "Aarav Shah",
    "change_summary": "Initial submission"
  }
]
```

---

## 9. Feedback & Threaded Comments (`/feedback/comments/`)

### 9.1 Post Comment
- **Endpoint:** `GET /api/v1/feedback/comments/?daily_report={id}` and `POST /api/v1/feedback/comments/`
- **Auth Required:** Customer or Admin
- Customers can comment only on submitted reports belonging to their account.
- **Request Body:**
```json
{
  "daily_report": "d1e2f3a4-...",
  "content": "Can you verify if the storage area was secured after the shift?"
}
```

### 9.2 Reply to Comment
- **Endpoint:** `POST /api/v1/feedback/comments/{id}/reply/`
- **Auth Required:** Employee or Admin
- **Request Body:**
```json
{
  "content": "Yes, floor supervisor radioed back at 11:08 AM and verified the drawer is securely locked."
}
```

---

## 10. Notifications & Dispatch Cadence (`/notifications/`)

- `GET /api/v1/notifications/` (List unread/read alerts)
- `GET /api/v1/notifications/unread-count/` (Fast badge query)
- `POST /api/v1/notifications/{id}/read/`
- `POST /api/v1/notifications/mark-all-read/`
- `GET /api/v1/notification-preferences/`
- `PATCH /api/v1/notification-preferences/`
```json
{
  "frequency": "HOURLY",
  "immediateAlertOnSuspicious": true,
  "channels": {
    "inApp": true,
    "email": true,
    "push": true
  }
}
```

---

## 11. CCTV Surveillance & Anomaly Audit (`/surveillance/`)

- `GET /api/v1/surveillance/batches/` (List today's hourly snapshot batches)
- `GET /api/v1/surveillance/batches/{id}/` (Get 10 camera feeds with AI confidence)
- `PATCH /api/v1/surveillance/snapshots/{id}/verify/`
```json
{
  "employeeVerification": "VERIFIED_OK",
  "employeeNotes": "Cashier badge active. Normal transaction."
}
```
- `POST /api/v1/surveillance/batches/{id}/submit/`
```json
{
  "overallAssessment": "Store security operating normally across all 10 cameras.",
  "actionsTaken": "Radioed floor supervisor regarding Register #2; drawer closed."
}
```

---

## 12. Dashboard Analytics Endpoints (`/dashboard/`)

### 12.1 Admin Dashboard
- `GET /api/v1/dashboard/admin/`
```json
{
  "kpis": {
    "totalEmployees": 6,
    "totalCustomers": 4,
    "activeAssignments": 5,
    "reportsToday": 3,
    "attendanceRate": 94,
    "pendingReports": 2
  },
  "weeklyAttendanceTrend": [
    { "day": "Mon", "rate": 92, "onTime": 88 },
    { "day": "Tue", "rate": 95, "onTime": 91 }
  ],
  "recentReports": [...]
}
```

### 12.2 Employee Dashboard
- `GET /api/v1/dashboard/employee/`
```json
{
  "activeShift": {
    "shiftName": "Morning Shift",
    "customerName": "Acme Retail Store #104",
    "startTime": "06:00:00",
    "endTime": "14:00:00"
  },
  "attendance": {
    "status": "Checked In",
    "checkInTime": "06:01:00Z"
  },
  "todayReportStatus": "SUBMITTED"
}
```

### 12.3 Customer Dashboard
- `GET /api/v1/dashboard/customer/`
```json
{
  "customerName": "Acme Retail Store #104",
  "assignedEmployeesCount": 2,
  "shiftCoverage": {
    "morning": "Active",
    "afternoon": "Scheduled",
    "night": "Scheduled"
  },
  "recentSurveillanceStatus": "All Clear"
}
```
