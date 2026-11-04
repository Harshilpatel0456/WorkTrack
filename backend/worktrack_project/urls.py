from django.db import DatabaseError, connections
from django.http import JsonResponse
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)


def health_check(request):
    try:
        with connections['default'].cursor() as cursor:
            cursor.execute('SELECT 1')
    except DatabaseError:
        return JsonResponse({'status': 'unavailable'}, status=503)
    return JsonResponse({'status': 'ok'})


urlpatterns = [
    path('healthz/', health_check, name='health-check'),
    path('admin/', admin.site.urls),

    # OpenAPI Schema & Interactive Swagger UI
    path('api/v1/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/v1/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/v1/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # Modular API v1 Routes
    path('api/v1/auth/', include('apps.accounts.urls', namespace='accounts')),
    path('api/v1/employees/', include('apps.employees.urls', namespace='employees')),
    path('api/v1/customers/', include('apps.customers.urls', namespace='customers')),
    path('api/v1/assignments/', include('apps.assignments.urls', namespace='assignments')),
    path('api/v1/shifts/', include('apps.shifts.urls', namespace='shifts')),
    path('api/v1/attendance/', include('apps.attendance.urls', namespace='attendance')),
    path('api/v1/reports/', include('apps.reports.urls', namespace='reports')),
    path('api/v1/feedback/', include('apps.feedback.urls', namespace='feedback')),
    path('api/v1/notifications/', include('apps.notifications.urls', namespace='notifications')),
    path('api/v1/surveillance/', include('apps.surveillance.urls', namespace='surveillance')),
    path('api/v1/', include('apps.audit.urls', namespace='audit')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
