"""
URL configuration for insightstox project.
"""

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/users/', include('users.urls')),
    path('api/portfolio/', include('portfolio.urls')),
    path('api/dashboard/', include('dashboard.urls')),
    path('api/ai-insight/', include('ai_insight.urls')),
    path('api/feedback/', include('feedback.urls')),
]
