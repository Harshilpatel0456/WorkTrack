from django.utils import timezone
from django.db import transaction
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.accounts.permissions import IsAdmin, IsEmployee, IsCustomer
from apps.shifts.models import ShiftAssignment
from apps.reports.models import DailyReport, ReportVersion, ReportAttachment
from apps.reports.serializers import (
    DailyReportSerializer,
    ReportVersionSerializer,
    ReportAttachmentSerializer,
)


class DailyReportViewSet(viewsets.ModelViewSet):
    serializer_class = DailyReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status', 'shift_assignment__shift_date']
    search_fields = [
        'title',
        'work_summary',
        'shift_assignment__employee_customer_assignment__employee__employee_code',
        'shift_assignment__employee_customer_assignment__customer__company_name'
    ]
    ordering_fields = ['submitted_at', 'created_at', 'last_updated_at']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        if getattr(self, "swagger_fake_view", False) or not user.is_authenticated:
            return DailyReport.objects.none()
        qs = DailyReport.objects.select_related(
            'shift_assignment__shift',
            'shift_assignment__employee_customer_assignment__employee__user',
            'shift_assignment__employee_customer_assignment__customer',
            'created_by',
            'updated_by'
        ).prefetch_related('attachments', 'versions')

        if user.is_staff or user.role == 'ADMIN':
            return qs
        elif user.role == 'EMPLOYEE' and hasattr(user, 'employee_profile'):
            return qs.filter(
                shift_assignment__employee_customer_assignment__employee=user.employee_profile
            )
        elif user.role == 'CUSTOMER' and hasattr(user, 'customer_profile'):
            return qs.filter(
                shift_assignment__employee_customer_assignment__customer=user.customer_profile,
                status=DailyReport.Status.SUBMITTED  # Customers only view submitted reports
            )
        return qs.none()

    def perform_create(self, serializer):
        user = self.request.user
        shift_assignment = serializer.validated_data.get('shift_assignment')

        # Verify permissions: only assigned employee or admin can create
        if user.role == 'EMPLOYEE' and hasattr(user, 'employee_profile'):
            if shift_assignment.employee_customer_assignment.employee != user.employee_profile:
                raise permissions.exceptions.PermissionDenied("You can only file reports for your assigned shift.")

        report = serializer.save(
            created_by=user,
            updated_by=user,
            last_updated_at=timezone.now()
        )

        # Snapshot initial version
        ReportVersion.objects.create(
            daily_report=report,
            version_number=report.version,
            title_snapshot=report.title,
            content_snapshot={
                'work_summary': report.work_summary,
                'tasks_completed': report.tasks_completed,
                'pending_tasks': report.pending_tasks,
                'issues_or_blockers': report.issues_or_blockers,
                'additional_remarks': report.additional_remarks,
                'status': report.status,
            },
            modified_by=user,
            change_summary='Initial creation'
        )

    def perform_update(self, serializer):
        user = self.request.user
        instance = serializer.instance

        with transaction.atomic():
            new_version = instance.version + 1
            change_summary = self.request.data.get('change_summary', f'Updated to version {new_version}')

            report = serializer.save(
                version=new_version,
                updated_by=user,
                last_updated_at=timezone.now()
            )

            # Preserve complete report snapshot
            ReportVersion.objects.create(
                daily_report=report,
                version_number=new_version,
                title_snapshot=report.title,
                content_snapshot={
                    'work_summary': report.work_summary,
                    'tasks_completed': report.tasks_completed,
                    'pending_tasks': report.pending_tasks,
                    'issues_or_blockers': report.issues_or_blockers,
                    'additional_remarks': report.additional_remarks,
                    'status': report.status,
                },
                modified_by=user,
                change_summary=change_summary
            )

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def submit(self, request, pk=None):
        report = self.get_object()
        user = request.user

        if user.role == 'EMPLOYEE' and hasattr(user, 'employee_profile'):
            if report.shift_assignment.employee_customer_assignment.employee != user.employee_profile:
                return Response({'detail': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

        report.status = DailyReport.Status.SUBMITTED
        report.submitted_at = timezone.now()
        report.last_updated_at = timezone.now()
        report.updated_by = user
        report.save(update_fields=['status', 'submitted_at', 'last_updated_at', 'updated_by'])

        # Record version
        ReportVersion.objects.create(
            daily_report=report,
            version_number=report.version,
            title_snapshot=report.title,
            content_snapshot={
                'work_summary': report.work_summary,
                'tasks_completed': report.tasks_completed,
                'pending_tasks': report.pending_tasks,
                'issues_or_blockers': report.issues_or_blockers,
                'additional_remarks': report.additional_remarks,
                'status': report.status,
            },
            modified_by=user,
            change_summary='Submitted report'
        )

        return Response(DailyReportSerializer(report).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def versions(self, request, pk=None):
        report = self.get_object()
        versions = report.versions.all().order_by('-version_number')
        return Response(ReportVersionSerializer(versions, many=True).data)

    @action(detail=True, methods=['get', 'post'], permission_classes=[permissions.IsAuthenticated])
    def attachments(self, request, pk=None):
        report = self.get_object()

        if request.method == 'GET':
            return Response(ReportAttachmentSerializer(report.attachments.all(), many=True).data)

        file = request.FILES.get('file')
        if not file:
            return Response({'detail': 'No file uploaded.'}, status=status.HTTP_400_BAD_REQUEST)

        # Max file size 10MB
        if file.size > 10 * 1024 * 1024:
            return Response({'detail': 'File size exceeds 10MB limit.'}, status=status.HTTP_400_BAD_REQUEST)

        attachment = ReportAttachment.objects.create(
            daily_report=report,
            uploaded_by=request.user,
            file=file,
            file_name=file.name,
            file_type=file.content_type or 'application/octet-stream',
            file_size=file.size
        )
        return Response(ReportAttachmentSerializer(attachment).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def shift_wise(self, request):
        """Returns reports grouped by shift for a given date for comparison."""
        target_date = request.query_params.get('date', timezone.localdate().isoformat())
        qs = self.get_queryset().filter(shift_assignment__shift_date=target_date)

        results = []
        for r in qs:
            results.append({
                'report_id': str(r.id),
                'shift_name': r.shift_assignment.shift.name,
                'shift_date': str(r.shift_assignment.shift_date),
                'employee_name': r.shift_assignment.employee_customer_assignment.employee.user.get_full_name(),
                'status': r.status,
                'title': r.title,
                'work_summary': r.work_summary,
                'tasks_completed': r.tasks_completed,
                'pending_tasks': r.pending_tasks,
                'issues_or_blockers': r.issues_or_blockers,
                'submitted_at': r.submitted_at,
            })
        return Response({'date': target_date, 'reports': results})
