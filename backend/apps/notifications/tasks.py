import logging

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from apps.notifications.models import Notification, NotificationPreference


logger = logging.getLogger(__name__)


def _send_notifications(notification_ids, digest=False):
    eligible_statuses = [
        Notification.EmailDeliveryStatus.PENDING,
        Notification.EmailDeliveryStatus.QUEUED,
    ]
    notifications = list(
        Notification.objects.select_related('recipient')
        .filter(
            id__in=notification_ids,
            email_delivery_status__in=eligible_statuses,
        )
        .order_by('created_at')
    )
    if not notifications:
        return 0

    recipient_ids = {notification.recipient_id for notification in notifications}
    if len(recipient_ids) != 1:
        raise ValueError('An email delivery batch must have exactly one recipient.')

    recipient = notifications[0].recipient
    preference = NotificationPreference.objects.filter(user=recipient).first()
    if not preference or not preference.email_enabled:
        Notification.objects.filter(
            id__in=[notification.id for notification in notifications],
            email_delivery_status__in=eligible_statuses,
        ).update(email_delivery_status=Notification.EmailDeliveryStatus.SKIPPED)
        return 0

    enabled = [
        notification
        for notification in notifications
        if notification.category in preference.enabled_categories
    ]
    disabled_ids = [
        notification.id
        for notification in notifications
        if notification.category not in preference.enabled_categories
    ]
    if disabled_ids:
        Notification.objects.filter(id__in=disabled_ids).update(
            email_delivery_status=Notification.EmailDeliveryStatus.SKIPPED
        )
    notifications = enabled
    if not notifications:
        return 0
    if not digest and preference.frequency != NotificationPreference.Frequency.INSTANT:
        Notification.objects.filter(
            id__in=[notification.id for notification in notifications],
            email_delivery_status=Notification.EmailDeliveryStatus.QUEUED,
        ).update(email_delivery_status=Notification.EmailDeliveryStatus.PENDING)
        return 0

    notification_ids = [notification.id for notification in notifications]
    with transaction.atomic():
        claim_query = (
            Notification.objects.select_for_update()
            .filter(
                id__in=notification_ids,
                email_delivery_status__in=eligible_statuses,
            )
        )
        if digest:
            claim_query = claim_query.filter(scheduled_at__lte=timezone.now())
        claimed_ids = list(claim_query.values_list('id', flat=True))
        if not claimed_ids:
            return 0
        Notification.objects.filter(id__in=claimed_ids).update(
            email_delivery_status=Notification.EmailDeliveryStatus.SENDING,
            email_attempts=F('email_attempts') + 1,
        )
    notifications = [
        notification for notification in notifications if notification.id in claimed_ids
    ]

    subject = (
        f'WorkTrack notification digest ({len(notifications)} updates)'
        if digest
        else notifications[0].title
    )
    body = '\n\n'.join(
        f'{notification.title}\n{notification.message}'
        for notification in notifications
    )
    sent = send_mail(
        subject,
        body,
        settings.DEFAULT_FROM_EMAIL,
        [recipient.email],
        fail_silently=False,
    )
    if sent != 1:
        raise RuntimeError(f'Email backend did not confirm delivery to {recipient.email}.')

    now = timezone.now()
    Notification.objects.filter(
        id__in=[notification.id for notification in notifications],
        email_delivery_status=Notification.EmailDeliveryStatus.SENDING,
    ).update(
        email_delivery_status=Notification.EmailDeliveryStatus.SENT,
        sent_at=now,
        email_error='',
    )
    return len(notifications)


@shared_task(bind=True, max_retries=3)
def send_email_notifications(self, notification_ids):
    ids = [str(notification_id) for notification_id in notification_ids]
    try:
        return _send_notifications(ids)
    except Exception as exc:
        Notification.objects.filter(
            id__in=ids,
            email_delivery_status=Notification.EmailDeliveryStatus.SENDING,
        ).update(
            email_delivery_status=Notification.EmailDeliveryStatus.FAILED,
            email_error=str(exc)[:4000],
        )
        logger.exception('Notification email delivery failed for %s', ids)
        if self.request.retries < self.max_retries:
            Notification.objects.filter(
                id__in=ids,
                email_delivery_status=Notification.EmailDeliveryStatus.FAILED,
            ).update(email_delivery_status=Notification.EmailDeliveryStatus.QUEUED)
            raise self.retry(exc=exc, countdown=2 ** (self.request.retries + 1))
        return 0


@shared_task(bind=True, max_retries=3)
def send_email_digest(self, notification_ids):
    ids = [str(notification_id) for notification_id in notification_ids]
    try:
        return _send_notifications(ids, digest=True)
    except Exception as exc:
        Notification.objects.filter(
            id__in=ids,
            email_delivery_status=Notification.EmailDeliveryStatus.SENDING,
        ).update(
            email_delivery_status=Notification.EmailDeliveryStatus.FAILED,
            email_error=str(exc)[:4000],
        )
        logger.exception('Notification digest delivery failed for %s', ids)
        if self.request.retries < self.max_retries:
            Notification.objects.filter(
                id__in=ids,
                email_delivery_status=Notification.EmailDeliveryStatus.FAILED,
            ).update(email_delivery_status=Notification.EmailDeliveryStatus.QUEUED)
            raise self.retry(exc=exc, countdown=2 ** (self.request.retries + 1))
        return 0


@shared_task
def process_due_digests():
    now = timezone.now()
    pending = Notification.objects.filter(
        email_delivery_status=Notification.EmailDeliveryStatus.PENDING,
        scheduled_at__lte=now,
    ).values_list('recipient_id', flat=True).distinct()
    queued = 0
    for recipient_id in pending.iterator():
        preference = NotificationPreference.objects.filter(user_id=recipient_id).first()
        if not preference or not preference.email_enabled:
            Notification.objects.filter(
                recipient_id=recipient_id,
                email_delivery_status=Notification.EmailDeliveryStatus.PENDING,
                scheduled_at__lte=now,
            ).update(email_delivery_status=Notification.EmailDeliveryStatus.SKIPPED)
            continue

        Notification.objects.filter(
            recipient_id=recipient_id,
            email_delivery_status=Notification.EmailDeliveryStatus.PENDING,
            scheduled_at__lte=now,
        ).exclude(category__in=preference.enabled_categories).update(
            email_delivery_status=Notification.EmailDeliveryStatus.SKIPPED
        )
        with transaction.atomic():
            notification_ids = list(
                Notification.objects.select_for_update()
                .filter(
                    recipient_id=recipient_id,
                    email_delivery_status=Notification.EmailDeliveryStatus.PENDING,
                    scheduled_at__lte=now,
                    category__in=preference.enabled_categories,
                )
                .values_list('id', flat=True)
            )
            if notification_ids:
                Notification.objects.filter(id__in=notification_ids).update(
                    email_delivery_status=Notification.EmailDeliveryStatus.QUEUED
                )
        if notification_ids:
            try:
                send_email_digest.delay([str(item) for item in notification_ids])
            except Exception:
                Notification.objects.filter(
                    id__in=notification_ids,
                    email_delivery_status=Notification.EmailDeliveryStatus.QUEUED,
                ).update(email_delivery_status=Notification.EmailDeliveryStatus.PENDING)
                logger.exception('Could not enqueue notification digest for user %s', recipient_id)
                raise
            queued += len(notification_ids)
    return queued
