import requests
from django.conf import settings


def send_email_brevo(to_email, to_name, subject, html_content):
    """
    Send email using Brevo API (port of nodemailer.js).
    """
    try:
        url = 'https://api.brevo.com/v3/smtp/email'
        headers = {
            'accept': 'application/json',
            'api-key': settings.BREVO_API_KEY,
            'content-type': 'application/json',
        }
        data = {
            'sender': {'name': 'InsightStox', 'email': settings.SENDER_EMAIL},
            'to': [{'email': to_email, 'name': to_name}],
            'subject': subject,
            'htmlContent': html_content,
        }
        
        response = requests.post(url, headers=headers, json=data, timeout=10)
        
        if response.status_code >= 300:
            print(f"Brevo API error: {response.text}")
            return False
            
        return True
    except Exception as e:
        print(f"Email sending error: {e}")
        return False
