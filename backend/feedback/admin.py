from django.contrib import admin
from .models import UserQuery, UserSuggestion

admin.site.register(UserQuery)
admin.site.register(UserSuggestion)
