# 🧪 Automated Testing Strategy & Test Suite: WorkTrack

> **Testing Frameworks:** `pytest 8.3` | `pytest-django 4.14` | DRF `APIClient`  
> **Test Status:** 19 Passed (100% Pass Rate across Unit & Integration Suites)  
> **Execution Location:** `backend/tests/`

---

## 1. Testing Philosophy & Quality Pyramid

WorkTrack's testing architecture emphasizes automated verification of high-risk business logic: authentication, sequential attendance enforcement, report version snapshotting, and multi-tenant data isolation.

```mermaid
pie title Test Suite Distribution
    "Authentication & JWT Security" : 21
    "Attendance & Punch Clock Rules" : 21
    "Daily Reports & Version Snapshots" : 26
    "Customer IDOR & RBAC Isolation" : 16
    "Surveillance & Dashboard KPIs" : 16
```

---

## 2. Test Suite Structure

```text
backend/
├── pytest.ini                    # Configuration with DJANGO_SETTINGS_MODULE
└── tests/
    ├── __init__.py
    ├── test_auth.py              # Login, JWT issuance, /auth/me/, invalid password tests
    ├── test_attendance.py        # Punch-in, duplicate prevention, punch-out duration tests
    ├── test_reports.py           # Report creation, version snapshotting, submission tests
    ├── test_isolation.py         # Customer IDOR isolation, RBAC privilege boundaries
    └── test_surveillance_and_dashboards.py # 10-camera audits, admin KPIs, employee/customer home feeds
```

---

## 3. Verified Automated Test Matrix

| Test Suite | Test Function Name | Tested Scenario & Assertion | Result |
| :--- | :--- | :--- | :---: |
| `test_auth.py` | `test_login_success` | Valid email & password returns 200 OK, JWT access & refresh tokens, user metadata. | **PASSED** |
| `test_auth.py` | `test_login_invalid_password` | Incorrect password returns HTTP 401 Unauthorized. | **PASSED** |
| `test_auth.py` | `test_current_user_me` | Authenticated Bearer request returns correct email and `EMPLOYEE` role. | **PASSED** |
| `test_auth.py` | `test_unauthenticated_me` | Request without token returns HTTP 401 Unauthorized. | **PASSED** |
| `test_attendance.py`| `test_check_in_success` | Assigned guard punches in; status is `PRESENT`; shift becomes `IN_PROGRESS`. | **PASSED** |
| `test_attendance.py`| `test_duplicate_check_in_prevented` | Second check-in attempt on same shift is rejected with HTTP 400 Bad Request. | **PASSED** |
| `test_attendance.py`| `test_checkout_without_checkin_fails`| Check-out attempt before check-in is rejected with HTTP 400 Bad Request. | **PASSED** |
| `test_attendance.py`| `test_check_out_success` | Valid check-out records timestamp, computes duration, marks shift `COMPLETED`. | **PASSED** |
| `test_isolation.py` | `test_customer2_cannot_access_customer1_reports` | **IDOR Shield:** Customer 2 queries Customer 1 report ID; returns HTTP 404. | **PASSED** |
| `test_isolation.py` | `test_customer1_can_access_their_own_report` | Customer 1 accesses their own store's report; returns HTTP 200 OK. | **PASSED** |
| `test_isolation.py` | `test_employee_cannot_create_customer_accounts` | Employee attempts to create customer account; returns HTTP 403 Forbidden. | **PASSED** |
| `test_reports.py` | `test_create_report_and_initial_version`| Creating daily report automatically creates initial `ReportVersion` #1 snapshot. | **PASSED** |
| `test_reports.py` | `test_update_report_increments_version_and_preserves_snapshot` | Modifying report increments version to 2 and preserves full JSON snapshot. | **PASSED** |
| `test_reports.py` | `test_submit_report` | Submitting draft transitions status to `SUBMITTED` with `submitted_at` set. | **PASSED** |
| `test_surveillance_and_dashboards.py` | `test_verify_camera_snapshot` | Guard verifies camera frame as `Flagged Suspicious`; persists audit notes. | **PASSED** |
| `test_surveillance_and_dashboards.py` | `test_submit_surveillance_batch` | Guard submits 1-hour package; batch marked `Submitted`, client alerted. | **PASSED** |
| `test_surveillance_and_dashboards.py` | `test_admin_dashboard_metrics`| Admin queries `/dashboard/admin/`; returns aggregated KPIs and weekly trends. | **PASSED** |
| `test_surveillance_and_dashboards.py` | `test_employee_dashboard` | Guard queries `/dashboard/employee/`; returns active shift & punch status. | **PASSED** |
| `test_surveillance_and_dashboards.py` | `test_customer_dashboard` | Client queries `/dashboard/customer/`; returns store coverage and reports. | **PASSED** |

---

## 4. Test Execution Instructions

### Running the Complete Suite
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m pytest
```

### Running Specific Suites with Verbosity
```powershell
# Run only IDOR isolation tests
python -m pytest tests/test_isolation.py -v

# Run only attendance tests
python -m pytest tests/test_attendance.py -v

# Run with test coverage report
python -m pytest --cov=apps tests/
```

