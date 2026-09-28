from django.urls import path
from . import views
from portfolio.views import AddTransactionView

urlpatterns = [
    path('search/', views.SearchStockView.as_view(), name='search_stock'),
    path('starter/', views.StarterView.as_view(), name='starter_stocks'),
    path('valuation/', views.ValuationView.as_view(), name='valuation'),
    
    path('transactions/', AddTransactionView.as_view(), name='add_transaction'),
    
    path('watchlist/', views.WatchlistView.as_view(), name='watchlist'),
    path('watchlist/add/', views.AddToWatchlistView.as_view(), name='add_watchlist'),
    path('watchlist/remove/', views.RemoveFromWatchlistView.as_view(), name='remove_watchlist'),
    
    path('alerts/', views.PriceAlertView.as_view(), name='price_alerts'),
    path('alerts/<int:alert_id>/', views.PriceAlertView.as_view(), name='delete_price_alert'),
    
    path('allocation/', views.StockAllocationView.as_view(), name='allocation'),
    
    path('market/gainers/', views.MarketGainersView.as_view(), name='market_gainers'),
    path('market/losers/', views.MarketLosersView.as_view(), name='market_losers'),
    path('market/active/', views.MarketActiveView.as_view(), name='market_active'),
    
    path('stock-summary/', views.StockSummaryView.as_view(), name='stock_summary'),
    path('portfolio-valuation/', views.PortfolioValuationHistoryView.as_view(), name='portfolio_valuation_history'),
    path('stock-details/', views.StockDetailsView.as_view(), name='stock_details'),
    
    path('graph/', views.GraphDataView.as_view(), name='graph_data'),
    path('news/<str:query>/', views.NewsView.as_view(), name='news'),
]
