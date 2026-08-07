from django.urls import path
from . import views

urlpatterns = [
    path('message/', views.SendMessageView.as_view(), name='send_message'),
]
