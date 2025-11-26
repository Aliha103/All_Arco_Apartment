"""
Celery configuration for All'Arco Apartment backend.
"""
import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

app = Celery('allarco')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# Celery Beat Schedule
app.conf.beat_schedule = {
    'send-checkin-instructions-daily': {
        'task': 'apps.emails.tasks.send_checkin_instructions',
        'schedule': crontab(hour=9, minute=0),  # Daily at 9 AM
    },
    'send-pre-arrival-reminders': {
        'task': 'apps.emails.tasks.send_pre_arrival_reminders',
        'schedule': crontab(hour=10, minute=0),  # Daily at 10 AM
    },
    'send-post-stay-emails': {
        'task': 'apps.emails.tasks.send_post_stay_emails',
        'schedule': crontab(hour=11, minute=0),  # Daily at 11 AM
    },
}
