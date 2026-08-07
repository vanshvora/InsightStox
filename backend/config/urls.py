"""
URL configuration for insightstox project.
"""

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('users/', include('users.urls')),
    path('portfolio/', include('portfolio.urls')),
    path('dashboard/', include('dashboard.urls')),
    path('ai-insight/', include('ai_insight.urls')),
    path('feedback/', include('feedback.urls')),
]
