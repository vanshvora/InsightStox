from django.contrib import admin
from .models import GlobalMarketData

@admin.register(GlobalMarketData)
class GlobalMarketDataAdmin(admin.ModelAdmin):
    list_display = ('data_type', 'updated_at')
    search_fields = ('data_type',)
