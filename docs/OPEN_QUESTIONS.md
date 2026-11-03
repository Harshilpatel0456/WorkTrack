# ❓ Open Architectural Questions & Unresolved Decisions: WorkTrack

> **Status:** `OPEN SPECIFICATION REVIEW`  
> **Reviewers:** Project Guide, System Architect & Product Owner  
> **Rule:** Unresolved requirements must be formally evaluated rather than silently assumed in production code.

---

## 1. Catalog of Open Questions

### Q-01: Automated "LATE" Attendance Determination & Grace Periods
* **Question:** Should the backend automatically assign `attendance_status = 'LATE'` when an employee punches in after the scheduled shift start time, or should this require human supervisor confirmation?
* **Current Implementation:** Currently defaults to `PRESENT` upon check-in, allowing manual supervisor qualification or time-delta comparison.
* **Options to Decide:**
  1. Strict automated threshold: Mark `LATE` if `check_in > shift.start_time`.
  2. Grace-period threshold: Mark `LATE` only if `check_in > shift.start_time + 15 minutes`.
  3. Supervisor-only review: Always mark `PRESENT` initially, requiring admin/supervisor approval for penalties.

---

### Q-02: Client Report Export Formats (PDF / Excel / CSV)
* **Question:** Do customer store owners require one-click export of daily reports and CCTV audit summaries as downloadable PDF or Excel documents?
* **Current Implementation:** Reports and versions are viewed and audited live within the React client and Swagger API.
* **Options to Decide:**
  1. Client-side PDF rendering using browser print styles or `jspdf`.
  2. Server-side PDF generation via `WeasyPrint` or `ReportLab` attached to email digests.
  3. Export to structured CSV / Excel (`openpyxl`) for accounting audit imports.

---

### Q-03: Administrative Manual Attendance Overrides
* **Question:** If an employee forgets their mobile device or loses connectivity on site, should an Administrator have the privilege to manually insert or correct check-in/out times?
* **Current Implementation:** Check-in and check-out are restricted strictly to the assigned employee to preserve non-repudiation.
* **Options to Decide:**
  1. Permit Admin manual edits, but record an immutable `ActivityLog` noting `ACTION=MANUAL_ATTENDANCE_OVERRIDE` and requiring a mandatory justification note.
  2. Disallow manual edits entirely; require a separate "missed punch dispute" workflow.

---

### Q-04: Formal Employee Leave & PTO Request Workflow
* **Question:** Should employees have a dedicated portal tab to request planned vacation, sick leave, or shift swaps?
* **Current Implementation:** Out of scope for MVP; administrators schedule shifts directly around employee availability.
* **Options to Decide:**
  1. Implement a `LeaveRequest` model with `PENDING`, `APPROVED`, `REJECTED` states in Phase 2.
  2. Handle leave externally via HR software and reflect it manually in shift scheduling.

---

### Q-05: Recurring Shift Templates vs. Explicit Daily Rostering
* **Question:** Should the backend support automatic recurring shift schedules (e.g. "Assign Aarav to Acme Store Morning shift every Monday through Friday indefinitely")?
* **Current Implementation:** Shifts are rostered as individual `ShiftAssignment` records linked to explicit calendar dates (`shift_date`).
* **Options to Decide:**
  1. Implement a `RecurringShiftRule` model and Celery beat job that generates daily `ShiftAssignment` instances 14 days in advance.
  2. Maintain explicit batch creation by administrators to avoid scheduling unworked phantom shifts during client holidays.

---

### Q-06: Real-Time WebSocket Alerts vs. Periodic Polling
* **Question:** For emergency robbery hotspot alerts in retail stores, is periodic HTTP polling (every 30 seconds) sufficient, or is a persistent WebSocket connection via Django Channels required?
* **Current Implementation:** Frontend polls `/api/v1/notifications/unread_count/` and `/api/v1/surveillance/batches/`; alerts are dispatched via email and in-app feeds.
* **Options to Decide:**
  1. Introduce Django Channels + ASGI for true sub-second bi-directional WebSocket pushes to on-duty supervisors.
  2. Continue using lightweight HTTP polling and WebPush service workers to minimize server socket overhead.

---

### Q-07: Mandatory vs. Optional Report Attachments
* **Question:** Should daily reports require at least one photo or document attachment before allowing submission?
* **Current Implementation:** Attachments (`ReportAttachment`) are optional; reports can be submitted with textual work summaries alone.
* **Options to Decide:**
  1. Make attachments optional globally (current).
  2. Make attachments mandatory only for specific shift types (e.g., closing shifts requiring a photo of the locked safe room).

