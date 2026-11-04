# WorkTrack setup and deployment

## Local development

1. Install Python 3.12+, Node.js 22+, and PostgreSQL 16 (or use the development Compose file).
2. Copy `.env.example` to `.env`, update the local database credentials, and keep `.env` private.
3. Backend: from `backend`, install `requirements.txt`, run `python manage.py migrate`, then `python manage.py runserver`.
4. Frontend: from the repository root, run `npm ci` and `npm run dev`. The example API URL points to `http://127.0.0.1:8000/api/v1`.
5. To start the development services with Docker, use `docker compose up --build`. This stack is for local development only; it uses `runserver` and has development credentials/defaults. Never expose it to the Internet.

## Production environment

1. Use a supported Linux host with Docker Engine and the Docker Compose plugin. Configure DNS and terminate HTTPS at a trusted load balancer or reverse proxy.
2. Copy `.env.production.example` to `.env.production` on the host. Restrict its file permissions (for example, `chmod 600 .env.production`) and do not commit it.
3. Generate a unique Django secret key with `python -c "import secrets; print(secrets.token_urlsafe(64))"`. Replace the secret, database password, Redis password, and all example domain/email values. Use an alphanumeric Redis password because Compose embeds it in a Redis URL.
4. Set `ALLOWED_HOSTS` to the actual host names plus `localhost` (used by the backend's internal health check). Set `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS`, and `CSRF_TRUSTED_ORIGINS` to the HTTPS frontend origin. Set PostgreSQL database/user values and SMTP details.
5. The frontend is bound to `127.0.0.1:8080` by default. Keep it private and configure the host's HTTPS reverse proxy to forward requests to that port, preserve the original `Host`, and set `X-Forwarded-Proto: https`. The container Nginx routes `/api/`, `/admin/`, `/static/`, and `/healthz/` to Django. Do not expose the HTTP frontend port directly to the Internet. If the TLS proxy is remote or runs in a container, change the bind address/firewall deliberately so only that proxy can reach the frontend.
6. Configure valid SMTP hostname, port, sender and (where required) credentials. Use exactly one of `EMAIL_USE_TLS` or `EMAIL_USE_SSL`. Delivery has not been verified until tested with the real provider.

Start and inspect the production stack:

```sh
docker compose --env-file .env.production -f docker-compose.production.yml config
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
docker compose --env-file .env.production -f docker-compose.production.yml ps
docker compose --env-file .env.production -f docker-compose.production.yml logs --tail=100 backend celery_worker celery_beat
```

The backend waits for PostgreSQL and Redis health checks, applies migrations, collects static files, then starts Gunicorn. The frontend image builds the SPA with `VITE_API_BASE_URL` (default `/api/v1`). PostgreSQL, Redis, and uploaded media use named persistent volumes. Create an administrator interactively with:

```sh
docker compose --env-file .env.production -f docker-compose.production.yml exec backend python manage.py createsuperuser
```

Only one Celery Beat instance should run for this deployment. The worker and Beat use the same PostgreSQL, Redis, SMTP, and Django environment as the API.

## PostgreSQL and media backup / restore

Back up PostgreSQL regularly and store the encrypted dump off-host. Use credentials from the environment without printing them:

```sh
docker compose --env-file .env.production -f docker-compose.production.yml exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > worktrack-$(date +%Y%m%d-%H%M%S).sql
```

Back up the `media_data` volume separately using the organization's approved volume-backup tooling; test restores periodically. Keep encryption keys/credentials separate from backups. To restore, first preserve the current database and media as a separate backup, stop writers, then restore into a new/empty database and the corresponding media volume. Validate the restored data before directing traffic to it. Do not use `docker compose down -v`: it deletes persistent data.

## Updates and operations

- Review release changes and take database and media backups before upgrades.
- Apply application updates with `docker compose ... up -d --build`; inspect service health and logs. Migrations run at backend startup.
- Run backend verification in the project environment before release: `python manage.py check`, `python manage.py check --deploy`, and `python manage.py migrate --check`.
- `check --deploy` can warn that HSTS preload is disabled. Enable `SECURE_HSTS_PRELOAD` only after confirming every subdomain is HTTPS-only and deciding to meet browser preload-list requirements.
- Monitor application, worker, Beat, database, and Redis health; configure host-level firewalling, TLS renewal, disk monitoring, and off-host backups.
- Provide PostgreSQL, Redis, Django secret, and SMTP settings through a secret manager or protected environment file. Do not put credentials in the frontend build or source control.

## Troubleshooting

- **Backend exits during startup:** check required production settings and backend logs. Production requires a strong secret key, explicit hosts, HTTPS frontend/CORS/CSRF origins, PostgreSQL, HTTPS redirects, and configured SMTP.
- **Database/Redis unhealthy:** inspect service logs and credentials; confirm PostgreSQL/Redis volumes have free disk space. Redis URLs are assembled from `REDIS_PASSWORD`.
- **API redirects unexpectedly:** verify the TLS proxy sets `X-Forwarded-Proto: https` and preserves the public `Host`.
- **CORS/CSRF errors:** use the exact HTTPS browser origin in both environment variables, without a trailing path.
- **Email not delivered:** inspect notification delivery status and worker logs; verify SMTP host, port, TLS mode, sender authorization, and provider credentials. A running worker does not prove delivery.
- **Static files missing:** review backend startup logs for `collectstatic` errors and confirm the frontend proxy routes `/static/` to the backend.
- **Uploads unavailable after restart:** verify the `media_data` volume and available space; do not remove named volumes during maintenance.
