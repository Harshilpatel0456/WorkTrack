# 🚀 Production Deployment Architecture & Operations Guide: WorkTrack

> **Target Environment:** Linux Ubuntu 22.04 LTS / AWS EC2 / DigitalOcean Droplet / Docker Engine  
> **Containerization:** Docker & Docker Compose (Official PostgreSQL 16 & Python 3.12)  
> **Web Server:** Nginx (Reverse Proxy & Static Cache)  
> **WSGI Server:** Gunicorn (Python 3.12+)  
> **Database:** PostgreSQL 16 (Containerized via persistent Docker volume or AWS RDS)  
> **Queue & Cache:** Redis 7.x

---

## 1. Production Architecture Topology

```mermaid
graph TB
    subgraph PublicInternet["Public Internet"]
        Users[Web Clients & Mobile Browsers]
    end

    subgraph EdgeTier["Edge & Security Layer"]
        Cloudflare["Cloudflare (DNS, DDoS Protection, SSL)"]
        Nginx["Nginx Reverse Proxy (:443 HTTPS)"]
    end

    subgraph AppTier["Application Compute Tier (Docker Compose)"]
        StaticServe["Nginx Static Cache (/static/ & React SPA)"]
        Gunicorn["Django DRF Container (:8000)"]
        CeleryWorker["Celery Worker Container"]
        CeleryBeat["Celery Beat Periodic Scheduler"]
    end

    subgraph DataTier["Data Tier (Persistent Docker Network)"]
        Postgres[(PostgreSQL 16 Container :5432)]
        Redis[(Redis 7.x Container :6379)]
        S3Bucket[AWS S3 / Cloud Storage (Media Attachments)]
    end

    Users -->|HTTPS| Cloudflare
    Cloudflare --> Nginx
    Nginx -->|/static/ & /*| StaticServe
    Nginx -->|/api/v1/*| Gunicorn
    Gunicorn --> Postgres
    Gunicorn --> S3Bucket
    Gunicorn --> Redis
    CeleryBeat --> Redis
    Redis --> CeleryWorker
    CeleryWorker --> Postgres
```

---

## 2. Containerized Deployment with Docker Compose (Standard)

WorkTrack includes Docker Compose orchestration for unified container deployment:

```bash
# 1. Clone repository
git clone https://github.com/Harshilpatel0456/WorkTrack.git
cd WorkTrack

# 2. Configure environment variables
cp .env.example .env
nano .env # Set secure DB_PASSWORD, SECRET_KEY, and ALLOWED_HOSTS

# 3. Build and launch services in detached mode
docker compose up -d --build

# 4. Verify health status of PostgreSQL and Django containers
docker compose ps

# 5. Apply migrations and seed or create superuser
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
```

---

## 3. Server Provisioning & Dependencies (Ubuntu Linux Native Alternative)

```bash
# 1. Update OS packages
sudo apt update && sudo apt upgrade -y

# 2. Install Python, Nginx, Redis, and build tools
sudo apt install -y python3-pip python3-venv python3-dev libpq-dev postgresql-client nginx redis-server git curl

# 3. Enable and verify Redis
sudo systemctl enable redis-server
sudo systemctl start redis-server
redis-cli ping # Expected: PONG
```

---

## 4. Environment Variables Configuration

In `/app/.env` or server root:

```ini
DEBUG=False
SECRET_KEY=generate-a-strong-random-64-char-string-here
ALLOWED_HOSTS=api.worktrack.com,worktrack.com,127.0.0.1

# Database Configuration (PostgreSQL 16)
DB_ENGINE=postgresql
DB_NAME=worktrack_db
DB_USER=worktrack_user
DB_PASSWORD=your_ultra_secure_password
DB_HOST=db
DB_PORT=5432

# CORS Configuration
FRONTEND_URL=https://app.worktrack.com
CORS_ALLOWED_ORIGINS=https://app.worktrack.com

# JWT Lifespans
JWT_ACCESS_MINUTES=30
JWT_REFRESH_DAYS=7

# Redis / Celery
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/0
```

---

## 5. Security & Maintenance Operations

### 5.1 Routine Backups
```bash
# Backup PostgreSQL database container
docker compose exec -t db pg_dump -U worktrack_user worktrack_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore PostgreSQL database container
cat backup_file.sql | docker compose exec -T db psql -U worktrack_user -d worktrack_db
```

### 5.2 Container Lifecycle Commands
```bash
# Gracefully stop containers (preserves database volume)
docker compose down

# View real-time container logs
docker compose logs -f backend
docker compose logs -f db

# ⚠️ WARNING: Wipe containers and permanently delete database volume
docker compose down -v
```
