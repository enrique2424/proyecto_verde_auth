#!/usr/bin/env python3
"""
FCM Push Notification Handler for Wazuh Alerts
Sends push notifications to affected users via Firebase Cloud Messaging
"""

import json
import sys
import os
import logging
from datetime import datetime
from typing import Optional

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('wazuh-fcm-push')

ALERT_SEVERITY_THRESHOLD = 7

NOTIFICATION_CONFIG = {
    "brute_force": {
        "title": "Intento de acceso sospechoso",
        "body": "Se detectaron multiples intentos de inicio de sesion fallidos en tu cuenta.",
        "priority": "high",
        "type": "security_alert"
    },
    "impossible_travel": {
        "title": "Acceso desde ubicacion inusual",
        "body": "Se detecto un inicio de sesion desde una ubicacion geografica inusual.",
        "priority": "high",
        "type": "security_alert"
    },
    "account_lockout": {
        "title": "Cuenta bloqueada",
        "body": "Tu cuenta ha sido bloqueada temporalmente. Contacta a soporte si no fuiste tu.",
        "priority": "high",
        "type": "security_alert"
    },
    "account_compromised": {
        "title": "Actividad sospechosa detectada",
        "body": "Se detecto actividad sospechosa en tu cuenta. Revisa tu actividad reciente.",
        "priority": "high",
        "type": "security_alert"
    },
    "new_device": {
        "title": "Nuevo dispositivo detectado",
        "body": "Se detecto un inicio de sesion desde un nuevo dispositivo.",
        "priority": "normal",
        "type": "security_info"
    },
    "password_change": {
        "title": "Contrasena modificada",
        "body": "Tu contrasena fue modificada exitosamente.",
        "priority": "normal",
        "type": "security_info"
    },
    "mfa_disabled": {
        "title": "MFA deshabilitado",
        "body": "La autenticacion de dos factores fue deshabilitada en tu cuenta.",
        "priority": "high",
        "type": "security_alert"
    },
    "config_change": {
        "title": "Cambio de configuracion",
        "body": "Se realizo un cambio critico en la configuracion de tu cuenta.",
        "priority": "high",
        "type": "security_alert"
    }
}


def get_notification_type(alert_json: dict) -> Optional[str]:
    """Map alert groups to notification types"""
    groups = alert_json.get("rule", {}).get("groups", [])

    for group in groups:
        if "brute_force" in group:
            return "brute_force"
        if "impossible_travel" in group:
            return "impossible_travel"
        if "account_lockout" in group:
            return "account_lockout"
        if "account_compromised" in group:
            return "account_compromised"
        if "new_device" in group:
            return "new_device"
        if "password_change" in group:
            return "password_change"
        if "mfa_disabled" in group:
            return "mfa_disabled"
        if "config_change" in group:
            return "config_change"

    return None


def get_user_fcm_token(user_id: str) -> Optional[str]:
    """
    Retrieve FCM token for user from database/API
    In production, this would query the user database or session store
    """
    return os.environ.get(f"FCM_TOKEN_{user_id}")


def send_fcm_notification(fcm_token: str, notification: dict, data: dict) -> bool:
    """Send FCM push notification to user device"""
    try:
        message = {
            "token": fcm_token,
            "notification": {
                "title": notification["title"],
                "body": notification["body"]
            },
            "data": {
                "type": notification.get("type", "security_alert"),
                "alertId": data.get("alertId", ""),
                "timestamp": data.get("timestamp", ""),
                "severity": str(data.get("severity", 0)),
                "user": data.get("user", ""),
                "ip": data.get("ip", "unknown"),
                "action": data.get("action", "")
            },
            "android": {
                "priority": notification.get("priority", "normal"),
                "notification": {
                    "channel_id": "security_alerts"
                }
            },
            "apns": {
                "payload": {
                    "aps": {
                        "badge": 1,
                        "sound": "default"
                    }
                }
            }
        }

        logger.info(f"FCM notification prepared: {notification['title']}")
        logger.debug(f"FCM message: {json.dumps(message, indent=2)}")

        # In production, this would call Firebase Admin SDK:
        # response = messaging.send(message)
        # logger.info(f"FCM sent successfully: {response}")

        return True

    except Exception as e:
        logger.error(f"Error sending FCM notification: {e}")
        return False


def main():
    if len(sys.argv) < 2:
        logger.error("Usage: fcm_push.py <alert_json_file>")
        sys.exit(1)

    alert_file = sys.argv[1]

    try:
        with open(alert_file, 'r') as f:
            alert_json = json.load(f)
    except Exception as e:
        logger.error(f"Error reading alert file: {e}")
        sys.exit(1)

    severity = alert_json.get("rule", {}).get("level", 0)
    if severity < ALERT_SEVERITY_THRESHOLD:
        logger.info(f"Alert severity {severity} below threshold ({ALERT_SEVERITY_THRESHOLD}), skipping")
        sys.exit(0)

    user = alert_json.get("data", {}).get("user", "unknown")
    if not user or user == "unknown" or user == "anonymous":
        logger.info("No valid user associated with alert, skipping FCM notification")
        sys.exit(0)

    notification_type = get_notification_type(alert_json)
    if not notification_type:
        logger.info("Alert type not mapped to notification, skipping")
        sys.exit(0)

    notification_config = NOTIFICATION_CONFIG.get(notification_type, NOTIFICATION_CONFIG["password_change"])

    fcm_token = get_user_fcm_token(user)
    if not fcm_token:
        logger.warning(f"No FCM token found for user {user}")
        # Log for manual follow-up instead of failing
        logger.info(f"Undelivered notification for user {user}: {notification_config['title']}")
        sys.exit(0)

    data = {
        "alertId": alert_json.get("id", ""),
        "timestamp": alert_json.get("timestamp", datetime.utcnow().isoformat()),
        "severity": severity,
        "user": user,
        "ip": alert_json.get("data", {}).get("ip", "unknown"),
        "action": alert_json.get("data", {}).get("action", "unknown")
    }

    success = send_fcm_notification(fcm_token, notification_config, data)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
