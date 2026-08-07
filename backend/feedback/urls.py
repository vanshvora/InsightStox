from django.urls import path
from . import views

urlpatterns = [
    path('query/', views.SendQueryView.as_view(), name='send_query'),
    path('suggestion/', views.SendSuggestionView.as_view(), name='send_suggestion'),
]
