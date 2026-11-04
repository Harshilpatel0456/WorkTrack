# ⚙️ Backend Architecture & Engineering Guide: WorkTrack

> **Platform:** Python 3.12+ / 3.13 | Django 5.1 | Django REST Framework 3.15  
> **Database:** PostgreSQL 15+ (SQLite supported for zero-setup local dev)  
> **Async Worker:** Celery 5.4 with Redis 7.x Broker  
> **API Documentation:** `drf-spectacular` OpenAPI 3.0.3

---

## 1. Modular Application Architecture

The backend code is partitioned into 11 modular, domain-driven Django applications located inside `backend/apps/`:

```text
backend/
├── worktrack_project/
│   ├── settings.py           # Environment-decoupled settings
│   ├── urls.py               # Root URLconf mounting /api/v1/ and OpenAPI
│   ├── celery.py             # Celery distributed worker initialization
│   └── wsgi.py
└── apps/
    ├── accounts/             # Custom AbstractUser, SimpleJWT auth views, RBAC permissions
    ├── employees/            # EmployeeProfile, employee_code, HR profile endpoints
    ├── customers/            # CustomerProfile, company metadata, timezone support
    ├── assignments/          # EmployeeCustomerAssignment, active contract enforcement
    ├── shifts/               # Shift templates, daily ShiftAssignment rostering
    ├── attendance/           # Attendance engine (sequential check-in/out, UTC durations)
    ├── reports/              # DailyReport, atomic ReportVersion snapshots, attachments
    ├── feedback/             # ReportComment threaded discussions and staff replies
    ├── surveillance/         # 10 CCTV camera feeds, AI telemetry, guard verification
    ├── notifications/        # Notification events, digest preferences, Celery tasks
    └── audit/                # ActivityLog records, role-specific dashboard metrics
```

---

## 2. Core Django Settings & Configuration

Key architectural configurations established in `backend/worktrack_project/settings.py`:

```python
# Custom Identity Model
AUTH_USER_MODEL = 'accounts.User'

# Decoupled Database Switcher (PostgreSQL via Docker / SQLite Local Fallback)
DB_ENGINE = config('DB_ENGINE', default='postgresql')
if DB_ENGINE == 'postgresql':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': config('DB_NAME', default='worktrack_db'),
            'USER': config('DB_USER', default='worktrack_user'),
            'PASSWORD': config('DB_PASSWORD', default='worktrack_user' if DEBUG else None),
            'HOST': config('DB_HOST', default='127.0.0.1'),
            'PORT': config('DB_PORT', default='5432'),
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}
```

---

## 3. Serializers & Data Validation

Every model is accompanied by a dedicated DRF ModelSerializer enforcing strict typing and input sanitization:

* `AttendanceSerializer`: Serializes check-in/out times, computes shift duration in hours, dynamically embeds employee, customer, and shift template names without redundant foreign key lookups.
* `DailyReportSerializer`: Embeds attachments, version counters, shift metadata, and author credentials. Read-only fields include `version`, `submitted_at`, and `created_by`.
* `ReportVersionSerializer`: Serializes immutable historical snapshots stored in PostgreSQL JSONB fields.
* `SurveillanceBatchSerializer`: Prefetches and serializes 10 camera frame snapshots with human detection telemetry and verification statuses.

---

## 4. ViewSet Pattern & Service Layer

All primary resources use `ModelViewSet` or customized `GenericAPIView` instances:

1. **QuerySet Scoping:** Implemented in `get_queryset()` to ensure users cannot view records outside their tenancy:
   ```python
   def get_queryset(self):
       user = self.request.user
       if getattr(self, "swagger_fake_view", False) or not user.is_authenticated:
           return Model.objects.none()
       # Tenant filter logic...
   ```
2. **Atomic Actions:** Actions that modify multiple related entities (e.g. check-in updating assignment status, or report update creating a version snapshot) are wrapped in `transaction.atomic()`.

---

## 5. Celery Task Pipeline & Redis Broker

Configured in `apps/notifications/tasks.py`:

```python
@shared_task
def send_instant_notification(notification_id):
    """Dispatches real-time alerts for immediate events or emergency robbery hotspots."""
    notification = Notification.objects.get(id=notification_id)
    # Dispatches SMTP email and web push notification
    notification.sent_at = timezone.now()
    notification.delivery_status = Notification.DeliveryStatus.SENT
    notification.save(update_fields=['sent_at', 'delivery_status'])

@shared_task
def process_hourly_digest():
    """Celery Beat scheduled job processing customer hourly digest queues."""
    # Aggregates pending notifications and dispatches consolidated summaries
```

---

## 6. Database Migration Strategy

1. **Initial Migration Baseline:** All 11 apps feature standardized `0001_initial.py` migration files.
2. **Safe Schema Updates:** Modifying existing columns utilizes non-destructive defaults (e.g. `default=timezone.localdate`) to ensure backward compatibility with existing rows.
3. **Execution Command:**
   ```powershell
   python manage.py makemigrations
   python manage.py migrate
   ```
4. **Data Seeder:** Built-in management command `seed_demo_data` initializes the database with the three evaluation personas (`admin@worktrack.demo`, `employee@worktrack.demo`, `customer@worktrack.demo`), shift templates, contracts, and demo surveillance batches.
