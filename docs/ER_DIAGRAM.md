# 📊 Entity Relationship Diagram (ERD): WorkTrack

> **Format:** Mermaid ER Syntax  
> **Schema Version:** 1.0.0  
> **Consistency Reference:** Aligned with [DATABASE_DESIGN.md](DATABASE_DESIGN.md)

---

## 1. Visual Entity Relationship Diagram

```mermaid
erDiagram
    User ||--o| EmployeeProfile : "has (1:1)"
    User ||--o| CustomerProfile : "has (1:1)"
    User ||--o{ Notification : "receives (1:N)"
    User ||--o{ PushDevice : "registers (1:N)"
    User ||--o{ ActivityLog : "triggers (1:N)"

    EmployeeProfile ||--o{ EmployeeCustomerAssignment : "assigned_to (1:N)"
    CustomerProfile ||--o{ EmployeeCustomerAssignment : "contracts (1:N)"
    CustomerProfile ||--o| NotificationPreference : "configures (1:1)"

    EmployeeCustomerAssignment ||--o{ ShiftAssignment : "schedules (1:N)"
    Shift ||--o{ ShiftAssignment : "defines (1:N)"

    ShiftAssignment ||--|| Attendance : "records (1:1)"
    ShiftAssignment ||--|| DailyReport : "submits (1:1)"

    DailyReport ||--o{ ReportVersion : "preserves (1:N)"
    DailyReport ||--o{ ReportAttachment : "attaches (1:N)"
    DailyReport ||--o{ ReportComment : "discusses (1:N)"
    ReportComment ||--o{ ReportComment : "replies_to (1:N recursive)"

    CustomerProfile ||--o{ SurveillanceBatch : "monitors (1:N)"
    EmployeeProfile ||--o{ SurveillanceBatch : "audits (1:N)"
    SurveillanceBatch ||--o{ CameraSnapshot : "contains (1:N)"

    User {
        uuid id PK
        string email UK
        string username UK
        string role
        string first_name
        string last_name
        boolean is_active
        boolean is_staff
        timestamptz date_joined
    }

    EmployeeProfile {
        uuid id PK
        uuid user_id FK
        string employee_code UK
        string designation
        string department
        string phone
        date joining_date
        string status
    }

    CustomerProfile {
        uuid id PK
        uuid user_id FK
        string customer_code UK
        string company_name
        string contact_person
        string phone
        string timezone
        boolean is_active
    }

    EmployeeCustomerAssignment {
        uuid id PK
        uuid employee_id FK
        uuid customer_id FK
        uuid assigned_by_id FK
        string status
        text notes
        timestamptz created_at
    }

    Shift {
        uuid id PK
        string name
        time start_time
        time end_time
        boolean is_overnight
        string color_tag
        boolean is_active
    }

    ShiftAssignment {
        uuid id PK
        uuid employee_customer_assignment_id FK
        uuid shift_id FK
        date shift_date
        uuid assigned_by_id FK
        string status
        timestamptz created_at
    }

    Attendance {
        uuid id PK
        uuid shift_assignment_id FK,UK
        timestamptz check_in
        timestamptz check_out
        string attendance_status
        decimal duration_hours
        boolean location_verified
    }

    DailyReport {
        uuid id PK
        uuid shift_assignment_id FK,UK
        string title
        text work_summary
        text tasks_completed
        text pending_tasks
        text issues_or_blockers
        int version
        string status
        timestamptz submitted_at
        uuid created_by_id FK
        uuid updated_by_id FK
    }

    ReportVersion {
        uuid id PK
        uuid daily_report_id FK
        int version_number
        string title_snapshot
        jsonb content_snapshot
        uuid modified_by_id FK
        timestamptz modified_at
        text change_summary
    }

    ReportAttachment {
        uuid id PK
        uuid daily_report_id FK
        uuid uploaded_by_id FK
        string file
        string file_name
        string file_type
        int file_size
        timestamptz uploaded_at
    }

    ReportComment {
        uuid id PK
        uuid daily_report_id FK
        uuid parent_comment_id FK
        uuid author_id FK
        text content
        boolean is_edited
        timestamptz created_at
    }

    SurveillanceBatch {
        string id PK
        uuid customer_id FK
        uuid employee_id FK
        date date
        string hour_slot
        string hour24
        string status
        int total_cameras
        int flagged_suspicious_count
        text overall_assessment
        text actions_taken
        timestamptz submitted_at
        boolean customer_notified
    }

    CameraSnapshot {
        string id PK
        string batch_id FK
        string camera_id
        string camera_name
        string zone
        boolean is_high_risk
        boolean human_detected
        int human_count
        string ai_status
        string ai_confidence
        text ai_analysis
        string employee_verification
        text employee_notes
    }

    NotificationPreference {
        uuid id PK
        uuid customer_id FK,UK
        string frequency
        boolean immediate_alert_on_suspicious
        boolean in_app_enabled
        boolean email_enabled
        boolean push_enabled
    }

    Notification {
        uuid id PK
        uuid recipient_id FK
        uuid customer_id FK
        uuid daily_report_id FK
        string event_type
        string title
        text message
        string channel
        string delivery_status
        timestamptz scheduled_at
        timestamptz read_at
    }

    PushDevice {
        uuid id PK
        uuid user_id FK
        string device_token
        string device_type
        timestamptz last_active_at
    }

    ActivityLog {
        uuid id PK
        uuid user_id FK
        string action
        string entity_type
        string entity_id
        text description
        string ip_address
        timestamptz created_at
    }
```

---

## 2. Cardinality Analysis & Relationship Rules

1. **User to Profiles (1:1 Optional):** A user has at most one profile type (`EmployeeProfile` if role is `EMPLOYEE`, or `CustomerProfile` if role is `CUSTOMER`). Administrators do not require a sub-profile.
2. **Employee to Customer Allocation (M:N via Intermediary):** Governed exclusively by `EmployeeCustomerAssignment`. Prevents duplicate active contracts with database-level uniqueness.
3. **ShiftAssignment to Attendance (1:1 Strict):** An attendance punch cannot exist without an underlying scheduled shift.
4. **ShiftAssignment to DailyReport (1:1 Strict):** Exactly one daily report is filed per shift, ensuring a direct 1-to-1 operational pairing between time on site and work completed.
5. **DailyReport to ReportVersion (1:N Compositional):** Deleting a daily report cascades to its versions, but modifying a report appends to `ReportVersion` without destructive overwrites.
6. **Threaded Comment Hierarchy (Recursive 1:N):** `ReportComment.parent_comment_id` points to `ReportComment.id`, enabling multi-level nested replies between store owners and staff.
7. **Surveillance Batch to Snapshots (1:10 Fixed Aggregate):** Each hourly batch aggregates 10 camera frame records corresponding to the physical store's camera layout.

