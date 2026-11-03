from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.notifications.models import Notification, NotificationPreference, PushDevice
from apps.notifications.serializers import (
    NotificationSerializer,
    NotificationPreferenceSerializer,
    PushDeviceSerializer,
)


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    ordering_fields = ['created_at', 'read_at']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        if getattr(self, "swagger_fake_view", False) or not user.is_authenticated:
            return Notification.objects.none()
        return Notification.objects.filter(recipient=user)

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
        if user.is_staff or user.role == 'ADMIN':
            return NotificationPreference.objects.all()
        if user.role == 'CUSTOMER' and hasattr(user, 'customer_profile'):
            return NotificationPreference.objects.filter(customer=user.customer_profile)
        return NotificationPreference.objects.none()

    @action(detail=False, methods=['get', 'put', 'patch'])
    def my_preference(self, request):
        user = request.user
        if not hasattr(user, 'customer_profile'):
            return Response({'detail': 'Only customer accounts have notification preferences.'}, status=status.HTTP_400_BAD_REQUEST)

        pref, _ = NotificationPreference.objects.get_or_create(customer=user.customer_profile)
        if request.method in ['PUT', 'PATCH']:
            serializer = NotificationPreferenceSerializer(pref, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        return Response(NotificationPreferenceSerializer(pref).data)


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
