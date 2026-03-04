"""
Notification service — Email (SMTP or SendGrid) + WhatsApp (Twilio or Z-API).
All functions are synchronous because they run inside Celery tasks.
"""
import logging
import smtplib
from decimal import Decimal
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Email
# ---------------------------------------------------------------------------

def _build_email_html(
    product_name: str,
    product_url: str,
    current_price: Decimal,
    target_price: Decimal,
) -> str:
    discount_pct = (
        round((1 - float(current_price) / float(target_price)) * 100, 1)
        if target_price > 0
        else 0
    )
    return f"""
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Alerta de Preço</title></head>
<body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
  <div style="max-width:600px;margin:auto;background:#fff;border-radius:8px;
              padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <h2 style="color:#2e7d32;">🎉 Alerta de Queda de Preço!</h2>
    <p>O produto que você está monitorando atingiu ou ultrapassou seu preço alvo.</p>
    <table style="width:100%;border-collapse:collapse;margin-top:16px;">
      <tr>
        <td style="padding:8px;font-weight:bold;">Produto</td>
        <td style="padding:8px;">{product_name}</td>
      </tr>
      <tr style="background:#f9f9f9;">
        <td style="padding:8px;font-weight:bold;">Preço Atual</td>
        <td style="padding:8px;color:#c62828;font-size:1.3em;font-weight:bold;">
          R$ {current_price:,.2f}
        </td>
      </tr>
      <tr>
        <td style="padding:8px;font-weight:bold;">Preço Alvo</td>
        <td style="padding:8px;">R$ {target_price:,.2f}</td>
      </tr>
      {"" if discount_pct <= 0 else f'''
      <tr style="background:#f9f9f9;">
        <td style="padding:8px;font-weight:bold;">Economia</td>
        <td style="padding:8px;color:#2e7d32;">{discount_pct}% abaixo do alvo</td>
      </tr>'''}
    </table>
    <div style="margin-top:24px;text-align:center;">
      <a href="{product_url}"
         style="background:#1565c0;color:#fff;padding:12px 28px;border-radius:4px;
                text-decoration:none;font-size:1em;">
        Ver Produto
      </a>
    </div>
    <p style="margin-top:24px;font-size:0.8em;color:#757575;">
      Você receberá este alerta apenas uma vez por ciclo de preço.
      Acesse o painel para ajustar suas configurações.
    </p>
  </div>
</body>
</html>
"""


def send_email_alert(
    to_email: str,
    to_name: str,
    product_name: str,
    product_url: str,
    current_price: Decimal,
    target_price: Decimal,
) -> bool:
    """Send price alert email. Returns True on success."""
    if settings.USE_SENDGRID and settings.SENDGRID_API_KEY:
        return _send_via_sendgrid(
            to_email, to_name, product_name, product_url, current_price, target_price
        )
    return _send_via_smtp(
        to_email, to_name, product_name, product_url, current_price, target_price
    )


def _send_via_smtp(
    to_email: str,
    to_name: str,
    product_name: str,
    product_url: str,
    current_price: Decimal,
    target_price: Decimal,
) -> bool:
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("SMTP credentials not configured — skipping email alert")
        return False

    subject = f"🔔 Alerta de Preço: {product_name[:50]} — R$ {current_price:,.2f}"
    html_content = _build_email_html(product_name, product_url, current_price, target_price)

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
    msg["To"] = f"{to_name} <{to_email}>"
    msg.attach(MIMEText(html_content, "html", "utf-8"))

    try:
        if settings.SMTP_TLS:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
            server.starttls()
        else:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT)
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.EMAILS_FROM_EMAIL, [to_email], msg.as_string())
        server.quit()
        logger.info("Email alert sent to %s for product %s", to_email, product_name[:40])
        return True
    except Exception as exc:
        logger.error("Failed to send SMTP email to %s: %s", to_email, exc)
        return False


def _send_via_sendgrid(
    to_email: str,
    to_name: str,
    product_name: str,
    product_url: str,
    current_price: Decimal,
    target_price: Decimal,
) -> bool:
    try:
        import sendgrid
        from sendgrid.helpers.mail import Mail, To, From

        sg = sendgrid.SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
        subject = f"🔔 Alerta de Preço: {product_name[:50]} — R$ {current_price:,.2f}"
        html_content = _build_email_html(product_name, product_url, current_price, target_price)

        message = Mail(
            from_email=From(settings.EMAILS_FROM_EMAIL, settings.EMAILS_FROM_NAME),
            to_emails=To(to_email, to_name),
            subject=subject,
            html_content=html_content,
        )
        response = sg.send(message)
        logger.info(
            "SendGrid email sent to %s, status=%s", to_email, response.status_code
        )
        return response.status_code in (200, 202)
    except Exception as exc:
        logger.error("Failed to send SendGrid email to %s: %s", to_email, exc)
        return False


# ---------------------------------------------------------------------------
# WhatsApp
# ---------------------------------------------------------------------------

def send_whatsapp_alert(
    phone: str,
    product_name: str,
    product_url: str,
    current_price: Decimal,
    target_price: Decimal,
) -> bool:
    """Send WhatsApp price alert. Returns True on success."""
    if settings.USE_ZAPI and settings.ZAPI_INSTANCE_ID:
        return _send_via_zapi(phone, product_name, product_url, current_price, target_price)
    return _send_via_twilio(phone, product_name, product_url, current_price, target_price)


def _build_whatsapp_message(
    product_name: str,
    product_url: str,
    current_price: Decimal,
    target_price: Decimal,
) -> str:
    return (
        f"🔔 *Alerta de Preço — Price Monitor*\n\n"
        f"O produto *{product_name[:80]}* atingiu seu preço alvo!\n\n"
        f"💰 Preço atual: *R$ {current_price:,.2f}*\n"
        f"🎯 Seu alvo: R$ {target_price:,.2f}\n\n"
        f"🛒 Ver produto:\n{product_url}"
    )


def _send_via_twilio(
    phone: str,
    product_name: str,
    product_url: str,
    current_price: Decimal,
    target_price: Decimal,
) -> bool:
    if not all([settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN, settings.TWILIO_WHATSAPP_FROM]):
        logger.warning("Twilio credentials not configured — skipping WhatsApp alert")
        return False

    try:
        from twilio.rest import Client

        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        to_whatsapp = f"whatsapp:{phone}" if not phone.startswith("whatsapp:") else phone
        body = _build_whatsapp_message(product_name, product_url, current_price, target_price)

        message = client.messages.create(
            body=body,
            from_=settings.TWILIO_WHATSAPP_FROM,
            to=to_whatsapp,
        )
        logger.info("Twilio WhatsApp sent to %s, SID=%s", phone, message.sid)
        return True
    except Exception as exc:
        logger.error("Failed to send Twilio WhatsApp to %s: %s", phone, exc)
        return False


def _send_via_zapi(
    phone: str,
    product_name: str,
    product_url: str,
    current_price: Decimal,
    target_price: Decimal,
) -> bool:
    try:
        import requests

        body = _build_whatsapp_message(product_name, product_url, current_price, target_price)
        # Normalise phone: remove non-digits
        phone_clean = "".join(filter(str.isdigit, phone))

        url = (
            f"https://api.z-api.io/instances/{settings.ZAPI_INSTANCE_ID}"
            f"/token/{settings.ZAPI_TOKEN}/send-text"
        )
        headers = {"Client-Token": settings.ZAPI_CLIENT_TOKEN or ""}
        payload = {"phone": phone_clean, "message": body}

        response = requests.post(url, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        logger.info("Z-API WhatsApp sent to %s", phone)
        return True
    except Exception as exc:
        logger.error("Failed to send Z-API WhatsApp to %s: %s", phone, exc)
        return False
