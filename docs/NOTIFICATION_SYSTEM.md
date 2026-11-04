# WorkTrack Notifications

Notifications are persisted for an individual recipient as soon as the related
action commits. The API only returns rows owned by the authenticated user;
customer scoping is enforced by selecting recipients from the report or shift's
employee-customer assignment.

## Events

The backend creates events for employee check-in/out, late arrival, absence,
report submission/update, customer feedback, employee replies, shift assignment
and schedule changes, and assignment approval/revocation. Event keys are unique
per action and recipient, so retries cannot create duplicate notifications.

## Preferences and delivery

`NotificationPreference` is per user and configures:

- Email cadence: `INSTANT`, `HOURLY`, `DAILY`, or `WEEKLY`.
- Enabled categories: attendance, reports, feedback, shifts, and system.
- In-app and email channels.
- An IANA timezone used to schedule digest boundaries.

In-app records are created immediately. Email delivery is queued through Celery
and tracked separately with status, attempt count, error text, and sent time.
SMTP failures are retried up to three times. Celery Beat checks for due digests
every minute; hourly, daily, and weekly boundaries are calculated in the
preference timezone. Push devices are retained for compatibility, but no push
provider is configured.

## API

- `GET /api/v1/notifications/` — authenticated recipient's paginated feed;
  supports `read=read|unread` and `category=ATTENDANCE|REPORTS|FEEDBACK|SHIFTS|SYSTEM`.
- `GET /api/v1/notifications/unread_count/`
- `POST /api/v1/notifications/{id}/mark_as_read/`
- `POST /api/v1/notifications/mark_all_read/`
- `GET, PATCH /api/v1/notifications/preferences/my_preference/`

## Configuration

Redis is the Celery broker and result backend. The Docker Compose setup runs a
Redis service, Celery worker, and Celery Beat scheduler. For SMTP, set
`EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend`,
`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`,
`EMAIL_USE_TLS` or `EMAIL_USE_SSL`, and `DEFAULT_FROM_EMAIL`. The development
default is Django's console email backend; successful SMTP delivery must be
verified with valid provider credentials.
