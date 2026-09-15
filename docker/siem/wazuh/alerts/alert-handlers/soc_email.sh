#!/bin/bash
# SOC Alert Handler - Email Notification
# Wazuh calls this script when alerts match rules with SOC severity

ALERT_JSON="$1"
SEVERITY=$(echo "$ALERT_JSON" | jq -r '.rule.level // 0')
ALERT_GROUP=$(echo "$ALERT_JSON" | jq -r '.rule.groups[0] // "unknown"')
USER=$(echo "$ALERT_JSON" | jq -r '.data.user // "unknown"')
ACTION=$(echo "$ALERT_JSON" | jq -r '.data.action // "unknown"')
IP=$(echo "$ALERT_JSON" | jq -r '.data.ip // "unknown"')
RESULT=$(echo "$ALERT_JSON" | jq -r '.data.result // "unknown"')
TIMESTAMP=$(echo "$ALERT_JSON" | jq -r '.timestamp // "unknown"')
MITRE_TACTICS=$(echo "$ALERT_JSON" | jq -r '.rule.mitre | join(",") // "none"')
ALERT_ID=$(echo "$ALERT_JSON" | jq -r '.id // "unknown"')
RULE_ID=$(echo "$ALERT_JSON" | jq -r '.rule.id // "unknown"')

# SOC Email Configuration
SOC_EMAIL="soc@bancoverde.com"
FROM_EMAIL="siem@bancoverde.com"
EMAIL_SUBJECT="[SEV-${SEVERITY}] Banco Verde Security Alert - ${ACTION}"

# Build email body
EMAIL_BODY=$(cat <<EOF
BANCO VERDE SECURITY ALERT
===========================
Severity: ${SEVERITY}/15
Time: ${TIMESTAMP}
Action: ${ACTION}
Result: ${RESULT}
User: ${USER}
IP: ${IP}
MITRE ATT&CK: ${MITRE_TACTICS}
Alert Group: ${ALERT_GROUP}
Alert ID: ${ALERT_ID}
Rule ID: ${RULE_ID}

Full Alert Data:
$(echo "$ALERT_JSON" | jq '.')

---
This is an automated alert from the Banco Verde SIEM.
Do not reply to this email.
EOF
)

# Log the alert
logger -t wazuh-soc-alert -p local0.info "Alert ${ALERT_ID} (severity ${SEVERITY}): ${ACTION} by ${USER} from ${IP}"

# Send email only for HIGH/CRITICAL alerts (severity >= 10)
if [ "$SEVERITY" -ge 10 ]; then
    echo "$EMAIL_BODY" | mail -s "$EMAIL_SUBJECT" -r "$FROM_EMAIL" "$SOC_EMAIL"
    logger -t wazuh-soc-alert -p local0.info "SOC notification sent for alert ${ALERT_ID}"
fi

exit 0
