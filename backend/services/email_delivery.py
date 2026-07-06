"""Email delivery — SMTP when configured; logs in dev."""

from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

from config import settings

logger = logging.getLogger(__name__)


def send_password_reset_email(to_email: str, reset_url: str) -> None:
    subject = "Reset your MotiveFX.AI password"
    body = (
        f"Reset your password using this link (expires in {settings.password_reset_expire_minutes} minutes):\n\n"
        f"{reset_url}\n\n"
        "If you did not request this, ignore this email."
    )
    if not settings.smtp_host:
        logger.info("Password reset link for %s: %s", to_email, reset_url)
        return
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from_email
    msg["To"] = to_email
    msg.set_content(body)
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        server.starttls()
        if settings.smtp_user:
            server.login(settings.smtp_user, settings.smtp_password)
        server.send_message(msg)
