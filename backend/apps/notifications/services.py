import logging
from datetime import datetime, time, timedelta, timezone as dt_timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.accounts.models import User
from apps.notifications.models import Notification, NotificationPreference


logger = logging.getLogger(__name__)

EVENT_CATEGORY = {
    Notification.EventType.CHECK_IN: Notification.Category.ATTENDANCE,
    Notification.EventType.CHECK_OUT: Notification.Category.ATTENDANCE,
    Notification.EventType.LATE_ARRIVAL: Notification.Category.ATTENDANCE,
    Notification.EventType.ABSENCE: Notification.Category.ATTENDANCE,
    Notification.EventType.ATTENDANCE_EVENT: Notification.Category.ATTENDANCE,
    Notification.EventType.REPORT_SUBMITTED: Notification.Category.REPORTS,
    Notification.EventType.REPORT_UPDATED: Notification.Category.REPORTS,
    Notification.EventType.FEEDBACK_RECEIVED: Notification.Category.FEEDBACK,
    Notification.EventType.REPLY_RECEIVED: Notification.Category.FEEDBACK,
    Notification.EventType.ASSIGNMENT_CHANGED: Notification.Category.SHIFTS,
    Notification.EventType.SHIFT_SCHEDULED: Notification.Category.SHIFTS,
    Notification.EventType.SHIFT_CHANGED: Notification.Category.SHIFTS,
    Notification.EventType.ROBBERY_HOTSPOT_ALERT: Notification.Category.SYSTEM,
    Notification.EventType.ADMIN_ACTION: Notification.Category.SYSTEM,
}


def default_timezone_for_user(user):
    profile = getattr(user, 'customer_profile', None)
    return profile.timezone if profile else settings.TIME_ZONE


def next_digest_time(frequency, timezone_name, now=None):
    now = now or timezone.now()
    try:
        local_now = now.astimezone(ZoneInfo(timezone_name))
    except ZoneInfoNotFoundError as exc:
        raise ValueError(f'Invalid notification timezone: {timezone_name}') from exc

    if frequency == NotificationPreference.Frequency.HOURLY:
        local_next = local_now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
    elif frequency == NotificationPreference.Frequency.DAILY:
        local_next = datetime.combine(
            local_now.date() + timedelta(days=1), time.min, tzinfo=local_now.tzinfo
        )
    elif frequency == NotificationPreference.Frequency.WEEKLY:
        days_until_monday = 7 - local_now.weekday()
        local_next = datetime.combine(
            local_now.date() + timedelta(days=days_until_monday), time.min, tzinfo=local_now.tzinfo
        )
    else:
        return now
    return local_next.astimezone(dt_timezone.utc)


def recipients_for_contract(contract):
    recipients = [
        contract.employee.user,
        contract.customer.user,
    ]
    admins = User.objects.filter(
        Q(role=User.Role.ADMIN) | Q(is_staff=True),
        is_active=True,
    )
    recipients.extend(admins)
    return list({user.pk: user for user in recipients if user.is_active}.values())


def recipients_for_assignment(assignment):
    return recipients_for_contract(assignment.employee_customer_assignment)


def create_event_notifications(
    *,
    event_type,
    source_key,
    recipients,
    title,
    message,
    daily_report=None,
):
    category = EVENT_CATEGORY[event_type]
    created_notifications = []
    for recipient in recipients:
        preference, _ = NotificationPreference.objects.get_or_create(
            user=recipient,
            defaults={'timezone': default_timezone_for_user(recipient)},
        )
        category_enabled = category in preference.enabled_categories
        email_enabled = preference.email_enabled and category_enabled
        frequency = preference.frequency
        scheduled_at = (
            timezone.now()
            if frequency == NotificationPreference.Frequency.INSTANT
            else next_digest_time(frequency, preference.timezone)
        )
        notification, created = Notification.objects.get_or_create(
            event_key=f'{event_type}:{source_key}:{recipient.pk}',
            defaults={
                'recipient': recipient,
                'daily_report': daily_report,
                'event_type': event_type,
                'category': category,
                'title': title,
                'message': message,
                'channel': Notification.Channel.IN_APP,
                'delivery_status': Notification.DeliveryStatus.SENT,
                'email_delivery_status': (
                    (
                        Notification.EmailDeliveryStatus.QUEUED
                        if frequency == NotificationPreference.Frequency.INSTANT
                        else Notification.EmailDeliveryStatus.PENDING
                    )
                    if email_enabled
                    else Notification.EmailDeliveryStatus.SKIPPED
                ),
                'scheduled_at': scheduled_at,
            },
        )
        if created:
            created_notifications.append(notification)
            if (
                email_enabled
                and frequency == NotificationPreference.Frequency.INSTANT
            ):
                transaction.on_commit(
                    lambda notification_id=str(notification.id): enqueue_email_notifications([notification_id])
                )
    return created_notifications


def enqueue_email_notifications(notification_ids):
    from apps.notifications.tasks import send_email_notifications

    ids = [str(notification_id) for notification_id in notification_ids]
    if not ids:
        return
    try:
        send_email_notifications.delay(ids)
    except Exception:
        Notification.objects.filter(
            id__in=ids,
            email_delivery_status=Notification.EmailDeliveryStatus.QUEUED,
        ).update(email_delivery_status=Notification.EmailDeliveryStatus.PENDING)
        logger.exception('Could not enqueue notification emails %s; they remain pending.', ids)


def notify_assignment_recipients(
    assignment,
    *,
    event_type,
    source_key,
    title,
    message,
    daily_report=None,
):
    return create_event_notifications(
        event_type=event_type,
        source_key=source_key,
        recipients=recipients_for_assignment(assignment),
        title=title,
        message=message,
        daily_report=daily_report,
    )


def notify_contract_recipients(
    contract,
    *,
    event_type,
    source_key,
    title,
    message,
):
    return create_event_notifications(
        event_type=event_type,
        source_key=source_key,
        recipients=recipients_for_contract(contract),
        title=title,
        message=message,
    )
