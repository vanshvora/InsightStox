from django.db import models


class UserQuery(models.Model):
    """User-submitted queries/questions."""

    user = models.ForeignKey(
        'users.User', on_delete=models.CASCADE, related_name='queries'
    )
    query = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'query')

    def __str__(self):
        return f"{self.user.email} - {self.query[:50]}"


class UserSuggestion(models.Model):
    """User-submitted suggestions/feedback."""

    user = models.ForeignKey(
        'users.User', on_delete=models.CASCADE, related_name='suggestions'
    )
    suggestion = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'suggestion')

    def __str__(self):
        return f"{self.user.email} - {self.suggestion[:50]}"
