from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.accounts.permissions import IsAdmin, IsEmployeeOrAdmin
from apps.surveillance.models import SurveillanceBatch, CameraSnapshot
from apps.surveillance.serializers import (
    SurveillanceBatchSerializer,
    CameraSnapshotSerializer,
)


class SurveillanceBatchViewSet(viewsets.ModelViewSet):
    serializer_class = SurveillanceBatchSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status', 'date', 'customer', 'employee']
    ordering_fields = ['date', 'hour24', 'created_at']
    ordering = ['-date', '-hour24']

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.IsAuthenticated(), IsAdmin()]
        if self.action in ('update', 'partial_update', 'destroy', 'submit'):
            return [permissions.IsAuthenticated(), IsEmployeeOrAdmin()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        if getattr(self, "swagger_fake_view", False) or not user.is_authenticated:
            return SurveillanceBatch.objects.none()
        qs = SurveillanceBatch.objects.select_related(
            'customer', 'employee__user'
        ).prefetch_related('snapshots')

        if user.is_staff or user.role == 'ADMIN':
            return qs
        elif user.role == 'EMPLOYEE' and hasattr(user, 'employee_profile'):
            return qs.filter(employee=user.employee_profile)
        elif user.role == 'CUSTOMER' and hasattr(user, 'customer_profile'):
            return qs.filter(
                customer=user.customer_profile,
                status=SurveillanceBatch.Status.SUBMITTED
            )
        return qs.none()

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def submit(self, request, pk=None):
        batch = self.get_object()
        user = request.user

        if user.role == 'EMPLOYEE' and hasattr(user, 'employee_profile'):
            if batch.employee != user.employee_profile:
                return Response({'detail': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

        overall_assessment = request.data.get('overall_assessment', batch.overall_assessment)
        actions_taken = request.data.get('actions_taken', batch.actions_taken)

        flagged_count = batch.snapshots.filter(
            employee_verification=CameraSnapshot.VerificationStatus.FLAGGED_SUSPICIOUS
        ).count()

        batch.status = SurveillanceBatch.Status.SUBMITTED
        batch.submitted_at = timezone.now()
        batch.overall_assessment = overall_assessment
        batch.actions_taken = actions_taken
        batch.flagged_suspicious_count = flagged_count
        batch.customer_notified = True
        batch.save()

        return Response(SurveillanceBatchSerializer(batch).data, status=status.HTTP_200_OK)


class CameraSnapshotViewSet(viewsets.ModelViewSet):
    serializer_class = CameraSnapshotSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.IsAuthenticated(), IsAdmin()]
        if self.action in ('update', 'partial_update', 'destroy', 'verify'):
            return [permissions.IsAuthenticated(), IsEmployeeOrAdmin()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        if getattr(self, "swagger_fake_view", False) or not user.is_authenticated:
            return CameraSnapshot.objects.none()
        qs = CameraSnapshot.objects.select_related('batch__customer', 'batch__employee')
        if user.is_staff or user.role == 'ADMIN':
            return qs
        elif user.role == 'EMPLOYEE' and hasattr(user, 'employee_profile'):
            return qs.filter(batch__employee=user.employee_profile)
        elif user.role == 'CUSTOMER' and hasattr(user, 'customer_profile'):
            return qs.filter(
                batch__customer=user.customer_profile,
                batch__status=SurveillanceBatch.Status.SUBMITTED
            )
        return qs.none()

    @action(detail=True, methods=['patch', 'post'], permission_classes=[permissions.IsAuthenticated])
    def verify(self, request, pk=None):
        snapshot = self.get_object()
        user = request.user

        if user.role == 'EMPLOYEE' and hasattr(user, 'employee_profile'):
            if snapshot.batch.employee != user.employee_profile:
                return Response({'detail': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

        verification = request.data.get('employee_verification')
        notes = request.data.get('employee_notes', snapshot.employee_notes)

        if verification:
            snapshot.employee_verification = verification
        if notes is not None:
            snapshot.employee_notes = notes
        snapshot.save(update_fields=['employee_verification', 'employee_notes'])

        return Response(CameraSnapshotSerializer(snapshot).data)
