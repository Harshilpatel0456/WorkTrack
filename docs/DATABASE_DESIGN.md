# 💾 Database Design & Relational Schema: WorkTrack

> **Target Database:** PostgreSQL 15+ (Local dev supports SQLite 3.38+)  
> **ORM Engine:** Django ORM  
> **Primary Key Strategy:** UUIDv4 on all transactional and user entities

---

## 1. Relational Data Dictionary

### 1.1 `accounts_user` (Custom User Model)
* **Inherits:** `django.contrib.auth.models.AbstractUser`
* **Purpose:** Core identity and authentication table supporting email-based credentials.

| Column | Data Type | Constraints & Modifiers | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, Default `uuid_generate_v4()` | Unique user identifier |
| `email` | `VARCHAR(254)` | `UNIQUE`, `NOT NULL`, `INDEX` | Login username credential |
| `username` | `VARCHAR(150)` | `UNIQUE`, `NOT NULL` | System slug (synced with email) |
| `role` | `VARCHAR(20)` | `NOT NULL`, Choices: `ADMIN`, `EMPLOYEE`, `CUSTOMER` | User role identifier |
| `first_name` | `VARCHAR(150)` | `NOT NULL` | First name |
| `last_name` | `VARCHAR(150)` | `NOT NULL` | Last name |
| `is_active` | `BOOLEAN` | `DEFAULT TRUE` | Soft-deletion flag |
| `is_staff` | `BOOLEAN` | `DEFAULT FALSE` | Django admin portal access |
| `date_joined` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Account creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `AUTO NOW` | Last update timestamp |

---

### 1.2 `employees_employeeprofile`
* **Purpose:** Stores HR, operational, and organizational metadata for employees.

| Column | Data Type | Constraints & Modifiers | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, Default `uuid_generate_v4()` | Profile record ID |
| `user_id` | `UUID` | `ONE-TO-ONE` $\rightarrow$ `accounts_user.id`, `CASCADE` | Linked user account |
| `employee_code`| `VARCHAR(30)` | `UNIQUE`, `NOT NULL`, `INDEX` | Unique employee badge (e.g. `EMP-AARAV`) |
| `phone` | `VARCHAR(30)` | `NULLABLE` | Contact phone number |
| `designation` | `VARCHAR(100)` | `DEFAULT 'Field Specialist'` | Role title |
| `department` | `VARCHAR(100)` | `DEFAULT 'Operations'` | Operational department |
| `profile_image`| `VARCHAR(100)` | `NULLABLE` | Avatar file path (`employees/avatars/`) |
| `address` | `TEXT` | `NULLABLE` | Residential address |
| `joining_date` | `DATE` | `DEFAULT CURRENT_DATE` | Date employee joined organization |
| `status` | `VARCHAR(20)` | Choices: `ACTIVE`, `INACTIVE`, `ON_LEAVE` | Employment operational status |
| `created_at` | `TIMESTAMPTZ` | `AUTO NOW ADD` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `AUTO NOW` | Last update timestamp |

---

### 1.3 `customers_customerprofile`
* **Purpose:** Stores client company and facility metadata.

| Column | Data Type | Constraints & Modifiers | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, Default `uuid_generate_v4()` | Customer record ID |
| `user_id` | `UUID` | `ONE-TO-ONE` $\rightarrow$ `accounts_user.id`, `CASCADE` | Linked client account |
| `customer_code`| `VARCHAR(30)` | `UNIQUE`, `NOT NULL`, `INDEX` | Client code (e.g. `CUST-ACME-104`) |
| `company_name` | `VARCHAR(255)` | `NOT NULL`, `INDEX` | Client business name |
| `contact_person`| `VARCHAR(255)` | `NOT NULL` | Primary site contact |
| `phone` | `VARCHAR(30)` | `NULLABLE` | Contact phone |
| `address` | `TEXT` | `NULLABLE` | Store address / facility location |
| `timezone` | `VARCHAR(50)` | `DEFAULT 'America/New_York'` | Operating timezone for report display |
| `is_active` | `BOOLEAN` | `DEFAULT TRUE` | Client status flag |
| `created_at` | `TIMESTAMPTZ` | `AUTO NOW ADD` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `AUTO NOW` | Last update timestamp |

---

### 1.4 `assignments_employeecustomerassignment`
* **Purpose:** Models contract allocations pairing employees to client facilities.

| Column | Data Type | Constraints & Modifiers | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, Default `uuid_generate_v4()` | Assignment ID |
| `employee_id` | `UUID` | `FOREIGN KEY` $\rightarrow$ `employees_employeeprofile.id`, `CASCADE` | Assigned employee |
| `customer_id` | `UUID` | `FOREIGN KEY` $\rightarrow$ `customers_customerprofile.id`, `CASCADE` | Target customer |
| `assigned_by_id`| `UUID` | `FOREIGN KEY` $\rightarrow$ `accounts_user.id`, `PROTECT` | Admin who created assignment |
| `status` | `VARCHAR(20)` | Choices: `PENDING`, `ACTIVE`, `REVOKED` | Contract assignment state |
| `notes` | `TEXT` | `NULLABLE` | Assignment instructions |
| `created_at` | `TIMESTAMPTZ` | `AUTO NOW ADD` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `AUTO NOW` | Last update timestamp |

* **Constraints:** `UniqueConstraint(fields=['employee', 'customer', 'status'], condition=Q(status='ACTIVE'))` to prevent duplicate active pairings.

---

### 1.5 `shifts_shift` (Shift Template)
* **Purpose:** Standard shift time blocks reusable across assignments.

| Column | Data Type | Constraints & Modifiers | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, Default `uuid_generate_v4()` | Shift template ID |
| `name` | `VARCHAR(100)` | `NOT NULL` | Shift name (Morning, Afternoon, Night) |
| `start_time` | `TIME` | `NOT NULL` | Shift start (e.g. `06:00:00`) |
| `end_time` | `TIME` | `NOT NULL` | Shift end (e.g. `14:00:00`) |
| `description` | `TEXT` | `NULLABLE` | Shift briefing |
| `is_overnight` | `BOOLEAN` | `DEFAULT FALSE` | True if shift crosses midnight |
| `color_tag` | `VARCHAR(20)` | `DEFAULT '#3B82F6'` | UI badge color hex |
| `is_active` | `BOOLEAN` | `DEFAULT TRUE` | Availability flag |
| `created_at` | `TIMESTAMPTZ` | `AUTO NOW ADD` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `AUTO NOW` | Last update timestamp |

---

### 1.6 `shifts_shiftassignment` (Scheduled Shift)
* **Purpose:** Binds an employee-customer contract to a specific date and shift template.

| Column | Data Type | Constraints & Modifiers | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, Default `uuid_generate_v4()` | Scheduled shift ID |
| `employee_customer_assignment_id` | `UUID` | `FOREIGN KEY` $\rightarrow$ `assignments.id`, `CASCADE` | Linked active contract |
| `shift_id` | `UUID` | `FOREIGN KEY` $\rightarrow$ `shifts_shift.id`, `PROTECT` | Assigned shift template |
| `shift_date` | `DATE` | `NOT NULL`, `INDEX` | Calendar date of shift start |
| `assigned_by_id` | `UUID` | `FOREIGN KEY` $\rightarrow$ `accounts_user.id`, `PROTECT` | Admin who scheduled shift |
| `status` | `VARCHAR(20)` | Choices: `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` | Shift lifecycle status |
| `created_at` | `TIMESTAMPTZ` | `AUTO NOW ADD` | Scheduling timestamp |
| `updated_at` | `TIMESTAMPTZ` | `AUTO NOW` | Last update timestamp |

---

### 1.7 `attendance_attendance`
* **Purpose:** Immutable check-in and check-out tracking for each shift assignment.

| Column | Data Type | Constraints & Modifiers | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, Default `uuid_generate_v4()` | Attendance record ID |
| `shift_assignment_id` | `UUID` | `ONE-TO-ONE` $\rightarrow$ `shifts_shiftassignment.id`, `CASCADE` | Shift being punched |
| `check_in` | `TIMESTAMPTZ` | `NULLABLE`, `INDEX` | Punch-in UTC timestamp |
| `check_out` | `TIMESTAMPTZ` | `NULLABLE` | Punch-out UTC timestamp |
| `attendance_status` | `VARCHAR(20)` | Choices: `PRESENT`, `LATE`, `ABSENT`, `HALF_DAY`, `OVERTIME` | Attendance qualification |
| `duration_hours` | `NUMERIC(5,2)` | `DEFAULT 0.00` | Calculated duration in hours |
| `notes` | `TEXT` | `NULLABLE` | Check-in / check-out notes |
| `location_verified` | `BOOLEAN` | `DEFAULT TRUE` | Geofence verification flag |
| `created_at` | `TIMESTAMPTZ` | `AUTO NOW ADD` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `AUTO NOW` | Last update timestamp |

---

### 1.8 `reports_dailyreport`
* **Purpose:** Single source of operational truth for shift activity.

| Column | Data Type | Constraints & Modifiers | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, Default `uuid_generate_v4()` | Daily report ID |
| `shift_assignment_id` | `UUID` | `ONE-TO-ONE` $\rightarrow$ `shifts_shiftassignment.id`, `CASCADE` | Shift being reported |
| `title` | `VARCHAR(255)` | `NOT NULL` | Shift report title |
| `work_summary` | `TEXT` | `NOT NULL` | Comprehensive executive briefing |
| `tasks_completed` | `TEXT` | `NULLABLE` | Completed checklist items |
| `pending_tasks` | `TEXT` | `NULLABLE` | Unfinished tasks for handover |
| `issues_or_blockers`| `TEXT` | `NULLABLE` | Security incidents or blockers |
| `additional_remarks`| `TEXT` | `NULLABLE` | Supplementary notes |
| `version` | `INTEGER` | `DEFAULT 1` | Monotonically incrementing revision counter |
| `status` | `VARCHAR(20)` | Choices: `DRAFT`, `SUBMITTED` | Visibility state |
| `submitted_at` | `TIMESTAMPTZ` | `NULLABLE`, `INDEX` | Submission timestamp |
| `last_updated_at` | `TIMESTAMPTZ` | `NULLABLE` | Last modification timestamp |
| `created_by_id` | `UUID` | `FOREIGN KEY` $\rightarrow$ `accounts_user.id`, `PROTECT` | Report author |
| `updated_by_id` | `UUID` | `FOREIGN KEY` $\rightarrow$ `accounts_user.id`, `PROTECT` | Last editor |
| `created_at` | `TIMESTAMPTZ` | `AUTO NOW ADD` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `AUTO NOW` | Last update timestamp |

---

### 1.9 `reports_reportversion`
* **Purpose:** Immutable audit snapshots preserved on every report update.

| Column | Data Type | Constraints & Modifiers | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, Default `uuid_generate_v4()` | Version snapshot ID |
| `daily_report_id` | `UUID` | `FOREIGN KEY` $\rightarrow$ `reports_dailyreport.id`, `CASCADE` | Parent report |
| `version_number` | `INTEGER` | `NOT NULL` | Snapshot revision number |
| `title_snapshot` | `VARCHAR(255)` | `NOT NULL` | Title at time of revision |
| `content_snapshot` | `JSONB` | `NOT NULL` | Complete serialized JSON state of all fields |
| `modified_by_id` | `UUID` | `FOREIGN KEY` $\rightarrow$ `accounts_user.id`, `PROTECT` | User who made revision |
| `modified_at` | `TIMESTAMPTZ` | `AUTO NOW ADD` | Snapshot timestamp |
| `change_summary` | `TEXT` | `BLANK=TRUE` | User-provided changelog note |

* **Constraints:** `UniqueConstraint(fields=['daily_report', 'version_number'])`.

---

### 1.10 `reports_reportattachment`
* **Purpose:** Supporting files (incident photos, maintenance receipts, logs).

| Column | Data Type | Constraints & Modifiers | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, Default `uuid_generate_v4()` | Attachment ID |
| `daily_report_id` | `UUID` | `FOREIGN KEY` $\rightarrow$ `reports_dailyreport.id`, `CASCADE` | Parent report |
| `uploaded_by_id` | `UUID` | `FOREIGN KEY` $\rightarrow$ `accounts_user.id`, `PROTECT` | Uploader user |
| `file` | `VARCHAR(100)` | `NOT NULL` | Storage path (`reports/attachments/%Y/%m/`) |
| `file_name` | `VARCHAR(255)` | `NOT NULL` | Original filename |
| `file_type` | `VARCHAR(100)` | `NOT NULL` | MIME type (e.g. `application/pdf`) |
| `file_size` | `INTEGER` | `NOT NULL` | File size in bytes (max 10MB) |
| `uploaded_at` | `TIMESTAMPTZ` | `AUTO NOW ADD` | Upload timestamp |

---

### 1.11 `feedback_reportcomment`
* **Purpose:** Threaded communication between store owners and assigned staff.

| Column | Data Type | Constraints & Modifiers | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, Default `uuid_generate_v4()` | Comment ID |
| `daily_report_id` | `UUID` | `FOREIGN KEY` $\rightarrow$ `reports_dailyreport.id`, `CASCADE` | Target report |
| `parent_comment_id`| `UUID` | `FOREIGN KEY` $\rightarrow$ `feedback_reportcomment.id`, `NULLABLE`, `CASCADE` | Parent comment for nested reply |
| `author_id` | `UUID` | `FOREIGN KEY` $\rightarrow$ `accounts_user.id`, `PROTECT` | Author user |
| `content` | `TEXT` | `NOT NULL` | Comment content |
| `is_edited` | `BOOLEAN` | `DEFAULT FALSE` | Edit indicator |
| `created_at` | `TIMESTAMPTZ` | `AUTO NOW ADD` | Timestamp |
| `updated_at` | `TIMESTAMPTZ` | `AUTO NOW` | Last edit timestamp |

---

### 1.12 `surveillance_surveillancebatch`
* **Purpose:** Hourly 10-camera inspection packages.

| Column | Data Type | Constraints & Modifiers | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(50)` | `PRIMARY KEY` (e.g. `BATCH-20261031-1000`) | Human-readable batch key |
| `customer_id` | `UUID` | `FOREIGN KEY` $\rightarrow$ `customers.id`, `CASCADE` | Target client store |
| `employee_id` | `UUID` | `FOREIGN KEY` $\rightarrow$ `employees.id`, `PROTECT` | Assigned reviewing guard |
| `date` | `DATE` | `NOT NULL`, `INDEX` | Audit date |
| `hour_slot` | `VARCHAR(20)` | `NOT NULL` | Slot string (`10:00 - 11:00 AM`) |
| `hour24` | `VARCHAR(10)` | `NOT NULL` | 24-hr key (`10:00`) |
| `status` | `VARCHAR(30)` | Choices: `Ready for Review`, `Submitted` | Batch review status |
| `total_cameras` | `INTEGER` | `DEFAULT 10` | Total cameras in store layout |
| `flagged_suspicious_count` | `INTEGER` | `DEFAULT 0` | Anomaly count |
| `overall_assessment` | `TEXT` | `BLANK=TRUE` | Guard shift summary |
| `actions_taken` | `TEXT` | `BLANK=TRUE` | Corrective actions logged |
| `submitted_at` | `TIMESTAMPTZ` | `NULLABLE` | Audit completion time |
| `customer_notified` | `BOOLEAN` | `DEFAULT FALSE` | Client alert flag |

---

### 1.13 `surveillance_camerasnapshot`
* **Purpose:** Individual CCTV camera feed telemetry and employee verification.

| Column | Data Type | Constraints & Modifiers | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(50)` | `PRIMARY KEY` (e.g. `CAM-01-20261031-1000`) | Frame snapshot ID |
| `batch_id` | `VARCHAR(50)` | `FOREIGN KEY` $\rightarrow$ `surveillance_surveillancebatch.id`, `CASCADE` | Parent batch |
| `camera_id` | `VARCHAR(20)` | `NOT NULL` | Camera code (`CAM-01`) |
| `camera_name` | `VARCHAR(100)` | `NOT NULL` | Camera location description |
| `zone` | `VARCHAR(100)` | `NOT NULL` | Store zone (Zone A, Safe Room) |
| `is_high_risk` | `BOOLEAN` | `DEFAULT FALSE` | Robbery hotspot flag |
| `capture_time` | `VARCHAR(20)` | `NOT NULL` | Time string |
| `human_detected` | `BOOLEAN` | `DEFAULT FALSE` | AI human detector |
| `human_count` | `INTEGER` | `DEFAULT 0` | Person count detected |
| `ai_status` | `VARCHAR(20)` | Choices: `OK`, `Suspicious` | AI pre-analysis tag |
| `ai_confidence` | `VARCHAR(10)` | `DEFAULT '95%'` | Model confidence |
| `ai_analysis` | `TEXT` | `NOT NULL` | AI reasoning notes |
| `employee_verification`| `VARCHAR(30)` | Choices: `Verified OK`, `Flagged Suspicious`, `Pending` | Human operator audit |
| `employee_notes` | `TEXT` | `BLANK=TRUE` | Human observation |
| `simulated_visual` | `VARCHAR(50)` | `DEFAULT 'normal'` | Frame scene simulation key |

---

### 1.14 `notifications_notification` & `notifications_notificationpreference`
* **Purpose:** Multi-cadence alerting and client digest configuration.

| Table | Key Columns | Purpose |
| :--- | :--- | :--- |
| `notifications_notification` | `recipient_id`, `event_type`, `title`, `message`, `channel`, `delivery_status`, `scheduled_at`, `read_at` | Dispatched or queued notification records. |
| `notifications_notificationpreference`| `customer_id`, `frequency` (`INSTANT`, `HOURLY`, `6HOURS`, `DAILY`), `immediate_alert_on_suspicious` | Customer digest schedule and robbery override preferences. |
| `notifications_pushdevice` | `user_id`, `device_token`, `device_type`, `last_active_at` | Web push and mobile notification device tokens. |
| `audit_activitylog` | `user_id`, `action`, `entity_type`, `entity_id`, `description`, `ip_address`, `created_at` | Audit trail of administrative and operational actions. |

