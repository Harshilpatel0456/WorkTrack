from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ShiftViewSet, ShiftAssignmentViewSet

app_name = 'shifts'

router = DefaultRouter()
router.register(r'templates', ShiftViewSet, basename='shift-template')
router.register(r'schedules', ShiftAssignmentViewSet, basename='shift-schedule')

urlpatterns = [
    path('', include(router.urls)),
]

