from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ReportCommentViewSet

app_name = 'feedback'

router = DefaultRouter()
router.register(r'comments', ReportCommentViewSet, basename='report-comment')

urlpatterns = [
    path('', include(router.urls)),
]

