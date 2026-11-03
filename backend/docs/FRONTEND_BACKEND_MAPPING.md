# Frontend to Backend Mapping Documentation
**Project:** WorkTrack Enterprise Workforce Management System  
**Frontend Stack:** React 19, Vite, Tailwind CSS, React Router DOM, Recharts, Lucide React  
**Target Backend Stack:** Python 3.12+, Django 5.x, Django REST Framework, PostgreSQL, Simple JWT, Celery, Redis  

---

## 1. Executive Summary & Architecture Overview

WorkTrack provides a multi-tenant role-based workforce platform serving three distinct user roles:
1. **Administrator (Admin):** Global workforce supervision, employee directory, customer onboarding, shift definition, assignment scheduling, attendance auditing, shift report reviews, client feedback inspection, and platform governance.
2. **Employee (Operator / Staff):** Shift self-service, real-time biometric/virtual punch-in and punch-out, hourly CCTV camera audit verification with AI telemetry, daily shift report submissions with multi-version revisions, file attachments, and customer inquiry response.
3. **Customer (Client / Store Owner):** Client visibility portal for assigned workforce, live shift attendance tracking, verified shift reports with full audit history, hourly 10-camera CCTV feed intelligence with robbery hotspot monitoring, threaded comments, and customizable notification dispatch cadence (Hourly, 6-Hour Digest, Day-End Closeout).

Currently, all business logic and data persistence are simulated using React Context API (`AuthContext`, `AppContext`) and browser `localStorage`. This document maps all frontend views, state structures, user workflows, and simulated actions to production Django REST Framework API endpoints.

---

## 2. Existing Frontend Views & Component Breakdown

### 2.1 Authentication & Cross-Role Switching
| Route | Component | Current Frontend Behavior | Target Backend API |
| :--- | :--- | :--- | :--- |
| `/login` | `Login.jsx` | Authenticates email & password against mock credentials; sets `worktrack_auth_state` in localStorage. Provides 1-click preset logins for Admin, Employee, and Customer. | `POST /api/v1/auth/login/`<br>`GET /api/v1/auth/me/` |
| `Global Header` | `DemoBar.jsx` | Instant role switcher (`quickLoginAs`) and persona selector (`switchPersona`) allowing evaluators to jump between Admin, Employee (`emp-1`), and Customer (`cust-1`), plus "Reset Demo Data" button. | `POST /api/v1/auth/login/` (JWT exchange)<br>`POST /api/v1/auth/refresh/`<br>`POST /api/v1/demo/reset/` (Dev only) |
| `Global Navbar` | `Navbar.jsx` | Displays user avatar, role badge, quick search, notification bell dropdown with real-time unread counter, and profile logout dropdown. | `GET /api/v1/auth/me/`<br>`GET /api/v1/notifications/unread-count/`<br>`POST /api/v1/auth/logout/` |
| `Global Sidebar` | `Sidebar.jsx` | Collapsible sidebar (CodingLab style with rail mode and tooltips), role-specific navigation links, and logout action. | Session state / JWT permissions |

---

### 2.2 Administrator Dashboard & Operations (10 Views)
| Route | Component | Existing Frontend Data & Interactions | Target Backend API & Permissions |
| :--- | :--- | :--- | :--- |
| `/admin` | `AdminOverview.jsx` | Live KPI cards (Total Employees, Customers, Active Assignments, Today Reports, Attendance Rate %, Pending Reports), Weekly Attendance trend area chart, Shift distribution pie chart, and Recent Reports table. | `GET /api/v1/dashboard/admin/`<br>*(Admin only)* |
| `/admin/employees` | `EmployeeManagement.jsx` | Searchable/filterable employee table, modal for creating employee (`addEmployee`), editing employee (`updateEmployee`), and active/inactive toggle (`toggleEmployeeStatus`). | `GET /api/v1/employees/`<br>`POST /api/v1/employees/`<br>`GET /api/v1/employees/{id}/`<br>`PATCH /api/v1/employees/{id}/`<br>`DELETE /api/v1/employees/{id}/`<br>*(Admin only)* |
| `/admin/customers` | `CustomerManagement.jsx` | Client accounts directory with industry, contact person, contract count, modal to add client (`addCustomer`) and edit client (`updateCustomer`), and toggle status (`toggleCustomerStatus`). | `GET /api/v1/customers/`<br>`POST /api/v1/customers/`<br>`GET /api/v1/customers/{id}/`<br>`PATCH /api/v1/customers/{id}/`<br>`DELETE /api/v1/customers/{id}/`<br>*(Admin only)* |
| `/admin/assignments` | `EmployeeAssignments.jsx` | Staff-to-client assignment matrix. Tabbed views for Active vs History. Modal to create assignment (`createAssignment`) and buttons to approve or revoke assignments (`updateAssignmentStatus`). | `GET /api/v1/assignments/`<br>`POST /api/v1/assignments/`<br>`GET /api/v1/assignments/{id}/`<br>`POST /api/v1/assignments/{id}/approve/`<br>`POST /api/v1/assignments/{id}/revoke/`<br>*(Admin only)* |
| `/admin/shifts` | `ShiftManagement.jsx` | Schedule template manager (Morning, Afternoon, Night), start/end times, overnight flag, personnel capacity, and assigned employee lists. Modal to create and edit shifts (`createShift`, `updateShift`). | `GET /api/v1/shifts/`<br>`POST /api/v1/shifts/`<br>`GET /api/v1/shifts/{id}/`<br>`PATCH /api/v1/shifts/{id}/`<br>`DELETE /api/v1/shifts/{id}/`<br>*(Admin only)* |
| `/admin/attendance` | `AttendanceMonitoring.jsx` | Real-time attendance log, biometric punch records, duration calculations, status filter (Checked In, Checked Out, Scheduled, Missed), and search by employee/customer/shift. | `GET /api/v1/attendance/`<br>*(Admin: all records; Filter by date, status, customer)* |
| `/admin/reports` | `DailyReportsMonitoring.jsx` | Master repository of daily shift logs. View report details via `ReportDetailModal`, inspect version history via `VersionHistoryModal`, and search across customer/shift/work content. | `GET /api/v1/reports/`<br>`GET /api/v1/reports/{id}/`<br>`GET /api/v1/reports/{id}/versions/`<br>*(Admin & Customer)* |
| `/admin/feedback` | `FeedbackMonitoring.jsx` | Global feedback audit table consolidating all customer inquiries, complaints, and employee replies across reports. Opens report detail modal to reply. | `GET /api/v1/reports/comments/`<br>`POST /api/v1/reports/{id}/comments/`<br>`POST /api/v1/comments/{id}/reply/` |
| `/admin/notifications` | `AdminNotifications.jsx` | Notification list with unread filtering, link redirection, and "Mark All Read" action (`markAllNotificationsRead`). | `GET /api/v1/notifications/`<br>`POST /api/v1/notifications/{id}/read/`<br>`POST /api/v1/notifications/mark-all-read/` |
| `/admin/settings` | `AdminSettings.jsx` | Platform policies, auto-approval flags, retention rules, simulated notification channels, and "Reset Demo Data" confirmation modal. | `GET /api/v1/settings/`<br>`PATCH /api/v1/settings/`<br>`POST /api/v1/demo/reset/` |

---

### 2.3 Employee Workspace & Surveillance (9 Views)
| Route | Component | Existing Frontend Data & Interactions | Target Backend API & Permissions |
| :--- | :--- | :--- | :--- |
| `/employee` | `EmployeeOverview.jsx` | Operator shift summary, live digital clock timer, punch in/out buttons (`checkInEmployee`, `checkOutEmployee`), today's assigned shift details, and recent submission history. | `GET /api/v1/dashboard/employee/`<br>`POST /api/v1/attendance/check-in/`<br>`POST /api/v1/attendance/check-out/` |
| `/employee/surveillance` | `HourlySurveillance.jsx` | Hourly CCTV surveillance batches (`cctv-batch-14`, etc.). Inspects 10 camera feeds, AI human detection telemetry, robbery hotspots, verifies snapshots (`updateSnapshotVerification`), and submits audit batch (`submitHourlySurveillanceBatch`). | `GET /api/v1/surveillance/batches/`<br>`GET /api/v1/surveillance/batches/{id}/`<br>`PATCH /api/v1/surveillance/snapshots/{id}/verify/`<br>`POST /api/v1/surveillance/batches/{id}/submit/` |
| `/employee/shifts` | `MyShifts.jsx` | Calendar list of assigned upcoming and historical shifts for the logged-in employee. | `GET /api/v1/shift-assignments/my-shifts/` |
| `/employee/attendance` | `EmployeeAttendance.jsx` | Biometric punch clock interface. Live punch in/out with auto-calculated duration, overtime calculation, and historical attendance log. | `GET /api/v1/attendance/my-attendance/`<br>`POST /api/v1/attendance/check-in/`<br>`POST /api/v1/attendance/check-out/` |
| `/employee/daily-report` | `DailyReportForm.jsx` | Shift report editor. Form fields: Work Completed, Pending Tasks, Issues/Obstacles, Remarks, Attachments uploader (`attachments`), submit action (`submitDailyReport`), and revision updater (`updateDailyReport`). | `POST /api/v1/reports/`<br>`PATCH /api/v1/reports/{id}/`<br>`POST /api/v1/reports/{id}/submit/`<br>`POST /api/v1/reports/{id}/attachments/` |
| `/employee/history` | `ReportHistory.jsx` | Chronological list of reports authored by the logged-in employee with status badges, version numbers, and revision history triggers. | `GET /api/v1/reports/my-reports/` |
| `/employee/feedback` | `EmployeeFeedback.jsx` | Inquiries and notes posted by customers on the employee's submitted reports. Inline reply box (`replyToComment`). | `GET /api/v1/reports/my-feedback/`<br>`POST /api/v1/comments/{id}/reply/` |
| `/employee/notifications` | `EmployeeNotifications.jsx` | Alerts for shift assignment approvals, client feedback, and supervisor reminders. | `GET /api/v1/notifications/`<br>`POST /api/v1/notifications/{id}/read/` |
| `/employee/profile` | `EmployeeProfile.jsx` | Employee badge, photo, employee code, department, contact info, and active client contracts. | `GET /api/v1/employees/me/` |

---

### 2.4 Customer Client Portal (9 Views)
| Route | Component | Existing Frontend Data & Interactions | Target Backend API & Permissions |
| :--- | :--- | :--- | :--- |
| `/customer` | `CustomerOverview.jsx` | Store owner dashboard: Active assigned staff count, today's shift coverage, daily report submissions, 3-shift activity breakdown, and pending inquiries. | `GET /api/v1/dashboard/customer/`<br>*(Customer scoped)* |
| `/customer/surveillance` | `CustomerSurveillance.jsx` | 10-camera CCTV hourly report feed for store #104. High-risk robbery hotspots banner (Cash Registers, Safe Room Vault, Fire Exit). View snapshots, AI confidence, and direct inquiry link. | `GET /api/v1/surveillance/customer-feed/`<br>`GET /api/v1/surveillance/batches/{id}/` |
| `/customer/employees` | `CustomerAssignedEmployees.jsx` | List of employees currently assigned to this customer's store with live attendance status and daily report status. | `GET /api/v1/customers/my-employees/` |
| `/customer/reports` | `CustomerDailyReports.jsx` | Verified daily shift reports for this customer. Opens `ReportDetailModal` to inspect logs, download attachments, and post comments. | `GET /api/v1/reports/`<br>`GET /api/v1/reports/{id}/` |
| `/customer/shift-reports` | `CustomerShiftReports.jsx` | Sequential 3-column progression (Morning, Afternoon, Night) for transparent shift-to-shift handovers on a selectable date. | `GET /api/v1/reports/shift-wise/?date=YYYY-MM-DD` |
| `/customer/feedback` | `CustomerFeedback.jsx` | Interactive communication hub. Customer posts feedback/inquiries on shift reports (`addFeedbackComment`) and views employee replies. | `GET /api/v1/reports/{id}/comments/`<br>`POST /api/v1/reports/{id}/comments/` |
| `/customer/notifications` | `CustomerNotifications.jsx` | Customer-targeted notification alerts with unread badge counter. | `GET /api/v1/notifications/`<br>`POST /api/v1/notifications/{id}/read/` |
| `/customer/settings` | `CustomerNotificationSettings.jsx` | Notification dispatch cadence selection: **Hourly Alerts**, **Every 6 Hours (Digest)**, **At Day End (Closeout)**; immediate robbery override toggle; channel toggles (In-App, Email, Push). | `GET /api/v1/notification-preferences/`<br>`PATCH /api/v1/notification-preferences/` |
| `/customer/profile` | `CustomerProfile.jsx` | Company profile, industry, primary contact person, email, phone, and active workforce contract details. | `GET /api/v1/customers/me/` |

---

## 3. LocalStorage Schemas to PostgreSQL Entity Mapping

| Existing LocalStorage Key | Existing Fields in Mock JSON | Target PostgreSQL Django Model | App Name |
| :--- | :--- | :--- | :--- |
| `worktrack_auth_state` | `isAuthenticated`, `role`, `user`, `selectedEmployeeId`, `selectedCustomerId` | `User`, `EmployeeProfile`, `CustomerProfile` | `accounts`, `employees`, `customers` |
| `worktrack_employees` | `id`, `name`, `employeeId`, `email`, `phone`, `roleTitle`, `department`, `joiningDate`, `status`, `avatar`, `assignedCustomerIds`, `currentShiftId` | `EmployeeProfile` (links to `User`), `EmployeeCustomerAssignment` | `employees`, `assignments` |
| `worktrack_customers` | `id`, `companyName`, `industry`, `contactPerson`, `email`, `phone`, `address`, `timezone`, `accountStatus`, `color`, `logoLetter` | `CustomerProfile` (links to `User`) | `customers` |
| `worktrack_shifts` | `id`, `name`, `startTime`, `endTime`, `color`, `type`, `description`, `isOvernight` | `Shift` | `shifts` |
| `worktrack_assignments` | `id`, `customerId`, `customerName`, `employeeId`, `employeeName`, `shiftId`, `shiftName`, `assignmentDate`, `status`, `notes` | `EmployeeCustomerAssignment`, `ShiftAssignment` | `assignments` |
| `worktrack_attendance` | `id`, `employeeId`, `employeeName`, `customerId`, `shiftId`, `date`, `checkInTime`, `checkOutTime`, `status`, `durationHours`, `isOvertime`, `locationVerified` | `Attendance` (links to `ShiftAssignment`) | `attendance` |
| `worktrack_reports` | `id`, `employeeId`, `customerId`, `shiftId`, `reportingDate`, `submittedAt`, `lastUpdatedAt`, `workCompleted`, `pendingTasks`, `issues`, `additionalRemarks`, `version`, `status`, `attachments`, `versionHistory`, `comments` | `DailyReport`, `ReportVersion`, `ReportAttachment`, `ReportComment` | `reports`, `feedback` |
| `worktrack_notifications` | `id`, `targetRole`, `targetId`, `targetCustomerId`, `targetEmployeeId`, `type`, `title`, `message`, `timestamp`, `isRead`, `link`, `meta` | `Notification` | `notifications` |
| `worktrack_notification_settings`| `frequency`, `immediateAlertOnSuspicious`, `channels`, `events` | `NotificationPreference` | `notifications` |
| `worktrack_surveillance_batches` | `id`, `customerId`, `employeeId`, `date`, `hourSlot`, `hour24`, `status`, `totalCameras`, `flaggedSuspiciousCount`, `overallAssessment`, `actionsTaken`, `snapshots` | `SurveillanceBatch`, `CameraSnapshot` | `reports` / `surveillance` |

---

## 4. Business Workflow & State Transition Logic

### 4.1 Attendance Punch Workflow
```
[Shift Scheduled]
       │
       ▼
[Employee Logs In] ──▶ Calls POST /api/v1/attendance/check-in/
                           ├── Validates: Assigned to active shift today
                           ├── Validates: No existing open check-in
                           └── Creates Attendance record with check_in = timezone.now(), status = 'PRESENT'
       │
       ▼
[Shift Completion] ──▶ Calls POST /api/v1/attendance/check-out/
                           ├── Validates: Active check-in exists
                           ├── Validates: check_out > check_in
                           └── Updates Attendance with check_out = timezone.now(), calculates duration_hours
```

### 4.2 Daily Shift Report Submission & Version Snapshotting
```
[Report Form Opened] ──▶ Pre-fills today's ShiftAssignment
       │
       ▼
[Save Draft / Initial Submit] ──▶ Calls POST /api/v1/reports/
                                      ├── Creates DailyReport (status = 'SUBMITTED', version = 1)
                                      ├── Creates ReportVersion 1 (complete JSON snapshot)
                                      └── Triggers Notification event to Customer
       │
       ▼
[Employee Edits Report Later] ──▶ Calls PATCH /api/v1/reports/{id}/
                                      ├── Updates DailyReport fields & increments version
                                      ├── Creates ReportVersion N (stores snapshot & change_summary)
                                      └── Triggers "Report Updated" notification event
```

### 4.3 Client Feedback & Threaded Replies
```
[Customer Reads Report] ──▶ Calls POST /api/v1/reports/{id}/comments/
                                ├── Validates: Customer owns the report
                                ├── Creates ReportComment (parent_comment = null)
                                └── Dispatches notification to assigned Employee & Admin
       │
       ▼
[Employee Replies] ──▶ Calls POST /api/v1/comments/{id}/reply/
                           ├── Validates: Employee assigned to this report
                           ├── Creates ReportComment (parent_comment = id)
                           └── Dispatches notification to Customer
```

---

## 5. Security & Isolation Matrix

| Actor | Access Scope | Strict Permissions Enforced by Backend |
| :--- | :--- | :--- |
| **Administrator** | Global read/write across all tenants | `IsAdmin` permission class. Can create/edit users, assign shifts, modify settings, and view all audit logs. |
| **Employee** | Self data + assigned client accounts only | `IsEmployee` + `IsAssignedEmployee`. Can only view shifts assigned to them, check into their own shifts, submit their own daily reports, and view/reply to comments on their reports. Cannot view other employees' records or unassigned customers. |
| **Customer** | Own tenant data only | `IsCustomer` + `IsAssignedCustomer`. Querysets strictly filtered by `customer = request.user.customer_profile`. Cannot view other customers' reports, employees not assigned to their locations, or internal admin settings. |

---

## 6. Frontend Integration Blueprint (Phase 11 Preparation)

When integrating the React frontend with the Django API:
1. Replace `localStorage` mock state in `src/context/AuthContext.jsx` with real JWT authentication (`access` & `refresh` tokens stored securely in memory/HTTP-only cookies).
2. Create `src/services/apiClient.js` with Axios interceptors to automatically attach `Authorization: Bearer <token>` and handle silent token refresh via `POST /api/v1/auth/refresh/`.
3. Update `src/context/AppContext.jsx` to fetch real data from Django endpoints on mount and persona change.
4. Keep `localStorage` strictly for non-sensitive local UI state (such as the collapsible sidebar collapsed/expanded preference `worktrack_sidebar_collapsed`).

