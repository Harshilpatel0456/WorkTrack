from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SurveillanceBatchViewSet, CameraSnapshotViewSet

app_name = 'surveillance'

router = DefaultRouter()
router.register(r'batches', SurveillanceBatchViewSet, basename='surveillance-batch')
router.register(r'snapshots', CameraSnapshotViewSet, basename='camera-snapshot')

urlpatterns = [
    path('', include(router.urls)),
]

