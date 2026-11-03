from celery import shared_task
from django.utils import timezone
from apps.notifications.models import Notification, NotificationPreference


@shared_task
def send_instant_notification(notification_id):
    try:
        notification = Notification.objects.get(id=notification_id)
        # In production, dispatch via Celery / SMTP / WebPush
        notification.sent_at = timezone.now()
        notification.delivery_status = Notification.DeliveryStatus.SENT
        notification.save(update_fields=['sent_at', 'delivery_status'])
        return f"Notification {notification_id} dispatched."
    except Notification.DoesNotExist:
        return f"Notification {notification_id} not found."


@shared_task
def process_hourly_digest():
    """Runs on scheduled Celery beat for customers configured with HOURLY digest."""
    now = timezone.now()
    hourly_prefs = NotificationPreference.objects.filter(frequency=NotificationPreference.Frequency.HOURLY)
    processed_count = 0
    for pref in hourly_prefs:
        pending = Notification.objects.filter(
            customer=pref.customer,
            delivery_status=Notification.DeliveryStatus.PENDING,
            scheduled_at__lte=now
        )
        for n in pending:
            n.sent_at = now
            n.delivery_status = Notification.DeliveryStatus.SENT
            n.save(update_fields=['sent_at', 'delivery_status'])
            processed_count += 1
    return f"Processed {processed_count} hourly digest notifications."

