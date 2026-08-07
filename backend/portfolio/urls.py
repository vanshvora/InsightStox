from django.urls import path
from . import views

urlpatterns = [
    path('summary/', views.PortfolioSummaryView.as_view(), name='portfolio_summary'),
    path('fundamentals/', views.PortfolioFundamentalsView.as_view(), name='portfolio_fundamentals'),
    path('holdings/', views.PortfolioHoldingsView.as_view(), name='portfolio_holdings'),
]
