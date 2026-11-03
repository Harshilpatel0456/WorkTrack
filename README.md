# WorkTrack: Employee Shift, Attendance & Daily Reporting Management System
## Tailored for US Retail Store CCTV & Hourly AI Surveillance Audits

> **Tagline:** Smart Workforce. Transparent Reporting.  
> **Target Scenario:** US Retail Store Security & Hourly Camera Snapshot Surveillance with AI Human Detection & Robbery Prevention.

👉 **Looking to run the project right now? See [HOW_TO_RUN.md](HOW_TO_RUN.md) for full setup & testing steps.**

---

## 📚 Complete Project Documentation Hub

All formal architecture, SRS, database, API, and engineering specifications are located in the [`docs/`](docs/) directory:

| Document | Purpose |
| :--- | :--- |
| [README.md (Docs Hub)](docs/README.md) | Central documentation index & navigation guide |
| [PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md) | Business problem, proposed solution, personas, and scope |
| [REQUIREMENTS.md](docs/REQUIREMENTS.md) | Comprehensive functional (FR) and non-functional (NFR) requirements catalog |
| [SOFTWARE_REQUIREMENTS_SPECIFICATION.md](docs/SOFTWARE_REQUIREMENTS_SPECIFICATION.md) | Academic IEEE Std 830-1998 formal SRS specification |
| [SYSTEM_ARCHITECTURE.md](docs/SYSTEM_ARCHITECTURE.md) | Multi-tier architecture, request-response lifecycles, and Mermaid diagrams |
| [DATABASE_DESIGN.md](docs/DATABASE_DESIGN.md) | PostgreSQL schema, model attributes, constraints, and indexes |
| [ER_DIAGRAM.md](docs/ER_DIAGRAM.md) | Entity-Relationship diagrams in Mermaid syntax |
| [API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) | Django REST Framework API contract, pagination, error schemas, OpenAPI |
| [API_ENDPOINT_MAPPING.md](docs/API_ENDPOINT_MAPPING.md) | Traceability matrix linking React components to `/api/v1/` endpoints |
| [AUTHENTICATION_AND_AUTHORIZATION.md](docs/AUTHENTICATION_AND_AUTHORIZATION.md) | Custom User model, email login, SimpleJWT token rotation, and RBAC |
| [BUSINESS_LOGIC.md](docs/BUSINESS_LOGIC.md) | Operational business rules, attendance invariants, and versioning rules |
| [USER_ROLES_AND_PERMISSIONS.md](docs/USER_ROLES_AND_PERMISSIONS.md) | CRUD privilege matrix across Admin, Employee, and Customer roles |
| [FRONTEND_DOCUMENTATION.md](docs/FRONTEND_DOCUMENTATION.md) | React 19 architecture, Vite setup, Tailwind CSS theme, and 28 routes |
| [BACKEND_DOCUMENTATION.md](docs/BACKEND_DOCUMENTATION.md) | Django 5.x app structure, serializers, views, permissions, and settings |
| [NOTIFICATION_SYSTEM.md](docs/NOTIFICATION_SYSTEM.md) | Multi-channel dispatch engine, client digest preferences, Celery tasks |
| [SECURITY_GUIDELINES.md](docs/SECURITY_GUIDELINES.md) | IDOR defenses, role isolation, password hashing, and CORS/CSRF safeguards |
| [TESTING_STRATEGY.md](docs/TESTING_STRATEGY.md) | Automated testing plan using pytest (19/19 passing test suite) |
| [DEVELOPMENT_SETUP.md](docs/DEVELOPMENT_SETUP.md) | Windows development guide for setting up Node, Python, and PostgreSQL |
| [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) | Production deployment architecture, Gunicorn, Nginx, HTTPS, and S3 |
| [DEVELOPMENT_ROADMAP.md](docs/DEVELOPMENT_ROADMAP.md) | Phased implementation schedule, milestones, and status indicators |
| [CODING_GUIDELINES.md](docs/CODING_GUIDELINES.md) | PEP 8, DRF conventions, React component standards, and Git conventions |
| [CHANGELOG.md](docs/CHANGELOG.md) | Semantic version release history and completed deliverables |
| [OPEN_QUESTIONS.md](docs/OPEN_QUESTIONS.md) | Catalog of open architectural decisions, assumptions, and edge cases |

---

## 🌟 Executive Overview: The Store Security Scenario

### The Problem
A US retail store client operates a multi-zone store equipped with multiple CCTV cameras. The store faces ongoing risks of **cash register robberies**, **safe room intrusions**, and **unattended cash theft**. In particular, the store owner has identified high-risk robbery hotspots:
- **Zone A: Front Cash Register #1 & Express Register #2** (Cash robbery & register drawer left unattended)
- **Zone B: Back-Office Safe Room Vault** (Cash deposit drop safe & restricted access)
- **Zone C: High-Value Electronics & Jewelry Vault** (Theft hotspot)
- **Zone D: Rear Emergency Exit & Alleyway** (Sneak exit escape route)

Because a security operator cannot sit and watch continuous video across all cameras 24/7 without fatigue, the store's surveillance protocol operates on a periodic **1-Hour Inspection Cadence**:
1. Every 1 hour, the system captures a batch of snapshot frames across all **10 store cameras**.
2. An automated **AI Human Detection & Scene Telemetry Engine** pre-analyzes each camera snapshot:
   - Identifies human presence (`Human Detected: Count X`).
   - Flags anomalies as `OK / Normal` or `Suspicious` (e.g. *Cashier drawer left open while unattended*, *Unauthorized human in Safe Room outside deposit window*, *Loitering near emergency exit*).
3. A remote security operator (an **Employee** in the WorkTrack portal) receives this hourly package of 10 camera screenshots.
4. The operator inspects each snapshot, verifies or overrides the AI analysis (`Verified OK` vs `Flagged Suspicious`), writes operational actions taken (e.g. *"Alerted floor supervisor to close drawer via radio"*), and submits the **Hourly Surveillance Audit Report**.
5. The **Customer (US Store Owner)** receives an automated notification that the hourly report has been submitted and is ready for review.
6. The store owner can configure their **Notification Settings**:
   - **Once in an hour** (Instant alerts on every hourly report submission)
   - **At 6 hours** (Consolidated 6-Hour Shift Security Digest)
   - **At the day end** (Comprehensive 24-Hour Daily Security Closeout)
   - **Emergency Robbery Override**: Instant high-priority push/email alerts whenever a camera in a high-risk zone is flagged suspicious, regardless of the digest cadence!

---

## 🚀 Running the Project Locally

### 1. Start PostgreSQL & Django Backend (via Docker Compose)
```bash
# Start PostgreSQL 16 & Django in Docker (zero Windows PostgreSQL install required)
docker compose up -d

# Seed initial demo accounts & records into PostgreSQL
docker compose exec backend python manage.py seed_demo_data
# API running at http://127.0.0.1:8000/ | Swagger UI at http://127.0.0.1:8000/api/v1/docs/
```

### 2. Start React.js Frontend
```bash
# 1. Install dependencies
npm install

# 2. Run the development server
npm run dev
# Accessible at http://localhost:5173/

# 3. Compile production build
npm run build
```

---

## 👥 Evaluator Personas & Instant Role Switcher

Use the top **DemoBar** to switch roles with 1 click without logging out:

| Role | Demo Email | Password | Scenario Persona / Context |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@worktrack.demo` | `admin123` | Alexander Wright (Global Security Operations Admin) |
| **Employee** | `employee@worktrack.demo` | `employee123` | Aarav Shah (Senior Remote CCTV Surveillance Operator) |
| **Customer** | `customer@worktrack.demo` | `customer123` | Robert Henderson (Store Owner, Acme Store #104 - Chicago, IL) |

---

## 🔍 Step-by-Step Scenario Walkthrough

### Step 1: Remote Operator Hourly Audit (`/employee/surveillance`)
1. Log in as **Employee** (`employee@worktrack.demo` / `employee123`) or click **Employee** in the top DemoBar.
2. Click **Hourly CCTV Audit** in the sidebar.
3. You will see today's hourly snapshot batches (`02:00 PM`, `01:00 PM`, `12:00 PM`, `11:00 AM`, `10:00 AM`).
4. Select the current `02:00 PM` batch:
   - Review all **10 Camera Snapshots** (CAM-01 to CAM-10) with realistic CCTV viewports, REC timestamps, and human detection bounding box telemetry.
   - Note the **Robbery Hotspot** badges on CAM-01, CAM-02, and CAM-03.
   - Inspect the AI pre-analysis (`OK` vs `Suspicious`).
   - Click `Verified OK` or `Flag Suspicious` to confirm or override findings.
   - Enter your overall security assessment and actions taken.
5. Click **Submit Hourly Report (02:00 PM)**.
   - The batch transitions to `Submitted`.
   - The store owner is automatically notified per their notification cadence settings.

### Step 2: Store Owner Review & Hotspots (`/customer/surveillance`)
1. Switch to **Customer** in the top DemoBar (Robert Henderson, Store Owner).
2. Click **CCTV Surveillance** in the sidebar:
   - View the **Designated High-Risk Robbery & Cash Vulnerability Hotspots** banner (Zone A Cash Registers, Zone B Safe Room, Zone D Emergency Exit).
   - View the chronological hourly reports feed.
   - Click **View 10 Camera Snapshots** on the `02:00 PM` report to inspect the 10 camera feeds, AI confidence levels, and operator verification notes.
   - Inspect the `11:00 AM` report to see how a flagged anomaly (unattended cash drawer at Register #2) was caught, logged, and resolved with the floor supervisor!
   - Click **Inquire on this Report** to ask a question to the operator (threaded messaging).

### Step 3: Notification Cadence Configuration (`/customer/settings`)
1. Click **Notification Settings** in the customer sidebar.
2. The store owner can configure:
   - 🔘 **Once in an hour (Hourly Alerts)**: Alert me on every single hourly submission.
   - 🔘 **Every 6 Hours (6-Hour Security Digest)**: Batch hourly reports into a 6-hour digest.
   - 🔘 **At the Day End (Daily Closeout Summary)**: One daily summary at day close.
3. **Emergency Override Checkbox:**
   - ☑️ *Instant Override Alert on Suspicious Robbery / Safe Area Anomaly* (Ensures urgent alerts are always sent immediately if a robbery or cash area intrusion is detected, even when 6-Hour or Day-End digest is active).
4. Save preferences to update live state in `LocalStorage`.

---

## 🏗️ Future AI & Camera Integration Architecture

This frontend prototype is architected to seamlessly plug into real-world camera feeds:
- **Periodic Snapshot Worker:** A backend service or edge camera RTSP client will POST snapshot images to the hourly batch endpoint every 60 minutes.
- **YOLOv8 / OpenCV Human Detection:** Runs inference on the frame, sets `humanDetected: true/false`, bounding boxes, and detects objects (e.g. open drawer, person in safe vault).
- **WorkTrack API Webhook:** Automatically seeds the snapshot into the employee's pending hourly batch for human-in-the-loop verification and audit submission.
