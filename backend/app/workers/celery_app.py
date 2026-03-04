from celery import Celery
from celery.schedules import crontab
from app.config import settings

celery_app = Celery(
    "price_monitor",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="America/Sao_Paulo",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    result_expires=3600,
    broker_connection_retry_on_startup=True,
    # Beat schedule: orchestrator task runs every minute and dispatches
    # individual product checks based on their configured interval.
    beat_schedule={
        "dispatch-product-checks-every-minute": {
            "task": "app.workers.tasks.dispatch_due_product_checks",
            "schedule": 60.0,  # every 60 seconds
        },
    },
)
