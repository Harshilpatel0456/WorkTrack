# 💻 Windows Local Development Setup Guide: WorkTrack

> **Target Operating System:** Windows 10 / Windows 11 (PowerShell 7+ / Windows PowerShell)  
> **Prerequisites:** Python 3.12+, Node.js 20+, PostgreSQL 15+ (or SQLite local mode), Git

---

## 1. Prerequisites Installation

### 1.1 Python 3.12+
Download and install from [python.org](https://www.python.org/downloads/).  
*Crucial:* Check the box **"Add python.exe to PATH"** during installation.

### 1.2 Node.js 20+
Download and install Node.js LTS from [nodejs.org](https://nodejs.org/). Verify in PowerShell:
```powershell
node --version
npm --version
```

### 1.3 Docker Desktop for Windows (Recommended Database & Backend Engine)
Install [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/) with WSL2 backend.
*Zero Local PostgreSQL Installation:* You **do not** need to install PostgreSQL directly on your Windows host. WorkTrack uses official PostgreSQL 16 containers via Docker Compose with persistent data volumes.

---

## 2. Docker-Based Setup (Recommended & Standard)

Running PostgreSQL (and optionally Django) via Docker guarantees complete parity with production and eliminates local Windows database setup headaches.

### 2.1 Start Database & Backend with Docker Compose
```powershell
# In the project root (D:\Humbingo)
docker compose up -d --build
```
This single command:
1. Provisions an isolated Docker bridge network (`worktrack_network`).
2. Pulls and launches official **PostgreSQL 16 Alpine** container (`worktrack_postgres`) with persistent volume (`postgres_data`).
3. Runs database health checks (`pg_isready`).
4. Builds the **Django REST Framework** image and starts container (`worktrack_backend`).
5. Automatically applies all migrations and starts the dev server on `http://localhost:8000/`.

### 2.2 Developer Commands for Docker Compose
```powershell
# View real-time logs
docker compose logs -f backend
docker compose logs -f db

# Run Django migrations manually inside container
docker compose exec backend python manage.py migrate

# Seed initial demo accounts & records
docker compose exec backend python manage.py seed_demo_data

# Create an administrator superuser
docker compose exec backend python manage.py createsuperuser

# Open Django Python shell
docker compose exec backend python manage.py shell

# Run full pytest suite inside container
docker compose exec backend python -m pytest

# Stop containers without deleting database data
docker compose down

# Do not use "docker compose down -v" unless you intentionally want
# to permanently remove all Compose-managed database data.
```

### 2.3 Hybrid Mode: PostgreSQL in Docker, Django Locally on Windows
If you prefer running Django locally inside your Windows Python virtual environment while keeping PostgreSQL containerized:
```powershell
# 1. Start ONLY PostgreSQL in Docker
docker compose up db -d

# 2. Activate local Python virtual environment
cd backend
.\.venv\Scripts\Activate.ps1

# 3. Configure backend/.env with:
# DB_ENGINE=postgresql
# DB_HOST=127.0.0.1
# DB_PORT=5432
# DB_USER=worktrack_user
# DB_PASSWORD=change-me-local-db-password

# 4. Run Django migrations and start server locally
python manage.py migrate
python manage.py runserver
```

---

## 3. Alternative Local Setup (Python Virtual Environment)

### 3.1 Create and Activate Virtual Environment
```powershell
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment (Windows PowerShell)
.\.venv\Scripts\Activate.ps1
```
*Tip: If you encounter an ExecutionPolicy error, run:*
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 3.2 Install Dependencies
```powershell
pip install --upgrade pip
pip install -r requirements.txt
```

### 3.3 Configure Environment Variables
Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```
For SQLite-based local development, set:
```ini
DEBUG=True
SECRET_KEY=replace-with-a-random-development-secret
ALLOWED_HOSTS=127.0.0.1,localhost

# Database selection: 'sqlite' or 'postgresql'
DB_ENGINE=sqlite3

# If using PostgreSQL:
DB_NAME=worktrack_db
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_HOST=127.0.0.1
DB_PORT=5432

CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### 3.4 Apply Database Migrations & Seed Demo Data
```powershell
# Execute database schema migrations
python manage.py migrate

# Seed pre-configured demo users, shifts, and surveillance data
python manage.py seed_demo_data
```

### 3.5 Run the Backend Development Server
```powershell
python manage.py runserver 8000
```
* Backend API root: `http://127.0.0.1:8000/api/v1/`
* Interactive OpenAPI Swagger UI: `http://127.0.0.1:8000/api/v1/docs/`
* Django Admin Portal: `http://127.0.0.1:8000/admin/`

---

## 4. Frontend Setup (React.js SPA)

Open a **new** PowerShell terminal in the project root:

```powershell
# In project root (D:\Humbingo or WorkTrack root)
npm install
npm run dev
```
* Accessible at: `http://localhost:5173/`

---

## 5. Pre-Configured Demo Credentials

Use any of the following accounts on the login screen (`/login`) or use the top navigation quick role switcher:

| Role | Email | Password | Persona Details |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@worktrack.demo` | `admin123` | System Administrator |
| **Employee** | `employee@worktrack.demo` | `employee123` | Aarav Shah (EMP-AARAV) |
| **Customer** | `customer@worktrack.demo` | `customer123` | Robert Henderson (Acme Store #104) |

---

## 6. Troubleshooting Common Windows Errors

### Error: `Script execution is disabled on this system`
* **Fix:** Open PowerShell as Administrator and run:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```

### Error: `Port 8000 already in use`
* **Fix:** Terminate existing Python server processes:
  ```powershell
  Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force
  ```

### Error: `FATAL: password authentication failed for user "postgres"`
* **Fix:** Leave `DB_ENGINE=sqlite` in `backend/.env`. The application runs 100% of features and automated tests seamlessly on SQLite. When connecting to production PostgreSQL, verify database credentials in `pgAdmin 4`.
