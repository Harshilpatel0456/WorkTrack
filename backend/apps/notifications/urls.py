from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    NotificationViewSet,
    NotificationPreferenceViewSet,
    PushDeviceViewSet,
)

app_name = 'notifications'

router = DefaultRouter()
router.register(r'preferences', NotificationPreferenceViewSet, basename='notification-preference')
router.register(r'devices', PushDeviceViewSet, basename='push-device')
router.register(r'', NotificationViewSet, basename='notification')

urlpatterns = [
    path('', include(router.urls)),
]

