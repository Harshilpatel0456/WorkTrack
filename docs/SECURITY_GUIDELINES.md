# 🛡️ Security Guidelines & Hardening Checklist: WorkTrack

> **Compliance Target:** OWASP Top 10 Web Application Security Baseline  
> **Audience:** Backend Engineers, System Administrators & DevOps Engineers

---

## 1. Authentication & Session Security

1. **JWT Secret Protection:** The SimpleJWT signing key must be loaded strictly from environment variables (`SECRET_KEY`). It must never be committed to source control or exposed in client bundles.
2. **Short Access Token Lifespan:** Access tokens are restricted to a 60-minute lifetime. Refresh tokens last 7 days and undergo mandatory rotation upon refresh.
3. **Token Blacklisting:** When a user logs out (`POST /api/v1/auth/logout/`), the refresh token is written to the `token_blacklist_outstandingtoken` table; subsequent refresh attempts using blacklisted tokens are immediately rejected.
4. **Password Storage:** Uses Django's `PBKDF2PasswordHasher` with SHA-256 and 720,000 hashing iterations. Plaintext passwords are never logged or stored.

---

## 2. Insecure Direct Object Reference (IDOR) & Multi-Tenancy

To prevent horizontal privilege escalation (e.g., Customer A attempting to access Customer B's reports or camera snapshots):

1. **QuerySet Scoping:** Primary keys in URL paths (e.g. `/api/v1/reports/{id}/`) are never resolved against raw table models (`DailyReport.objects.all()`). Instead, DRF's `get_queryset()` filters results using the authenticated user's tenant link:
   ```python
   # Scoped query ensuring Customer A cannot read Customer B's data
   return DailyReport.objects.filter(
       shift_assignment__employee_customer_assignment__customer=user.customer_profile
   )
   ```
2. **404 Over 403 for Foreign Resources:** Attempting to access an ID outside the user's tenant returns HTTP 404 (Not Found) rather than HTTP 403 (Forbidden), preventing resource existence enumeration.

---

## 3. Input Validation & Injection Defenses

1. **SQL Injection Defense:** All database queries utilize Django ORM parameterized queries or stored procedures. Raw SQL string concatenation (`cursor.execute(f"...")`) is prohibited.
2. **Cross-Site Scripting (XSS):** React automatically escapes variable outputs before rendering them to the DOM. Django sanitizes all string inputs via serializer fields.
3. **Cross-Origin Resource Sharing (CORS):** `django-cors-headers` is configured with strict origin whitelisting:
   ```python
   CORS_ALLOWED_ORIGINS = [
       "http://localhost:5173",
       "http://127.0.0.1:5173",
       "https://worktrack.yourdomain.com",
   ]
   CORS_ALLOW_CREDENTIALS = True
   ```
4. **CSRF Protection:** Stateless JWT authentication relies on `Authorization: Bearer <token>` headers instead of ambient browser cookies, neutralizing traditional Cross-Site Request Forgery (CSRF) vectors.

---

## 4. File Upload & Media Security

1. **File Extension Whitelisting:** Report attachments only permit safe document and image formats: `.pdf`, `.png`, `.jpg`, `.jpeg`. Executable formats (`.exe`, `.sh`, `.bat`, `.js`, `.py`) are rejected.
2. **Payload Size Limits:** Maximum upload size is enforced in code at **10MB per file** (`file.size > 10 * 1024 * 1024`).
3. **Separation of Storage:** User-uploaded media is stored in `backend/media/` and served through isolated media routes, with script execution permissions disabled on web servers (e.g. Nginx `location /media/ { ... disable php/exec }`).

---

## 5. Audit Logging & Non-Repudiation

1. **Activity Log Table:** Important administrative actions (user deactivations, contract assignments, report version updates, attendance punches) are logged to `audit_activitylog` recording:
   * Actor User ID & Email
   * Action Type (e.g. `REPORT_UPDATED`, `SHIFT_CANCELLED`)
   * Entity Type & ID
   * Client IP Address
   * Timestamp in UTC
2. **Immutable Version Snapshots:** When an employee updates a report, the previous version is permanently snapshot in `ReportVersion` with complete serialized content. Neither employees nor customers can modify or delete historical version rows.

---

## 6. Production Security Deployment Checklist

* [ ] Set `DEBUG = False` in `.env`.
* [ ] Generate a cryptographically secure 50+ character `SECRET_KEY`.
* [ ] Enforce HTTPS with TLS 1.3 via Nginx/Caddy reverse proxy.
* [ ] Set `SECURE_BROWSER_XSS_FILTER = True`.
* [ ] Set `SECURE_CONTENT_TYPE_NOSNIFF = True`.
* [ ] Set `SESSION_COOKIE_SECURE = True` and `CSRF_COOKIE_SECURE = True`.
* [ ] Enable `SECURE_HSTS_SECONDS = 31536000` (HTTP Strict Transport Security).
* [ ] Restrict PostgreSQL database connections to localhost or VPC private network only.

