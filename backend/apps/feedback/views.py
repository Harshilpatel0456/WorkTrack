from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from apps.notifications.models import Notification
from apps.notifications.services import create_event_notifications, recipients_for_assignment
from apps.reports.models import DailyReport
from apps.feedback.models import ReportComment
from apps.feedback.serializers import ReportCommentSerializer, CommentReplySerializer


class ReportCommentViewSet(viewsets.ModelViewSet):
    serializer_class = ReportCommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if getattr(self, "swagger_fake_view", False) or not user.is_authenticated:
            return ReportComment.objects.none()
        qs = ReportComment.objects.select_related('author', 'daily_report').prefetch_related('replies')

        report_id = self.request.query_params.get('daily_report')
        if report_id:
            qs = qs.filter(daily_report_id=report_id)

        # By default in list, show top-level comments
        if self.action == 'list':
            qs = qs.filter(parent_comment__isnull=True)

        if user.is_staff or user.role == 'ADMIN':
            return qs
        elif user.role == 'EMPLOYEE' and hasattr(user, 'employee_profile'):
            return qs.filter(
                daily_report__shift_assignment__employee_customer_assignment__employee=user.employee_profile
            )
        elif user.role == 'CUSTOMER' and hasattr(user, 'customer_profile'):
            return qs.filter(
                daily_report__shift_assignment__employee_customer_assignment__customer=user.customer_profile,
                daily_report__status=DailyReport.Status.SUBMITTED,
            )
        return qs.none()

    def perform_create(self, serializer):
        user = self.request.user
        report = serializer.validated_data.get('daily_report')

        # Check authorization
        if user.role == 'EMPLOYEE' and hasattr(user, 'employee_profile'):
            if report.shift_assignment.employee_customer_assignment.employee != user.employee_profile:
                raise permissions.exceptions.PermissionDenied("You are not assigned to this report.")
        elif user.role == 'CUSTOMER' and hasattr(user, 'customer_profile'):
            if report.shift_assignment.employee_customer_assignment.customer != user.customer_profile:
                raise PermissionDenied("You cannot comment on reports outside your account.")
            if report.status != DailyReport.Status.SUBMITTED:
                raise PermissionDenied("Customers can only comment on submitted reports.")
        elif user.role != 'ADMIN' and not user.is_staff:
            raise PermissionDenied("You do not have permission to comment on reports.")

        comment = serializer.save(author=user)
        if user.role == 'CUSTOMER':
            assignment = report.shift_assignment
            recipients = [
                recipient
                for recipient in recipients_for_assignment(assignment)
                if recipient.pk != user.pk
            ]
            create_event_notifications(
                event_type=Notification.EventType.FEEDBACK_RECEIVED,
                source_key=f'feedback:{comment.pk}',
                recipients=recipients,
                title='Customer feedback received',
                message=f'{user.get_full_name()} commented on "{report.title}".',
                daily_report=report,
            )

    def perform_update(self, serializer):
        comment = self.get_object()
        if comment.author_id != self.request.user.id and self.request.user.role != 'ADMIN' and not self.request.user.is_staff:
            raise PermissionDenied("You can only edit your own comments.")
        serializer.save(is_edited=True)

    def perform_destroy(self, instance):
        if instance.author_id != self.request.user.id and self.request.user.role != 'ADMIN' and not self.request.user.is_staff:
            raise PermissionDenied("You can only delete your own comments.")
        instance.delete()

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def reply(self, request, pk=None):
        if request.user.role not in ('EMPLOYEE', 'ADMIN') and not request.user.is_staff:
            return Response({'detail': 'Only assigned employees or administrators can reply.'}, status=status.HTTP_403_FORBIDDEN)
        parent_comment = self.get_object()
        content = (request.data.get('content') or '').strip()
        if not content:
            return Response({'detail': 'Content is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if request.user.role == 'EMPLOYEE':
            employee = getattr(request.user, 'employee_profile', None)
            assigned_employee = parent_comment.daily_report.shift_assignment.employee_customer_assignment.employee
            if employee is None or assigned_employee.id != employee.id:
                return Response({'detail': 'You are not assigned to this report.'}, status=status.HTTP_403_FORBIDDEN)
        if parent_comment.parent_comment_id:
            return Response({'detail': 'Replies must be attached to a top-level comment.'}, status=status.HTTP_400_BAD_REQUEST)

        reply = ReportComment.objects.create(
            daily_report=parent_comment.daily_report,
            parent_comment=parent_comment,
            author=request.user,
            content=content
        )
        assignment = parent_comment.daily_report.shift_assignment
        recipients = [
            recipient
            for recipient in recipients_for_assignment(assignment)
            if recipient.pk != request.user.pk
        ]
        create_event_notifications(
            event_type=Notification.EventType.REPLY_RECEIVED,
            source_key=f'feedback-reply:{reply.pk}',
            recipients=recipients,
            title='Employee replied to feedback',
            message=f'{request.user.get_full_name()} replied to feedback on "{parent_comment.daily_report.title}".',
            daily_report=parent_comment.daily_report,
        )
        return Response(CommentReplySerializer(reply).data, status=status.HTTP_201_CREATED)
