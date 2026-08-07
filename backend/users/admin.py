from django.contrib import admin
from .models import User, ActiveSession, SecurityAlert, ActivityHistory

admin.site.register(User)
admin.site.register(ActiveSession)
admin.site.register(SecurityAlert)
admin.site.register(ActivityHistory)
