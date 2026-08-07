from django.urls import path
from . import views

urlpatterns = [
    # Auth & Registration
    path('register/otp/', views.RegisterOtpView.as_view(), name='register_otp'),
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('login/google/', views.GoogleLoginView.as_view(), name='google_login'),
    path('register/google/', views.GoogleRegisterView.as_view(), name='google_register'),
    
    # Logout
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('logout/session/', views.LogoutSessionView.as_view(), name='logout_session'),
    path('logout/all/', views.LogoutAllSessionsView.as_view(), name='logout_all'),
    
    # Profile
    path('profile/', views.ProfileView.as_view(), name='profile'),
    path('profile/name/', views.UpdateProfileNameView.as_view(), name='update_name'),
    path('profile/image/', views.UpdateProfileImageView.as_view(), name='update_image'),
    path('profile/investment-experience/', views.UpdateInvestmentExpView.as_view(), name='update_inv_exp'),
    path('profile/risk-profile/', views.UpdateRiskProfileView.as_view(), name='update_risk'),
    path('profile/financial-goals/', views.UpdateFinancialGoalView.as_view(), name='update_goals'),
    path('profile/investment-horizon/', views.UpdateInvestmentHorizonView.as_view(), name='update_horizon'),
    
    # Password Management
    path('password/forgot/otp/', views.ForgotPasswordOtpView.as_view(), name='forgot_password_otp'),
    path('password/forgot/verify/', views.VerifyOtpView.as_view(), name='forgot_password_verify'),
    path('password/forgot/reset/', views.SetNewPasswordView.as_view(), name='forgot_password_reset'),
    
    path('password/reset/otp/', views.ResetPasswordOtpView.as_view(), name='reset_password_otp'),
    path('password/reset/verify/', views.VerifyOtpProfileView.as_view(), name='reset_password_verify'),
    path('password/reset/', views.SetPasswordProfileView.as_view(), name='reset_password'),
    
    # Preferences & Settings
    path('data-privacy/', views.DataPrivacyView.as_view(), name='data_privacy'),
    path('preferences/ai-suggestion/', views.ToggleAiSuggestionView.as_view(), name='toggle_ai'),
    path('preferences/', views.PreferencesView.as_view(), name='preferences'),
    path('preferences/theme/', views.UpdateThemeView.as_view(), name='update_theme'),
    path('preferences/dashboard-layout/', views.UpdateDashLayoutView.as_view(), name='update_layout'),
    
    # Account
    path('account/', views.DeleteAccountView.as_view(), name='delete_account'),
    path('token/check/', views.CheckTokenView.as_view(), name='check_token'),
    
    # Activity & Sessions
    path('activity/', views.ActivitySessionView.as_view(), name='activity_session'),
    path('activity/all/', views.AllActivityHistoryView.as_view(), name='activity_all'),
    path('activity/by-token/', views.ActivityByTokenView.as_view(), name='activity_by_token'),
    path('activity/download/', views.DownloadActivityReportView.as_view(), name='activity_download'),
    path('activity/clear/', views.ClearActivityHistoryView.as_view(), name='activity_clear'),
    path('security-alerts/', views.AllSecurityAlertsView.as_view(), name='security_alerts'),
    path('portfolio/download/', views.DownloadPortfolioDataView.as_view(), name='portfolio_download'),
]
