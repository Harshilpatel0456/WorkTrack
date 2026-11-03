# 👥 User Roles & Permissions Matrix: WorkTrack

> **Authorization Model:** Role-Based Access Control (RBAC)  
> **Roles:** System Administrator (`ADMIN`), Field Staff (`EMPLOYEE`), Store Owner (`CUSTOMER`)

---

## 1. Role Definitions

* **Administrator (`ADMIN`):** System operators with unrestricted governance over user accounts, master shifts, contract assignments, organizational settings, and company-wide KPI analytics.
* **Employee (`EMPLOYEE`):** Field personnel (guards, technicians, floor supervisors) who view their shift roster, record attendance, draft/submit daily reports, audit CCTV camera snapshots, and reply to client inquiries.
* **Customer (`CUSTOMER`):** Commercial clients (retail store owners, facility managers) who view contracted staff on site, review submitted daily reports, inspect hourly surveillance audits, post feedback, and configure notification frequencies.

---

## 2. Comprehensive RBAC Permissions Matrix

Legend:
* **C:** Create
* **R:** Read (View / List / Detail)
* **U:** Update / Edit
* **D:** Delete / Deactivate
* **A:** Approve / Verify / Submit
* **--:** No Access (Blocked by server permissions)

| Module / Resource | Administrator (`ADMIN`) | Employee (`EMPLOYEE`) | Customer (`CUSTOMER`) | Enforcement Class / Method |
| :--- | :---: | :---: | :---: | :--- |
| **Authentication & Profile** |
| Login / Refresh Token | C, R | C, R | C, R | `AllowAny` (Public) |
| Public Self-Registration | -- *(Disabled)* | C | C | `AllowAny` (Admin prohibited) |
| Password Reset / Recovery | C, U | C, U | C, U | `AllowAny` (Cryptographic Token) |
| View Own Profile (`/auth/me/`) | R | R | R | `IsAuthenticated` |
| Change Own Password | U | U | U | `IsAuthenticated` |
| **Employee Management** |
| View Employees List | C, R, U, D | -- | R *(Assigned Only)* | `IsAdmin` / Customer QuerySet Filter |
| Create Employee Account | C | -- | -- | `IsAdmin` |
| Update Employee Details | U | U *(Avatar only)* | -- | `IsAdmin` / Custom Profile View |
| Deactivate Employee | D | -- | -- | `IsAdmin` |
| **Customer Management** |
| View Customers List | C, R, U, D | R *(Assigned Only)* | R *(Own Profile)* | `IsAdmin` / Tenancy Scoping |
| Create Customer Account | C | -- | -- | `IsAdmin` |
| Update Customer Profile | U | -- | U *(Timezone/Phone)*| `IsAdmin` / `IsCustomer` |
| Deactivate Customer | D | -- | -- | `IsAdmin` |
| **Contract Allocations** |
| Create Contract Assignment | C | -- | -- | `IsAdmin` |
| View Contract Assignments | R | R *(Own Only)* | R *(Own Store Only)*| Tenancy Scoping QuerySet |
| Revoke / Update Assignment | U, D | -- | -- | `IsAdmin` |
| **Shift Templates & Scheduling**|
| Create Shift Templates | C, U, D | -- | -- | `IsAdmin` |
| View Shift Templates | R | R | R | `IsAuthenticated` |
| Schedule Shift Assignment | C, U, D | -- | -- | `IsAdmin` |
| View Shift Schedules | R | R *(Assigned Only)* | R *(Own Store Only)*| Tenancy Scoping QuerySet |
| **Attendance Punch Engine** |
| Execute Check-In / Check-Out | C, U | C, U *(Own Shift)* | -- | `IsEmployee` / Ownership Check |
| View Attendance History | R | R *(Own History)* | R *(Assigned Staff)*| Tenancy Scoping QuerySet |
| Modify Attendance Record | U | -- | -- | `IsAdmin` |
| **Daily Reports & Versions** |
| Create Draft Report | C | C *(Assigned Shift)*| -- | `IsEmployee` |
| Submit Daily Report | A | A *(Assigned Shift)*| -- | `IsEmployee` |
| Edit Submitted Report | U | U *(Assigned Shift)*| -- | Versioning Middleware |
| View Daily Reports | R | R *(Authored)* | R *(Submitted Store)*| Status & Tenancy Scoping |
| View Report Versions | R | R | R *(Submitted Store)*| `IsAuthenticated` |
| Upload Attachments (Photos) | C | C | -- | `IsAuthenticated` |
| View Shift-Wise Comparison | R | R | R | `IsAuthenticated` |
| **Feedback & Discussion** |
| Post Report Comment | C | -- | C *(Own Store)* | `IsCustomer` |
| Reply to Report Comment | C | C *(Assigned Staff)*| C *(Own Store)* | `IsAuthenticated` |
| View Comment Thread | R | R *(Assigned Staff)*| R *(Own Store)* | Tenancy Scoping QuerySet |
| **Hourly CCTV Surveillance** |
| View Surveillance Batches | R | R *(Assigned Staff)*| R *(Submitted Store)*| Status & Tenancy Scoping |
| Verify Camera Snapshots | U, A | U, A *(Assigned)* | -- | `IsEmployee` |
| Submit 1-Hour Batch Package | A | A *(Assigned)* | -- | `IsEmployee` |
| **Notifications & Preferences** |
| View Own Notifications | R | R | R | Recipient Scoping |
| Mark Notifications Read | U | U | U | Recipient Scoping |
| Configure Digest Frequency | R, U | -- | R, U *(Own Store)* | `IsCustomer` |
| **Dashboards & Analytics** |
| Admin Global KPI Console | R | -- | -- | `IsAdmin` |
| Employee Guard Home Console | -- | R | -- | `IsEmployee` |
| Customer Transparency Console | -- | -- | R | `IsCustomer` |
| Audit Activity Logs | R | -- | -- | `IsAdmin` |

