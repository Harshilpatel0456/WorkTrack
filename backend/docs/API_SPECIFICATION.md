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

### 7.1 Employee Check-In
- **Endpoint:** `POST /api/v1/attendance/check-in/`
- **Auth Required:** Employee
- **Request Body:**
```json
{
  "shiftAssignmentId": "d1e2f3a4-...",
  "notes": "Punched in on-time via security terminal."
}
```
- **Response `201 Created`:**
```json
{
  "id": "att-123",
  "shiftAssignmentId": "d1e2f3a4-...",
  "checkIn": "2026-10-31T06:01:12Z",
  "checkOut": null,
  "attendanceStatus": "PRESENT",
  "durationHours": 0.0
}
```

### 7.2 Employee Check-Out
- **Endpoint:** `POST /api/v1/attendance/check-out/`
- **Auth Required:** Employee
- **Response `200 OK`:**
```json
{
  "id": "att-123",
  "checkIn": "2026-10-31T06:01:12Z",
  "checkOut": "2026-10-31T14:02:45Z",
  "attendanceStatus": "PRESENT",
  "durationHours": 8.02
}
```

### 7.3 Attendance Audit List
- `GET /api/v1/attendance/?date=2026-10-31&status=PRESENT`
- `GET /api/v1/attendance/my-attendance/`

---

## 8. Daily Shift Reporting & Versioning (`/reports/`)

### 8.1 Submit Daily Report
- **Endpoint:** `POST /api/v1/reports/`
- **Auth Required:** Employee
- **Request Body:**
```json
{
  "shiftAssignmentId": "d1e2f3a4-...",
  "title": "Morning Shift Handover & Security Audit",
  "workSummary": "Supervised store opening, active register checkout, safe room locked.",
  "tasksCompleted": "- Verified 10 CCTV feeds\n- Monitored morning armored car cash pickup",
  "pendingTasks": "- Handover Register #2 cash audit to Afternoon Shift",
  "issuesOrBlockers": "None. Emergency exits fully secured.",
  "additionalRemarks": "Staff adhering to badge policy."
}
```

### 8.2 Edit Report & Create Historical Snapshot
- **Endpoint:** `PATCH /api/v1/reports/{id}/`
- **Request Body:**
```json
{
  "tasksCompleted": "- Verified 10 CCTV feeds\n- Monitored morning armored car cash pickup\n- Re-checked jewelry case lock",
  "changeSummary": "Added missing jewelry case lock audit check."
}
```
- **Behavior:** Increments version from 1 to 2; saves snapshot in `ReportVersion`.

### 8.3 Get Report Versions
- **Endpoint:** `GET /api/v1/reports/{id}/versions/`
- **Response `200 OK`:**
```json
[
  {
    "versionNumber": 2,
    "modifiedAt": "2026-10-31T14:15:00Z",
    "modifiedBy": "Aarav Shah",
    "changeSummary": "Added missing jewelry case lock audit check."
  },
  {
    "versionNumber": 1,
    "modifiedAt": "2026-10-31T13:55:00Z",
    "modifiedBy": "Aarav Shah",
    "changeSummary": "Initial submission"
  }
]
```

---

## 9. Feedback & Threaded Comments (`/reports/{id}/comments/`)

### 9.1 Post Comment
- **Endpoint:** `POST /api/v1/reports/{id}/comments/`
- **Auth Required:** Customer or Admin
- **Request Body:**
```json
{
  "content": "Can you verify if Register #2 drawer was closed after the 11 AM surge?"
}
```

### 9.2 Reply to Comment
- **Endpoint:** `POST /api/v1/comments/{id}/reply/`
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

