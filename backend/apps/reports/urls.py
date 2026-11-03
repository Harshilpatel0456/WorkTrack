from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DailyReportViewSet

app_name = 'reports'

router = DefaultRouter()
router.register(r'', DailyReportViewSet, basename='daily-report')

urlpatterns = [
    path('', include(router.urls)),
]

