# 🚀 WorkTrack: Complete Execution & Testing Guide

> **WorkTrack: Smart Workforce, Attendance, Shift Management & Daily Reporting System**  
> Full-Stack College Project (Django REST Framework + React.js + SimpleJWT + SQLite/PostgreSQL)

---

## 📋 Quick Start Summary

You can run the backend either via **Docker Compose (Recommended - Zero PostgreSQL installation on Windows)** or via **Local Python Virtual Environment**:

| Method | Component | Directory | Command | Port / URL |
| :--- | :--- | :--- | :--- | :--- |
| **Option A (Docker)** | **PostgreSQL + Django** | `D:\Humbingo` | `docker compose up -d` | `http://127.0.0.1:8000/` |
| **Option B (Local)** | **Django DRF Backend** | `D:\Humbingo\backend` | `python manage.py runserver` | `http://127.0.0.1:8000/` |
| **Frontend** | **React.js Frontend** | `D:\Humbingo` | `npm run dev` | `http://localhost:5173/` |

---

## 🐳 Step 1 (Option A): Start Backend via Docker Compose (Recommended)

WorkTrack uses Docker Compose for official **PostgreSQL 16** with automatic persistent volumes and health checks:

```powershell
# 1. Start PostgreSQL and Django in detached mode
docker compose up -d

# 2. View container logs
docker compose logs -f backend

# 3. Seed demo accounts & records into PostgreSQL
docker compose exec backend python manage.py seed_demo_data
```

### Useful Docker Compose Commands:
```powershell
# View running container status
docker compose ps

# Run migrations manually
docker compose exec backend python manage.py migrate

# Create admin superuser
docker compose exec backend python manage.py createsuperuser

# Stop containers (database data is preserved in Docker volume)
docker compose down

# ⚠️ Stop containers and permanently delete database volume
docker compose down -v
```

---

## 🛠️ Step 1 (Option B): Start Backend via Local Virtual Environment

Open your first terminal in `D:\Humbingo` and execute:

```powershell
# 1. Navigate to the backend directory
cd D:\Humbingo\backend

# 2. Activate the virtual environment
.\.venv\Scripts\Activate.ps1

# 3. Apply database migrations
python manage.py migrate

# 4. (One-time or when resetting) Seed demo accounts and data
python manage.py seed_demo_data

# 5. Start the Django development server
python manage.py runserver
```

### Backend Endpoints & Port Mappings:
- **API Base URL:** `http://127.0.0.1:8000/api/v1/`
- **Swagger UI (Interactive Docs):** `http://127.0.0.1:8000/api/v1/docs/`
- **ReDoc Documentation:** `http://127.0.0.1:8000/api/v1/redoc/`
- **Django Admin Portal:** `http://127.0.0.1:8000/admin/`

---

## 💻 Step 2: Start the Frontend (Terminal 2)

Open your second terminal in `D:\Humbingo` and execute:

```powershell
# 1. Ensure you are in the project root
cd D:\Humbingo

# 2. Start the Vite development server
npm run dev
```

### Frontend Application Access:
- **Application URL:** **`http://localhost:5173/`**

---

## 🔑 Step 3: Demo Accounts & Credentials

The database comes pre-seeded with 3 primary evaluator accounts representing all system roles:

| Role | Name | Email | Password | Assigned Dashboard |
| :--- | :--- | :--- | :--- | :--- |
| **Administrator** | Alexander Wright | `admin@worktrack.demo` | `admin123` | `http://localhost:5173/admin` |
| **Field Employee** | Aarav Shah | `employee@worktrack.demo` | `employee123` | `http://localhost:5173/employee` |
| **Customer Store Owner** | Robert Henderson | `customer@worktrack.demo` | `customer123` | `http://localhost:5173/customer` |

> 💡 **Tip:** On the Sign In page (`http://localhost:5173/login`), you can click any of the **One-Click Evaluator Personas** on the left column to immediately populate credentials or launch straight into that role's dashboard.

---

## 🧪 Step 4: How to Test All Authentication Features

### 1. Test Login & Session Management
1. Navigate to `http://localhost:5173/login`.
2. Enter the credentials for any role above.
3. Toggle the **Show/Hide Password** icon (eye) to verify visibility.
4. Click **Authorize & Sign In**. The backend validates the credentials, returns JWT `access` and `refresh` tokens, and the app redirects you to the authorized dashboard.
5. In your browser's Developer Tools (`F12` > Application > Local Storage), notice:
   - `worktrack_access_token`
   - `worktrack_refresh_token`
   - `worktrack_auth_state`

---

### 2. Test User Registration (Sign Up)
1. Navigate to `http://localhost:5173/register` (or click *"Register as Employee or Customer"* on the login page).
2. Choose your role:
   - **Field Employee:** Enter your full name, email, and password. An `EmployeeProfile` with a unique `EMP-XXXXXX` code is automatically created.
   - **Client Customer:** Enter your full name, company name (required), email, and password. A `CustomerProfile` with a unique `CUST-XXXXXX` code is automatically created.
3. Click **Create Account**.
4. The system validates the inputs, registers the user in Django via `POST /api/v1/auth/register/`, issues JWT tokens, and redirects you directly to your role dashboard.
> 🛡️ **Security Check:** By business design, public registration for `ADMIN` is strictly disabled and rejected by the server with `HTTP 400 Bad Request`.

---

### 3. Test Forgot & Reset Password Flow
1. Navigate to `http://localhost:5173/forgot-password`.
2. Enter a registered email (e.g. `employee@worktrack.demo`) and submit.
3. In local development mode, open **Terminal 1 (Django Server)** to see the dispatched email printed to the console:
   ```text
   http://localhost:5173/reset-password?uid=<uid>&token=<token>
   ```
4. Copy and paste this URL into your browser.
5. Enter a new password (minimum 8 characters) and confirm it.
6. Submit the form. The backend verifies the cryptographic token, updates the password, and redirects you to `/login` to sign in with your new credentials.

---

### 4. Test Role-Based Route Protection (RBAC Guardrails)
WorkTrack enforces strict client and server authorization:

- **Unauthenticated Users:**
  - Try opening `http://localhost:5173/admin` directly without logging in.
  - Result: Automatically redirected to `http://localhost:5173/login`.
- **Employee Role Guard:**
  - Log in as `employee@worktrack.demo`.
  - In your browser's address bar, attempt navigating directly to `http://localhost:5173/admin` or `http://localhost:5173/customer`.
  - Result: `ProtectedRoute` detects unauthorized role access and safely redirects you back to `http://localhost:5173/employee`.
- **Customer Role Guard:**
  - Log in as `customer@worktrack.demo`.
  - Attempt navigating directly to `http://localhost:5173/employee`.
  - Result: Safely redirects you back to `http://localhost:5173/customer`.

---

## 🧪 Step 5: Run the Automated Pytest Suite

To verify backend business rules, attendance logic, report versioning snapshots, multi-tenant isolation, and authentication security:

```powershell
cd D:\Humbingo\backend
.\.venv\Scripts\python.exe -m pytest
```

### Expected Output:
```text
============================= test session starts =============================
tests/test_attendance.py ....                                            [ 11%]
tests/test_auth.py ...................                                   [ 67%]
tests/test_isolation.py ...                                              [ 76%]
tests/test_reports.py ...                                                [ 85%]
tests/test_surveillance_and_dashboards.py .....                          [100%]

================= 34 passed, 9 warnings in 129.71s (100% Pass Rate) =================
```

---

## 🔧 Useful Troubleshooting & Maintenance Commands

### 1. Resetting or Re-seeding the Database
If you ever want a fresh database with initial clean demo records:
```powershell
cd D:\Humbingo\backend
# Delete SQLite database if needed
Remove-Item db.sqlite3 -ErrorAction SilentlyContinue

# Re-run migrations and seed data
python manage.py migrate
python manage.py seed_demo_data
```

### 2. Creating a Custom Django Superuser
```powershell
cd D:\Humbingo\backend
python manage.py createsuperuser
```

### 3. Production Frontend Build Check
```powershell
cd D:\Humbingo
npm run build
```
Creates an optimized production bundle inside `dist/`.

