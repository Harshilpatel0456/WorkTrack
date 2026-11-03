from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
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
                daily_report__shift_assignment__employee_customer_assignment__customer=user.customer_profile
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
                raise permissions.exceptions.PermissionDenied("You cannot comment on reports outside your account.")

        serializer.save(author=user)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def reply(self, request, pk=None):
        parent_comment = self.get_object()
        content = request.data.get('content')
        if not content:
            return Response({'detail': 'Content is required.'}, status=status.HTTP_400_BAD_REQUEST)

        reply = ReportComment.objects.create(
            daily_report=parent_comment.daily_report,
            parent_comment=parent_comment,
            author=request.user,
            content=content
        )
        return Response(CommentReplySerializer(reply).data, status=status.HTTP_201_CREATED)
