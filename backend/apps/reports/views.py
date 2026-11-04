from django.db import transaction
from django.db.models import Count
from django.http import FileResponse
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from apps.accounts.permissions import IsAdmin, IsEmployee
from apps.notifications.models import Notification
from apps.notifications.services import notify_assignment_recipients
from apps.reports.models import DailyReport, ReportAttachment, ReportVersion
from apps.reports.serializers import (
    DailyReportSerializer,
    ReportAttachmentSerializer,
    ReportVersionSerializer,
    validate_report_attachment,
)
from apps.shifts.models import ShiftAssignment


SNAPSHOT_FIELDS = (
    'title',
    'work_summary',
    'tasks_completed',
    'pending_tasks',
    'issues_or_blockers',
    'additional_remarks',
    'status',
)


def _report_snapshot(report):
    return {field: getattr(report, field) or '' for field in SNAPSHOT_FIELDS}


def _report_filters(queryset, params):
    filters = {
        'employee': 'shift_assignment__employee_customer_assignment__employee_id',
        'customer': 'shift_assignment__employee_customer_assignment__customer_id',
        'shift': 'shift_assignment__shift_id',
    }
    for param, field in filters.items():
        value = params.get(param)
        if value:
            queryset = queryset.filter(**{field: value})

    date_filter = params.get('date') or params.get('shift_assignment__shift_date')
    if date_filter:
        parsed_date = parse_date(date_filter)
        if not parsed_date:
            raise ValidationError({'date': 'Enter a valid date in YYYY-MM-DD format.'})
        queryset = queryset.filter(shift_assignment__shift_date=parsed_date)
    date_from = params.get('date_from')
    if date_from:
        parsed_from = parse_date(date_from)
        if not parsed_from:
            raise ValidationError({'date_from': 'Enter a valid date in YYYY-MM-DD format.'})
        queryset = queryset.filter(shift_assignment__shift_date__gte=parsed_from)
    date_to = params.get('date_to')
    if date_to:
        parsed_to = parse_date(date_to)
        if not parsed_to:
            raise ValidationError({'date_to': 'Enter a valid date in YYYY-MM-DD format.'})
        queryset = queryset.filter(shift_assignment__shift_date__lte=parsed_to)
    report_status = params.get('status') or params.get('submission_status')
    if report_status:
        queryset = queryset.filter(status=report_status.upper())
    return queryset


class DailyReportViewSet(viewsets.ModelViewSet):
    serializer_class = DailyReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = [
        'title',
        'work_summary',
        'tasks_completed',
        'pending_tasks',
        'issues_or_blockers',
        'shift_assignment__employee_customer_assignment__employee__employee_code',
        'shift_assignment__employee_customer_assignment__customer__company_name',
    ]
    ordering_fields = ['submitted_at', 'created_at', 'last_updated_at', 'version']
    ordering = ['-created_at']

    def _base_queryset(self):
        user = self.request.user
        if getattr(self, 'swagger_fake_view', False) or not user.is_authenticated:
            return DailyReport.objects.none()
        queryset = DailyReport.objects.select_related(
            'shift_assignment__shift',
            'shift_assignment__employee_customer_assignment__employee__user',
            'shift_assignment__employee_customer_assignment__customer',
            'created_by',
            'updated_by',
        ).prefetch_related('attachments', 'versions')

        if user.is_staff or user.is_superuser or user.role == 'ADMIN':
            return queryset
        if user.role == 'EMPLOYEE':
            queryset = queryset.filter(
                shift_assignment__employee_customer_assignment__employee__user=user
            )
        elif user.role == 'CUSTOMER':
            queryset = queryset.filter(
                shift_assignment__employee_customer_assignment__customer__user=user,
                status=DailyReport.Status.SUBMITTED,
            )
        else:
            return queryset.none()
        return queryset

    def get_queryset(self):
        return _report_filters(self._base_queryset(), self.request.query_params)

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'submit'):
            return [permissions.IsAuthenticated(), IsEmployee()]
        if self.action == 'correct':
            return [permissions.IsAuthenticated(), IsAdmin()]
        return super().get_permissions()

    def _create_version(self, report, user, summary, previous=None):
        ReportVersion.objects.create(
            daily_report=report,
            version_number=report.version,
            title_snapshot=report.title,
            content_snapshot=_report_snapshot(report),
            previous_content_snapshot=previous,
            modified_by=user,
            change_summary=summary,
        )

    @transaction.atomic
    def perform_create(self, serializer):
        user = self.request.user
        shift_assignment = serializer.validated_data['shift_assignment']
        profile = getattr(user, 'employee_profile', None)
        if profile is None or shift_assignment.employee_customer_assignment.employee_id != profile.id:
            raise PermissionDenied(
                'You can only file reports for your assigned shifts.'
            )
        if shift_assignment.status == ShiftAssignment.Status.CANCELLED:
            raise ValidationError({'shift_assignment': 'Cannot report on a cancelled shift.'})
        if shift_assignment.employee_customer_assignment.status != 'ACTIVE':
            raise ValidationError({'shift_assignment': 'An active employee-customer assignment is required.'})

        report_status = serializer.validated_data.get('status', DailyReport.Status.DRAFT)
        report = serializer.save(
            created_by=user,
            updated_by=user,
            submitted_at=timezone.now() if report_status == DailyReport.Status.SUBMITTED else None,
            last_updated_at=timezone.now(),
        )
        self._create_version(
            report,
            user,
            'Initial submission' if report.status == DailyReport.Status.SUBMITTED else 'Initial draft',
        )
        if report.status == DailyReport.Status.SUBMITTED:
            notify_assignment_recipients(
                report.shift_assignment,
                event_type=Notification.EventType.REPORT_SUBMITTED,
                source_key=f'report:{report.pk}:submitted:v{report.version}',
                title='Daily report submitted',
                message=f'{user.get_full_name()} submitted "{report.title}".',
                daily_report=report,
            )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        with transaction.atomic():
            instance = self.get_object()
            instance = DailyReport.objects.select_for_update().get(pk=instance.pk)
            previous = _report_snapshot(instance)
            previous_status = instance.status
            serializer = self.get_serializer(instance, data=request.data, partial=partial)
            serializer.is_valid(raise_exception=True)
            summary = request.data.get('change_summary') or f'Updated to version {instance.version + 1}'
            report = serializer.save(
                version=instance.version + 1,
                updated_by=request.user,
                last_updated_at=timezone.now(),
            )
            self._create_version(report, request.user, summary, previous=previous)
            if report.status == DailyReport.Status.SUBMITTED:
                event_type = (
                    Notification.EventType.REPORT_SUBMITTED
                    if previous_status != DailyReport.Status.SUBMITTED
                    else Notification.EventType.REPORT_UPDATED
                )
                notify_assignment_recipients(
                    report.shift_assignment,
                    event_type=event_type,
                    source_key=f'report:{report.pk}:v{report.version}',
                    title=(
                        'Daily report submitted'
                        if event_type == Notification.EventType.REPORT_SUBMITTED
                        else 'Daily report updated'
                    ),
                    message=f'{request.user.get_full_name()} { "submitted" if event_type == Notification.EventType.REPORT_SUBMITTED else "updated" } "{report.title}".',
                    daily_report=report,
                )
        return Response(self.get_serializer(report).data)

    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def submit(self, request, pk=None):
        report = DailyReport.objects.select_for_update().get(pk=self.get_object().pk)
        if report.status == DailyReport.Status.SUBMITTED:
            return Response({'detail': 'This report has already been submitted.'}, status=status.HTTP_400_BAD_REQUEST)
        previous = _report_snapshot(report)
        report.status = DailyReport.Status.SUBMITTED
        report.version += 1
        report.submitted_at = timezone.now()
        report.last_updated_at = report.submitted_at
        report.updated_by = request.user
        report.save(update_fields=[
            'status', 'version', 'submitted_at', 'last_updated_at', 'updated_by', 'updated_at',
        ])
        self._create_version(report, request.user, 'Submitted report', previous=previous)
        notify_assignment_recipients(
            report.shift_assignment,
            event_type=Notification.EventType.REPORT_SUBMITTED,
            source_key=f'report:{report.pk}:submitted:v{report.version}',
            title='Daily report submitted',
            message=f'{request.user.get_full_name()} submitted "{report.title}".',
            daily_report=report,
        )
        return Response(self.get_serializer(report).data)

    @action(detail=True, methods=['get'])
    def versions(self, request, pk=None):
        report = self.get_object()
        versions = report.versions.select_related('modified_by').order_by('-version_number')
        return Response(ReportVersionSerializer(versions, many=True).data)

    @action(detail=True, methods=['get', 'post'])
    def attachments(self, request, pk=None):
        report = self.get_object()
        if request.method == 'GET':
            return Response(ReportAttachmentSerializer(report.attachments.all(), many=True).data)
        if request.user.role != 'EMPLOYEE' or report.shift_assignment.employee_customer_assignment.employee.user_id != request.user.id:
            return Response({'detail': 'Only the assigned employee can attach files.'}, status=status.HTTP_403_FORBIDDEN)
        file = request.FILES.get('file')
        if not file:
            return Response({'detail': 'No file uploaded.'}, status=status.HTTP_400_BAD_REQUEST)
        validate_report_attachment(file)
        attachment = ReportAttachment.objects.create(
            daily_report=report,
            uploaded_by=request.user,
            file=file,
            file_name=file.name,
            file_type='application/octet-stream',
            file_size=file.size,
        )
        return Response(ReportAttachmentSerializer(attachment).data, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=['get'],
        url_path=r'attachments/(?P<attachment_id>[^/.]+)/download',
    )
    def attachment_download(self, request, pk=None, attachment_id=None):
        report = self.get_object()
        try:
            attachment = report.attachments.get(pk=attachment_id)
        except ReportAttachment.DoesNotExist:
            return Response({'detail': 'Attachment not found.'}, status=status.HTTP_404_NOT_FOUND)

        response = FileResponse(
            attachment.file.open('rb'),
            as_attachment=True,
            filename=attachment.file_name,
            content_type='application/octet-stream',
        )
        response['Cache-Control'] = 'private, no-store'
        response['X-Content-Type-Options'] = 'nosniff'
        return response

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def summary(self, request):
        queryset = self.get_queryset()
        target_date = request.query_params.get('date') or timezone.localdate().isoformat()
        parsed_date = parse_date(target_date)
        if not parsed_date:
            raise ValidationError({'date': 'Enter a valid date in YYYY-MM-DD format.'})
        daily = queryset.filter(shift_assignment__shift_date=parsed_date)
        summary_params = request.query_params.copy()
        summary_params.pop('status', None)
        summary_params.pop('submission_status', None)
        all_reports = _report_filters(self._base_queryset(), summary_params)

        assignments = ShiftAssignment.objects.exclude(
            status=ShiftAssignment.Status.CANCELLED
        )
        user = request.user
        if user.role == 'EMPLOYEE':
            assignments = assignments.filter(employee_customer_assignment__employee__user=user)
        elif user.role == 'CUSTOMER':
            assignments = assignments.filter(employee_customer_assignment__customer__user=user)
        elif user.role != 'ADMIN' and not (user.is_staff or user.is_superuser):
            assignments = assignments.none()
        assignments = assignments.filter(**{
            key: value for key, value in {
                'employee_customer_assignment__employee_id': request.query_params.get('employee'),
                'employee_customer_assignment__customer_id': request.query_params.get('customer'),
                'shift_id': request.query_params.get('shift'),
            }.items() if value
        })
        if request.query_params.get('date'):
            assignments = assignments.filter(shift_date=parsed_date)
        if request.query_params.get('date_from'):
            date_from = parse_date(request.query_params['date_from'])
            if not date_from:
                raise ValidationError({'date_from': 'Enter a valid date in YYYY-MM-DD format.'})
            assignments = assignments.filter(shift_date__gte=date_from)
        if request.query_params.get('date_to'):
            date_to = parse_date(request.query_params['date_to'])
            if not date_to:
                raise ValidationError({'date_to': 'Enter a valid date in YYYY-MM-DD format.'})
            assignments = assignments.filter(shift_date__lte=date_to)

        def counts(rows):
            return {item['status']: item['count'] for item in rows.values('status').annotate(count=Count('id'))}

        daily_assignments = assignments.filter(shift_date=parsed_date).count()
        daily_reports = daily.count()
        daily_counts = counts(daily)
        daily_submitted_reports = all_reports.filter(
            shift_assignment__shift_date=parsed_date,
            status=DailyReport.Status.SUBMITTED,
        ).values('shift_assignment_id').distinct().count()
        overall_submitted_reports = all_reports.filter(
            status=DailyReport.Status.SUBMITTED,
        ).values('shift_assignment_id').distinct().count()
        return Response({
            'date': parsed_date,
            'daily': {
                'total': daily_reports,
                'statuses': daily_counts,
                'submitted': daily_counts.get(DailyReport.Status.SUBMITTED, 0),
                'pending': max(0, daily_assignments - daily_submitted_reports),
                'updated': daily.filter(version__gt=1).count(),
            },
            'overall': {
                'total': queryset.count(),
                'statuses': counts(queryset),
                'submitted': queryset.filter(status=DailyReport.Status.SUBMITTED).count(),
                'pending': max(0, assignments.count() - overall_submitted_reports),
                'updated': queryset.filter(version__gt=1).count(),
            },
        })

    @action(detail=False, methods=['get'])
    def shift_wise(self, request):
        target_date = request.query_params.get('date', timezone.localdate().isoformat())
        parsed_date = parse_date(target_date)
        if not parsed_date:
            raise ValidationError({'date': 'Enter a valid date in YYYY-MM-DD format.'})
        reports = self.get_queryset().filter(shift_assignment__shift_date=parsed_date)
        return Response({
            'date': parsed_date,
            'reports': [
                {
                    'report_id': str(report.id),
                    'shift_name': report.shift_assignment.shift.name,
                    'shift_date': report.shift_assignment.shift_date,
                    'employee_name': report.shift_assignment.employee_customer_assignment.employee.user.get_full_name(),
                    'status': report.status,
                    'title': report.title,
                    'work_summary': report.work_summary,
                    'tasks_completed': report.tasks_completed,
                    'pending_tasks': report.pending_tasks,
                    'issues_or_blockers': report.issues_or_blockers,
                    'submitted_at': report.submitted_at,
                }
                for report in reports
            ],
        })
