from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ActivityLogViewSet,
    AdminDashboardView,
    EmployeeDashboardView,
    CustomerDashboardView,
)

app_name = 'audit'

router = DefaultRouter()
router.register(r'logs', ActivityLogViewSet, basename='activity-log')

urlpatterns = [
    path('dashboard/admin/', AdminDashboardView.as_view(), name='admin_dashboard'),
    path('dashboard/employee/', EmployeeDashboardView.as_view(), name='employee_dashboard'),
    path('dashboard/customer/', CustomerDashboardView.as_view(), name='customer_dashboard'),
    path('', include(router.urls)),
]

