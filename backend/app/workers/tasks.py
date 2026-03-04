"""
Celery tasks for price checking and alert dispatching.

Architecture:
  - celery-beat runs `dispatch_due_product_checks` every minute.
  - That task queries products whose next check time has elapsed and
    enqueues individual `check_product_price` tasks for each.
  - `check_product_price` calls the scraper, persists price history,
    updates the product, and fires notifications when the target is met.
  - Deduplication: alerts are only sent once per price-drop event
    (alert_sent flag is reset when target_price changes or price rises
    back above target).
"""
import logging
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from celery import shared_task
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.workers.celery_app import celery_app
from app.config import settings

logger = logging.getLogger(__name__)


def _get_sync_session():
    """Return a synchronous SQLAlchemy session for Celery tasks."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    engine = create_engine(
        settings.DATABASE_URL_SYNC,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
    )
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    return SessionLocal()


# ---------------------------------------------------------------------------
# Orchestrator task (beat-scheduled)
# ---------------------------------------------------------------------------

@celery_app.task(name="app.workers.tasks.dispatch_due_product_checks", bind=True, max_retries=3)
def dispatch_due_product_checks(self):
    """
    Runs every minute via Celery Beat.
    Finds all active products whose next check is overdue and dispatches
    individual check tasks for each.
    """
    from app.models.product import Product

    db: Session = _get_sync_session()
    try:
        now = datetime.now(tz=timezone.utc)
        result = db.execute(
            select(Product).where(Product.is_active == True)  # noqa: E712
        )
        products = result.scalars().all()

        dispatched = 0
        for product in products:
            if product.last_checked_at is None:
                due = True
            else:
                last = product.last_checked_at
                if last.tzinfo is None:
                    last = last.replace(tzinfo=timezone.utc)
                next_check = last + timedelta(minutes=product.check_interval_minutes)
                due = now >= next_check

            if due:
                check_product_price.delay(str(product.id))
                dispatched += 1

        logger.info("Dispatched %d product price checks", dispatched)
    except Exception as exc:
        logger.error("dispatch_due_product_checks failed: %s", exc)
        raise self.retry(exc=exc, countdown=30)
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Individual product check task
# ---------------------------------------------------------------------------

@celery_app.task(name="app.workers.tasks.check_product_price", bind=True, max_retries=3)
def check_product_price(self, product_id: str):
    """
    Fetch the current price of a single product, store price history,
    update the product record, and fire notifications if target is reached.
    """
    import asyncio
    from app.models.product import Product
    from app.models.price_history import PriceHistory
    from app.models.alert import Alert
    from app.models.user import User
    from app.services.scraper import scrape_product_price
    from app.services.notification import send_email_alert, send_whatsapp_alert

    db: Session = _get_sync_session()
    try:
        result = db.execute(select(Product).where(Product.id == product_id))
        product = result.scalar_one_or_none()
        if not product:
            logger.warning("check_product_price: product %s not found", product_id)
            return

        # Scrape price (run async scraper in a new event loop)
        loop = asyncio.new_event_loop()
        try:
            price_data = loop.run_until_complete(
                scrape_product_price(product.url, product.retailer)
            )
        finally:
            loop.close()

        now = datetime.now(tz=timezone.utc)
        product.last_checked_at = now

        if price_data is None:
            logger.warning("Could not fetch price for product %s", product_id)
            db.commit()
            return

        new_price: Decimal | None = price_data.get("price")
        is_available: bool = price_data.get("is_available", False)

        product.is_available = is_available

        if new_price is not None:
            old_price = product.current_price
            product.current_price = new_price

            if product.lowest_price is None or new_price < product.lowest_price:
                product.lowest_price = new_price
            if product.highest_price is None or new_price > product.highest_price:
                product.highest_price = new_price

            # Reset dedup flag if price went back above target
            if old_price is not None and new_price > product.target_price and product.alert_sent:
                product.alert_sent = False
                logger.debug("Reset alert_sent for product %s (price rose above target)", product_id)

            # Persist price history
            history = PriceHistory(
                product_id=product.id,
                price=new_price,
                is_available=is_available,
                checked_at=now,
            )
            db.add(history)

            # Check if alert should fire
            should_alert = (
                is_available
                and new_price <= product.target_price
                and not product.alert_sent
            )

            if should_alert:
                user_result = db.execute(select(User).where(User.id == product.user_id))
                user = user_result.scalar_one_or_none()

                if user and user.is_active:
                    email_sent = False
                    whatsapp_sent = False
                    notification_type = []

                    if user.notify_email:
                        email_sent = send_email_alert(
                            to_email=user.email,
                            to_name=user.full_name,
                            product_name=product.name,
                            product_url=product.url,
                            current_price=new_price,
                            target_price=product.target_price,
                        )
                        if email_sent:
                            notification_type.append("email")

                    if user.notify_whatsapp and user.phone_whatsapp:
                        whatsapp_sent = send_whatsapp_alert(
                            phone=user.phone_whatsapp,
                            product_name=product.name,
                            product_url=product.url,
                            current_price=new_price,
                            target_price=product.target_price,
                        )
                        if whatsapp_sent:
                            notification_type.append("whatsapp")

                    if notification_type:
                        alert_record = Alert(
                            user_id=user.id,
                            product_id=product.id,
                            triggered_price=new_price,
                            target_price=product.target_price,
                            notification_type=",".join(notification_type),
                            message=(
                                f"Price dropped to R$ {new_price:,.2f} "
                                f"(target: R$ {product.target_price:,.2f})"
                            ),
                            sent_at=now,
                        )
                        db.add(alert_record)
                        product.alert_sent = True
                        logger.info(
                            "Alert fired for product %s (price=%.2f target=%.2f) via %s",
                            product_id, new_price, product.target_price, notification_type,
                        )

        db.add(product)
        db.commit()
        logger.info("Price check done: product=%s price=%s available=%s", product_id, new_price, is_available)

    except Exception as exc:
        db.rollback()
        logger.error("check_product_price failed for %s: %s", product_id, exc)
        raise self.retry(exc=exc, countdown=60)
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Helper: manually schedule a product (called on creation)
# ---------------------------------------------------------------------------

@celery_app.task(name="app.workers.tasks.schedule_product_check")
def schedule_product_check(product_id: str):
    """
    Immediately trigger a first price check after a product is created.
    Subsequent checks are handled by the beat-driven dispatcher.
    """
    logger.info("Initial price check scheduled for product %s", product_id)
    check_product_price.delay(product_id)
