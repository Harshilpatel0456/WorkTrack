# 📡 API Documentation: WorkTrack RESTful API

> **Base URL:** `/api/v1/`  
> **API Version:** `v1.0.0`  
> **Documentation Standard:** OpenAPI 3.0.3 (Interactive Swagger UI at `/api/v1/docs/` and Redoc at `/api/v1/redoc/`)

---

## 1. Global API Standards

### 1.1 Authentication & Authorization Headers
All secured endpoints require an HTTP `Authorization` header containing a valid SimpleJWT Bearer token:
```http
Authorization: Bearer <jwt_access_token>
Content-Type: application/json
Accept: application/json
```

### 1.2 Standard HTTP Status Codes
* `200 OK`: Request succeeded; returns data payload.
* `201 Created`: Resource successfully created.
* `204 No Content`: Resource deleted or action executed with no body.
* `400 Bad Request`: Validation failure or business rule violation (e.g. duplicate check-in).
* `401 Unauthorized`: Token missing, invalid, or expired.
* `403 Forbidden`: Authenticated user lacks permission for the requested action or object.
* `404 Not Found`: Target resource does not exist or is outside the user's tenant scope.
* `500 Internal Server Error`: Unhandled server exception.

### 1.3 Standard Error Response Format
All errors return a predictable JSON payload:
```json
{
  "detail": "Descriptive human-readable error message.",
  "errors": {
    "field_name": [
      "Specific validation error message."
    ]
  }
}
```

### 1.4 Standard Pagination
List endpoints are paginated using DRF's standard PageNumberPagination:
```json
{
  "count": 48,
  "next": "http://127.0.0.1:8000/api/v1/reports/?page=3",
  "previous": "http://127.0.0.1:8000/api/v1/reports/?page=1",
  "results": [ ... ]
}
```

---

## 2. API Endpoint Directory

### 2.1 Authentication & Profile (`/api/v1/auth/`)

#### 1. Login (`POST /api/v1/auth/login/`)
* **Access:** Public
* **Payload:**
  ```json
  {
    "email": "admin@worktrack.demo",
    "password": "admin123"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "c1f7b0f6-2586-4f76-8f3b-b2f768c8180f",
      "email": "admin@worktrack.demo",
      "username": "admin@worktrack.demo",
      "role": "ADMIN",
      "first_name": "System",
      "last_name": "Administrator"
    }
  }
  ```

#### 2. User Registration (`POST /api/v1/auth/register/`)
* **Access:** Public
* **Payload:**
  ```json
  {
    "full_name": "Jane Doe",
    "email": "jane@example.com",
    "password": "SecurePassword123!",
    "confirm_password": "SecurePassword123!",
    "role": "EMPLOYEE",
    "company_name": ""
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "message": "User registered successfully.",
    "tokens": {
      "access": "eyJhbGciOiJIUzI1Ni...",
      "refresh": "eyJhbGciOiJIUzI1Ni..."
    },
    "user": {
      "id": "c1f7b0f6-...",
      "email": "jane@example.com",
      "fullName": "Jane Doe",
      "role": "EMPLOYEE",
      "employeeProfile": {
        "id": "...",
        "employeeCode": "EMP-384912"
      }
    }
  }
  ```
* **Error (400 Bad Request):** If attempting to register with `role="ADMIN"` or invalid passwords.

#### 3. Token Refresh (`POST /api/v1/auth/refresh/`)
* **Access:** Public (with valid refresh token)
* **Payload:** `{"refresh": "<jwt_refresh_token>"}`
* **Response (200 OK):** `{"access": "<new_jwt_access_token>", "refresh": "<rotated_refresh_token>"}`

#### 4. Logout & Token Blacklist (`POST /api/v1/auth/logout/`)
* **Access:** Authenticated (Any Role)
* **Payload:** `{"refresh": "<jwt_refresh_token>"}`
* **Response (200 OK):** `{"detail": "Successfully logged out."}`

#### 5. Current User (`GET /api/v1/auth/me/`)
* **Access:** Authenticated (Any Role)
* **Response (200 OK):** Returns authenticated user profile, role, and profile details (`employeeProfile` or `customerProfile`).

#### 6. Change Password (`POST /api/v1/auth/change-password/`)
* **Access:** Authenticated (Any Role)
* **Payload:** `{"old_password": "...", "new_password": "...", "confirm_new_password": "..."}`
* **Response (200 OK):** `{"detail": "Password has been successfully changed."}`

#### 7. Password Reset Request (`POST /api/v1/auth/password-reset/`)
* **Access:** Public
* **Payload:** `{"email": "user@example.com"}`
* **Response (200 OK):** `{"detail": "If an active account exists for this email, password reset instructions have been sent."}`

#### 8. Password Reset Confirm (`POST /api/v1/auth/password-reset/confirm/`)
* **Access:** Public
* **Payload:** `{"uid": "<uidb64>", "token": "<token>", "new_password": "...", "confirm_new_password": "..."}`
* **Response (200 OK):** `{"detail": "Password has been reset successfully. You may now log in with your new credentials."}`

---

### 2.2 Attendance Operations (`/api/v1/attendance/`)

#### 1. Check-In (`POST /api/v1/attendance/check_in/`)
* **Access:** Authenticated (`EMPLOYEE` role only)
* **Payload:**
  ```json
  {
    "shift_assignment_id": "b328a6f3-fec6-4f40-8b1e-01a2f9b8c001",
    "notes": "Starting patrol on main sales floor",
    "location_verified": true
  }
  ```
* **Business Validation:**
  * Must be assigned to `shift_assignment_id`.
  * Cannot check in twice.
* **Response (201 Created / 200 OK):** Serialized `Attendance` record with `check_in` timestamp and status `PRESENT`.

#### 2. Check-Out (`POST /api/v1/attendance/check_out/`)
* **Access:** Authenticated (`EMPLOYEE` role only)
* **Payload:**
  ```json
  {
    "shift_assignment_id": "b328a6f3-fec6-4f40-8b1e-01a2f9b8c001",
    "notes": "Completed shift without security incidents"
  }
  ```
* **Business Validation:**
  * Must have prior check-in.
  * Cannot check out twice.
  * Check-out cannot precede check-in.
* **Response (200 OK):** Returns attendance record with calculated `duration_hours` (e.g. `8.00`).

#### 3. Active Punch Status (`GET /api/v1/attendance/current/`)
* **Access:** Authenticated (`EMPLOYEE` role)
* **Response (200 OK):** Returns active shift assignment, punch status, and `is_checked_in: true/false`.

---

### 2.3 Daily Reports & Versions (`/api/v1/reports/`)

#### 1. List / Create Reports (`GET, POST /api/v1/reports/`)
* **Access:** Authenticated
  * `ADMIN`: Sees all reports.
  * `EMPLOYEE`: Sees own reports; creates new drafts for assigned shifts.
  * `CUSTOMER`: Sees only submitted reports belonging to their store.
* **Create Payload:**
  ```json
  {
    "shift_assignment": "b328a6f3-fec6-4f40-8b1e-01a2f9b8c001",
    "title": "Morning Retail Security Brief",
    "work_summary": "Monitored store entrance, executed 4 hourly register perimeter checks.",
    "tasks_completed": "Perimeter check; Safe room vault lock verification.",
    "pending_tasks": "Handover to afternoon guard.",
    "issues_or_blockers": "None observed."
  }
  ```

#### 2. Submit Report (`POST /api/v1/reports/{id}/submit/`)
* **Access:** Authoring Employee / Admin
* **Action:** Transitions status from `DRAFT` to `SUBMITTED`, sets `submitted_at = NOW()`, captures version snapshot.

#### 3. Version History (`GET /api/v1/reports/{id}/versions/`)
* **Access:** Authorized report viewers
* **Response (200 OK):** Array of historical `ReportVersion` snapshots with `version_number`, `title_snapshot`, `content_snapshot`, `modified_by_name`, `modified_at`, and `change_summary`.

#### 4. Shift-Wise Comparison (`GET /api/v1/reports/shift-wise/?date=2026-11-02`)
* **Access:** Authenticated (Admin, Customer)
* **Response (200 OK):** Returns daily reports side-by-side grouped by shift (Morning, Afternoon, Night) for operational comparison.

---

### 2.4 Hourly CCTV Surveillance (`/api/v1/surveillance/`)

#### 1. List Batches (`GET /api/v1/surveillance/batches/`)
* **Filters:** `?date=YYYY-MM-DD`, `?status=Submitted`, `?customer=<id>`
* **Response:** Array of `SurveillanceBatch` with nested `CameraSnapshot` frames.

#### 2. Verify Snapshot (`PATCH /api/v1/surveillance/snapshots/{id}/verify/`)
* **Access:** Assigned Guard / Admin
* **Payload:**
  ```json
  {
    "employee_verification": "Flagged Suspicious",
    "employee_notes": "Register drawer left open unattended outside transaction window"
  }
  ```

#### 3. Submit Surveillance Batch (`POST /api/v1/surveillance/batches/{id}/submit/`)
* **Payload:**
  ```json
  {
    "overall_assessment": "All 10 zones audited. 1 register drawer anomaly flagged and resolved.",
    "actions_taken": "Contacted floor manager via two-way radio to secure drawer."
  }
  ```

---

### 2.5 Role Analytics Dashboards (`/api/v1/dashboard/`)

* **Admin KPI Feed:** `GET /api/v1/dashboard/admin/` $\rightarrow$ Total employees, active clients, scheduled shifts, attendance rate, 7-day trend, recent logs.
* **Employee Roster Feed:** `GET /api/v1/dashboard/employee/` $\rightarrow$ Assigned store, today's shift time, live punch status, today's report status, pending camera batches.
* **Customer Store Feed:** `GET /api/v1/dashboard/customer/` $\rightarrow$ On-duty guard, shift coverage, submitted daily reports, flagged camera incidents today.

