from django.utils import timezone
from django.db import transaction
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from apps.notifications.models import Notification, NotificationPreference, PushDevice
from apps.notifications.services import (
    default_timezone_for_user,
    enqueue_email_notifications,
    next_digest_time,
)
from apps.notifications.serializers import (
    NotificationSerializer,
    NotificationPreferenceSerializer,
    PushDeviceSerializer,
)


class NotificationPagination(PageNumberPagination):
    page_size_query_param = 'page_size'
    max_page_size = 100


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = NotificationPagination
    ordering_fields = ['created_at', 'read_at']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        if getattr(self, "swagger_fake_view", False) or not user.is_authenticated:
            return Notification.objects.none()
        preference, _ = NotificationPreference.objects.get_or_create(
            user=user,
            defaults={'timezone': default_timezone_for_user(user)},
        )
        queryset = Notification.objects.filter(
            recipient=user,
            category__in=preference.enabled_categories,
        )
        if not preference.in_app_enabled:
            return queryset.none()

        read_filter = self.request.query_params.get('read')
        if read_filter == 'unread':
            queryset = queryset.filter(read_at__isnull=True)
        elif read_filter == 'read':
            queryset = queryset.filter(read_at__isnull=False)
        elif read_filter:
            raise ValidationError({'read': 'Use "read" or "unread".'})

        category = self.request.query_params.get('category')
        if category:
            if category not in Notification.Category.values:
                raise ValidationError({'category': 'Choose a valid notification category.'})
            queryset = queryset.filter(category=category)
        return queryset

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = self.get_queryset().filter(read_at__isnull=True).count()
        return Response({'unread_count': count})

    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        notification = self.get_object()
        notification.read_at = timezone.now()
        notification.delivery_status = Notification.DeliveryStatus.READ
        notification.save(update_fields=['read_at', 'delivery_status'])
        return Response(NotificationSerializer(notification).data)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        updated = self.get_queryset().filter(read_at__isnull=True).update(
            read_at=timezone.now(),
            delivery_status=Notification.DeliveryStatus.READ
        )
        return Response({'marked_count': updated})


class NotificationPreferenceViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationPreferenceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if getattr(self, "swagger_fake_view", False) or not user.is_authenticated:
            return NotificationPreference.objects.none()
        return NotificationPreference.objects.filter(user=user)

    @action(detail=False, methods=['get', 'put', 'patch'])
    def my_preference(self, request):
        pref, _ = NotificationPreference.objects.get_or_create(
            user=request.user,
            defaults={'timezone': default_timezone_for_user(request.user)},
        )
        if request.method in ['PUT', 'PATCH']:
            serializer = NotificationPreferenceSerializer(pref, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            pref = serializer.save()
            pending_events = Notification.objects.filter(
                recipient=request.user,
                email_delivery_status__in=[
                    Notification.EmailDeliveryStatus.PENDING,
                    Notification.EmailDeliveryStatus.QUEUED,
                ],
            )
            pending_events.exclude(category__in=pref.enabled_categories).update(
                email_delivery_status=Notification.EmailDeliveryStatus.SKIPPED
            )
            pending = pending_events.filter(category__in=pref.enabled_categories)
            if not pref.email_enabled:
                pending.update(email_delivery_status=Notification.EmailDeliveryStatus.SKIPPED)
            elif pref.frequency == NotificationPreference.Frequency.INSTANT:
                pending.update(
                    email_delivery_status=Notification.EmailDeliveryStatus.QUEUED,
                    scheduled_at=timezone.now(),
                )
                notification_ids = list(pending.values_list('id', flat=True))
                if notification_ids:
                    transaction.on_commit(
                        lambda ids=[str(item) for item in notification_ids]: enqueue_email_notifications(ids)
                    )
            else:
                pending.update(
                    email_delivery_status=Notification.EmailDeliveryStatus.PENDING,
                    scheduled_at=next_digest_time(pref.frequency, pref.timezone)
                )
            return Response(serializer.data)
        return Response(NotificationPreferenceSerializer(pref).data)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class PushDeviceViewSet(viewsets.ModelViewSet):
    serializer_class = PushDeviceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if getattr(self, "swagger_fake_view", False) or not user.is_authenticated:
            return PushDevice.objects.none()
        return PushDevice.objects.filter(user=user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
