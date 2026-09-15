# Banco Verde Incident Response Playbook

## Incident Classification

### Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| CRITICAL | Active breach, data exfiltration | Immediate | Impossible travel + successful login, Log integrity violation |
| HIGH | Confirmed attack, no data loss | < 15 min | Brute force attack, MFA disabled |
| MEDIUM | Suspected attack, investigation needed | < 1 hour | Multiple failed logins, unusual hours access |
| LOW | Anomaly, possible false positive | < 4 hours | New device login, password change |

### MITRE ATT&CK Categories

| Tactic | Techniques | Alert Severity |
|--------|-----------|----------------|
| Initial Access | T1078 (Valid Accounts) | CRITICAL/HIGH |
| Credential Access | T1110 (Brute Force) | HIGH/CRITICAL |
| Persistence | T1136 (Create Account) | HIGH |
| Defense Evasion | T1070 (Indicator Removal) | CRITICAL |
| Impact | T1486 (Data Encrypted) | CRITICAL |

## Response Procedures

### 1. Brute Force Attack (T1110)

**Trigger:** Rule 100001, 100002 triggered

**Steps:**
1. SOC receives alert (email + Slack)
2. Verify alert legitimacy (check IP reputation)
3. If same user, multiple IPs:
   - Auto-lock account via IAM API
   - Send FCM notification to user
4. Check for successful login after attack
5. If compromised:
   - Force password reset
   - Revoke all sessions
   - Initiate forensic collection
6. Document in incident tracker
7. Post-incident: Review account lockout policy

### 2. Impossible Travel (T1078)

**Trigger:** Rule 100010, 100011 triggered

**Steps:**
1. SOC receives CRITICAL alert immediately
2. Auto-lock affected account (configurable)
3. Verify with user via secondary channel (phone)
4. If confirmed unauthorized:
   - Force password reset
   - Enable enhanced monitoring
   - Collect forensics
   - File SAR if required
5. If confirmed authorized:
   - Document exception
   - Update geo-risk model

### 3. Log Integrity Violation (T1070)

**Trigger:** Rule 100101 triggered

**Steps:**
1. SOC receives CRITICAL alert immediately
2. Do NOT attempt to "fix" logs - this could destroy evidence
3. Isolate affected systems (if attacker has access)
4. Preserve current log state for forensic analysis
5. Determine timeline of compromise
6. Check for other indicators of attacker presence
7. Engage external forensics team
8. Report to regulatory if data breach confirmed

### 4. After-Hours Config Change (T1078, T1484)

**Trigger:** Rule 100020 triggered

**Steps:**
1. SOC receives HIGH alert
2. Verify change was authorized:
   - Check change management ticket
   - Contact responsible team
3. If unauthorized:
   - Roll back change if possible
   - Investigate access method
   - Review privileged access
4. Document in compliance tracker

### 5. MFA Disabled (T1556)

**Trigger:** Rule 100021 triggered

**Steps:**
1. SOC receives HIGH alert
2. Verify with user via phone/alternate channel
3. If unauthorized:
   - Re-enable MFA immediately
   - Force re-registration of MFA device
   - Check for other account changes
4. If user initiated (legitimate):
   - Document reason
   - Ensure user re-enrolled

## Escalation Matrix

| Severity | Primary | Secondary | Executive |
|----------|---------|-----------|-----------|
| CRITICAL | SOC Agent | Security Lead | CISO (15 min) |
| HIGH | SOC Agent | Security Lead | CISO (1 hour) |
| MEDIUM | SOC Agent | Security Lead | - |
| LOW | SOC Agent | - | - |

## Communication Channels

| Channel | Use Case | Response Time |
|---------|----------|---------------|
| Email | Non-critical alerts | < 4 hours |
| Slack #security-alerts | Real-time alerts | < 5 min |
| PagerDuty | CRITICAL only | < 2 min |
| Phone (on-call) | CRITICAL (after 2 alerts) | < 10 min |

## Forensic Collection

When incident is confirmed:

### 1. Log Collection

```bash
# Collect SIEM logs for timeframe
wazuh-logtool -a start_time="2026-09-14T00:00:00Z" \
  end_time="2026-09-14T23:59:59Z" \
  output=/forensics/logs-$(date +%Y%m%d).json

# Verify hash chain
curl -X POST http://iam-service:3000/admin/logs/verify-integrity
```

### 2. Memory Collection (if applicable)

```bash
# On affected host
dd if=/dev/mem of=/forensics/memory-$(date +%Y%m%d).img
```

### 3. Disk Image (if applicable)

```bash
# Create forensic image
dd if=/dev/sda of=/forensics/disk-$(date +%Y%m%d).img conv=sync,noerror
```

## Post-Incident Activities

### 24 Hours
- [ ] Complete incident report
- [ ] Notify affected users
- [ ] File regulatory reports if required

### 7 Days
- [ ] Conduct root cause analysis
- [ ] Update detection rules if needed
- [ ] Implement preventive controls

### 30 Days
- [ ] Complete lessons learned session
- [ ] Update incident response plan
- [ ] Schedule follow-up audit

## Contact Information

| Role | Name | Contact |
|------|------|---------|
| SOC Lead | TBD | soc-lead@bancoverde.com |
| Security Manager | TBD | security-mgr@bancoverde.com |
| CISO | TBD | ciso@bancoverde.com |
| External Forensics | TBD | external-forensics@partner.com |
| Legal | TBD | legal@bancoverde.com |

## Regulatory Notification

| Regulation | Trigger | Deadline | Authority |
|------------|---------|----------|-----------|
| PCI DSS | Compromise of cardholder data | 24 hours | Card brands |
| GDPR | Breach affecting EU residents | 72 hours | DPA |
| LGPD | Breach affecting Brazilian users | 72 hours | ANPD |
| SUGEF | Suspicious transactions | 24 hours | SUGEF |
