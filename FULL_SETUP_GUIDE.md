# Full Setup Guide for WorkTrack Project

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Project Structure Overview](#project-structure-overview)
3. [Docker‑Based PostgreSQL Setup](#docker‑based-postgresql-setup)
4. [Running the Backend (Django) via Docker](#running-the-backend-django-via-docker)
5. [Running the Frontend (React) Locally](#running-the-frontend-react-locally)
6. [Hybrid Development Mode (Docker DB + Local Django)](#hybrid-development-mode-docker-db--local-django)
7. [Authentication & Authorization Quick Test](#authentication--authorization-quick-test)
8. [Managing Docker Containers](#managing-docker-containers)
9. [Common Issues & Troubleshooting](#common-issues--troubleshooting)
10. [Additional Documentation Links](#additional-documentation-links)

---

### Prerequisites
- **Docker Desktop** (WSL2 backend recommended on Windows)
- **Node.js** (v18+) and **npm** for the React frontend
- **Python** (3.12) & **virtualenv** (optional, for local backend runs)
- **Git** (to clone the repository)

### Project Structure Overview
```
WorkTrack/
│   .env.example
│   docker-compose.yml
│   README.md
│   FULL_SETUP_GUIDE.md   <-- (this file)
│
├───backend/
│   │   Dockerfile
│   │   .dockerignore
│   │   manage.py
│   │   requirements.txt
│   │   worktrack_project/
│   │       settings.py
│   │       ...
│   └───... (Django apps)
│
├───frontend/
│   │   package.json
│   │   src/
│   │   ... (React source)
│
└───docs/
    │   DEVELOPMENT_SETUP.md
    │   DEPLOYMENT_GUIDE.md
    │   ...
```

---

## Docker‑Based PostgreSQL Setup
1. **Environment File** – copy the example and edit placeholders:
```bash
cp .env.example .env
# Edit .env and set the PostgreSQL credentials (or keep placeholders for Docker)
# Example values used in Docker Compose:
# DB_ENGINE=postgresql
# DB_NAME=worktrack_db
# DB_USER=worktrack_user
# DB_PASSWORD=worktrack_secure_pass_2026
# DB_HOST=db   # Docker service name
# DB_PORT=5432
```
2. **docker‑compose.yml** (already added in the root) defines two services:
   - `db` – PostgreSQL 16 (alpine) with a named volume `postgres_data` for persistence.
   - `backend` – builds from `backend/Dockerfile`, injects the `.env` variables, waits for the DB health‑check, runs migrations, then starts the Django dev server on port **8000**.
3. **Build & Start**:
```bash
# From the project root
docker compose up -d --build
```
   - Docker will pull the PostgreSQL image (≈ 200 MB) on first run.
   - The backend image builds in ~2 min.
4. **Automatic Migrations** – The `backend` service runs `python manage.py migrate` before launching the server.  If you add new migrations later, you can run them manually:
```bash
docker compose exec backend python manage.py migrate
```
5. **Verify** – Open a browser at `http://localhost:8000/api/v1/docs/` – you should see the Swagger UI.

---

## Running the Backend (Django) via Docker
- **Create a Superuser** (once):
```bash
docker compose exec backend python manage.py createsuperuser
```
- **Run Tests** inside the container:
```bash
docker compose exec backend python -m pytest
```
- **Access the Shell** (if needed):
```bash
docker compose exec backend python manage.py shell
```

---

## Running the Frontend (React) Locally
The frontend does **not** run inside Docker (it’s a pure Node app).  From the project root:
```bash
cd frontend
npm install   # once
npm start       # starts on http://localhost:3000
```
The React app expects the backend API at `http://localhost:8000/`.  If you change the backend port, update `frontend/.env` accordingly.

---

## Hybrid Development Mode (Docker DB + Local Django)
If you prefer to run Django directly on your host (e.g., for hot‑reload with `python manage.py runserver`) but still want PostgreSQL in Docker:
1. Start only the DB container:
```bash
docker compose up -d db
```
2. In a separate terminal, create a virtualenv and install requirements:
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # PowerShell
pip install -r requirements.txt
```
3. Ensure `.env` has `DB_HOST=db` (Docker service name) and run Django normally:
```bash
python manage.py runserver 0.0.0.0:8000
```
The local Django process will connect to the PostgreSQL container over Docker’s internal network.

---

## Authentication & Authorization Quick Test
1. **Register a new employee** (via frontend or Swagger):
   - POST `/api/v1/auth/register/` with `role="employee"`.
2. **Login**:
   - POST `/api/v1/auth/login/` with the created email/password.
   - You receive `access` and `refresh` JWT tokens.
3. **Access a protected endpoint** (e.g., employee dashboard data):
   - Include header `Authorization: Bearer <access_token>`.
4. **Refresh token** when the access token expires:
   - POST `/api/v1/auth/refresh/` with the `refresh` token.
5. **Logout** (optional):
   - POST `/api/v1/auth/logout/` – server blacklists the refresh token.

All of the above can be exercised via the Swagger UI or any HTTP client (Postman, curl, VS Code REST client).

---

## Managing Docker Containers
| Action | Command |
|--------|---------|
| **Start all services** | `docker compose up -d` |
| **Stop all services** | `docker compose down` |
| **Stop & remove volumes (wipe DB)** | `docker compose down -v` |
| **View logs** | `docker compose logs -f backend` |
| **Execute a command in backend** | `docker compose exec backend <cmd>` |
| **Backup DB** (while containers running) | ```bash
docker compose exec db pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup.sql
``` |
| **Restore DB** | ```bash
cat backup.sql | docker compose exec -T db psql -U $POSTGRES_USER $POSTGRES_DB
``` |

> **NOTE**: Deleting the volume (`-v`) permanently removes all data.  Use the backup/restore commands instead of wiping volume.

---

## Common Issues & Troubleshooting
- **Backend cannot connect to DB** – Verify `.env` has `DB_HOST=db` and that the `db` service is healthy (`docker compose ps`).
- **CORS errors** – Ensure `django-cors-headers` is installed and `CORS_ALLOWED_ORIGINS` includes `http://localhost:3000`.
- **Port conflict on 8000** – Change the host port in `docker-compose.yml` (`8000:8000`) to another free port.
- **Migrations fail** – Check that the `postgres_data` volume contains a clean DB; you may need to delete the volume (`docker compose down -v`) and let migrations recreate the schema.
- **Frontend cannot reach API** – Confirm the React `.env` variable `REACT_APP_API_URL` points to `http://localhost:8000/`.

---

## Additional Documentation Links
- [DEVELOPMENT_SETUP.md](docs/DEVELOPMENT_SETUP.md)
- [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)
- [API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md)
- [SECURITY.md](docs/SECURITY.md)
- [README.md](README.md)

---

*This guide consolidates the Docker PostgreSQL setup and the complete run‑through for both backend and frontend.  Follow the sections that match your preferred workflow.*
