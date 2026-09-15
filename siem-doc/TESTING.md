# SIEM Testing Scenarios

## Prerequisites

1. SIEM infrastructure deployed and healthy
2. IAM service running with SiemLoggerService
3. Test user accounts configured
4. SOC alert channels verified (email, FCM)

## Test Environment

- **IAM URL**: http://localhost:3000
- **Wazuh Dashboard**: https://localhost:443
- **Loki**: http://localhost:3100
- **Grafana**: http://localhost:3001

---

## Scenario 1: Brute Force Attack Detection

**Rule Tested**: 100001, 100002 (MITRE T1110)

**Objective**: Verify detection of multiple failed login attempts from different IPs

### Test Script

```bash
#!/bin/bash
set -e

IAM_URL="${IAM_URL:-http://localhost:3000}"
TARGET_USER="test-brute-force@bancoverde.com"
BASE_IP="192.168.1."

echo "=== Testing Brute Force Attack Detection ==="
echo "Target: $TARGET_USER"
echo ""

# Simulate 10 failed login attempts from different IPs
for i in {1..10}; do
  IP="${BASE_IP}$((100 + i))"
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$IAM_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TARGET_USER\",\"password\":\"WrongPassword$i\"}" \
    -H "X-Forwarded-For: $IP" \
    -H "X-Device-Fingerprint: test-device-$i")

  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  echo "[$i/10] Login attempt from IP $IP - HTTP $HTTP_CODE"

  sleep 1
done

echo ""
echo "Waiting 30 seconds for SIEM processing..."
sleep 30

echo ""
echo "=== VERIFICATION ==="
echo "Check Wazuh Dashboard: Security Events > brute_force"
echo "Expected: Alert with severity 10-12"
echo ""
echo "Check SOC email (if severity >= 10):"
echo "  soc@bancoverde.com should receive alert"
echo ""
echo "Check FCM notification:"
echo "  User should receive push notification"
```

### Expected Results

| Check | Expected | Actual | Pass/Fail |
|-------|----------|--------|-----------|
| Wazuh Rule 100001 triggered | Yes | | |
| Wazuh Rule 100002 triggered | Yes | | |
| SOC email received | Yes | | |
| FCM notification sent | Yes | | |
| Alert severity | 10-12 | | |
| Detection time | < 60 sec | | |

### Success Criteria

- [ ] Wazuh Dashboard shows brute_force alerts
- [ ] Alert severity is 10 or higher
- [ ] SOC received email notification
- [ ] User received push notification

---

## Scenario 2: Impossible Travel Detection

**Rule Tested**: 100010, 100011 (MITRE T1078)

**Objective**: Verify detection of login from geographically incompatible locations

### Test Script

```bash
#!/bin/bash
set -e

IAM_URL="${IAM_URL:-http://localhost:3000}"
TARGET_USER="test-impossible-travel@bancoverde.com"
VALID_PASSWORD="TestPassword123!"

echo "=== Testing Impossible Travel Detection ==="
echo "Target: $TARGET_USER"
echo ""

# Login from Mexico City
echo "[1/2] Login from Mexico City (lat=19.4326, lon=-99.1332)"
curl -s -X POST "$IAM_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TARGET_USER\",\"password\":\"$VALID_PASSWORD\"}" \
  -H "X-Forwarded-For: 189.203.456.123" \
  -H "X-Device-Fingerprint: device-mexico-001" \
  -H "X-Geo-Lat: 19.4326" \
  -H "X-Geo-Lon: -99.1332"
echo " -> Mexico City login submitted"

sleep 5

# Login from Tokyo (impossible in 5 minutes)
echo "[2/2] Login from Tokyo (lat=35.6762, lon=139.6503)"
echo "      Distance: ~11,000 km, Travel time impossible: < 1 hour"
curl -s -X POST "$IAM_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TARGET_USER\",\"password\":\"$VALID_PASSWORD\"}" \
  -H "X-Forwarded-For: 203.141.789.012" \
  -H "X-Device-Fingerprint: device-tokyo-002" \
  -H "X-Geo-Lat: 35.6762" \
  -H "X-Geo-Lon: 139.6503"
echo " -> Tokyo login submitted"

echo ""
echo "Waiting 60 seconds for SIEM processing..."
sleep 60

echo ""
echo "=== VERIFICATION ==="
echo "Check Wazuh Dashboard: Security Events > impossible_travel"
echo "Expected: CRITICAL alert (severity 14)"
echo ""
echo "Check if account was auto-locked (if configured):"
echo "  User cannot login for 15 minutes"
```

### Expected Results

| Check | Expected | Actual | Pass/Fail |
|-------|----------|--------|-----------|
| Wazuh Rule 100010 triggered | Yes | | |
| Wazuh Rule 100011 triggered | Yes | | |
| SOC email received (CRITICAL) | Yes | | |
| FCM notification sent | Yes | | |
| Account auto-locked | Yes | | |
| Alert severity | 14 | | |

### Success Criteria

- [ ] Wazuh Dashboard shows impossible_travel CRITICAL alert
- [ ] SOC received immediate notification
- [ ] User received push notification
- [ ] Account was automatically locked (if configured)

---

## Scenario 3: After-Hours Config Change Detection

**Rule Tested**: 100020 (MITRE T1078, T1484)

**Objective**: Verify detection of configuration changes outside business hours

### Prerequisites

- Test must be run between 00:00 - 06:00 local time
- OR rule time window temporarily modified for testing

### Test Script

```bash
#!/bin/bash
set -e

IAM_URL="${IAM_URL:-http://localhost:3000}"
ADMIN_TOKEN="your-admin-token"

echo "=== Testing After-Hours Config Change Detection ==="
echo "Current time: $(date '+%H:%M:%S')"
echo ""

# Test MFA disable
echo "[1/3] Disabling MFA for test user..."
curl -s -X POST "$IAM_URL/admin/config/mfa" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Forwarded-For: 192.168.1.50" \
  -d '{"action":"DISABLE","userId":"test-user-id"}'
echo " -> MFA disable request submitted"

sleep 2

# Test security policy change
echo "[2/3] Modifying security policy..."
curl -s -X PUT "$IAM_URL/admin/security/policy" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Forwarded-For: 192.168.1.50" \
  -d '{"maxFailedAttempts":100,"lockoutDuration":1}'
echo " -> Security policy change submitted"

sleep 2

# Test API key rotation
echo "[3/3] Rotating API key..."
curl -s -X POST "$IAM_URL/admin/api-keys/rotate" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Forwarded-For: 192.168.1.50"
echo " -> API key rotation submitted"

echo ""
echo "Waiting 30 seconds for SIEM processing..."
sleep 30

echo ""
echo "=== VERIFICATION ==="
echo "Check Wazuh Dashboard: Security Events > config_change"
echo "Expected: HIGH alert (severity 12)"
```

### Expected Results

| Check | Expected | Actual | Pass/Fail |
|-------|----------|--------|-----------|
| Wazuh Rule 100020 triggered | Yes | | |
| Wazuh Rule 100021 triggered (MFA) | Yes | | |
| SOC email received | Yes | | |
| Alert severity | 12 | | |

### Success Criteria

- [ ] Wazuh Dashboard shows config_change alerts
- [ ] Alert severity is 12 or higher
- [ ] SOC received notification
- [ ] MITRE ATT&CK mapping correct (T1078, T1484)

---

## Scenario 4: Log Integrity Verification

**Rule Tested**: 100101 (MITRE T1070)

**Objective**: Verify detection of log tampering

### Test Script

```bash
#!/bin/bash
set -e

IAM_URL="${IAM_URL:-http://localhost:3000}"
LOG_DIR="${LOG_DIR:-/var/log/banco-verde}"

echo "=== Testing Log Integrity Verification ==="
echo ""

# Step 1: Generate baseline logs
echo "[1/4] Generating baseline logs..."
for i in {1..5}; do
  curl -s -X POST "$IAM_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"test-integrity@bancoverde.com\",\"password\":\"Test123\"}" \
    -H "X-Forwarded-For: 192.168.1.$i"
done
echo " -> 5 log entries generated"

# Step 2: Verify chain integrity (should pass)
echo ""
echo "[2/4] Verifying hash chain integrity (expect: valid)..."
VERIFY_RESPONSE=$(curl -s -X POST "$IAM_URL/admin/logs/verify-integrity" \
  -H "Authorization: Bearer admin-token" \
  -d '{"startSequence":1,"endSequence":5}')
echo "Response: $VERIFY_RESPONSE"

if echo "$VERIFY_RESPONSE" | grep -q '"valid":true'; then
  echo " -> Integrity check PASSED"
else
  echo " -> Integrity check FAILED"
fi

# Step 3: Tamper with log (DANGEROUS - test only)
echo ""
echo "[3/4] WARNING: About to tamper with log file..."
echo "       This is for TESTING ONLY"
read -p "Continue? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Skipped tampering test"
  exit 0
fi

# Create tampered log entry
TAMPERED_ENTRY='{"timestamp":"2026-09-14T10:00:00Z","service":"iam-service","user":"hacker","action":"LOGIN","result":"SUCCESS","ip":"1.2.3.4","hash":"tampered","hashAlgorithm":"SHA-256","logSequenceNumber":999}'
echo "$TAMPERED_ENTRY" >> "$LOG_DIR/banco-verde-$(date +%Y-%m-%d).jsonl"
echo " -> Tampered log entry appended"

# Step 4: Verify chain integrity (should fail)
echo ""
echo "[4/4] Verifying hash chain integrity after tampering (expect: invalid)..."
VERIFY_RESPONSE=$(curl -s -X POST "$IAM_URL/admin/logs/verify-integrity" \
  -H "Authorization: Bearer admin-token" \
  -d '{"startSequence":1,"endSequence":6}')
echo "Response: $VERIFY_RESPONSE"

if echo "$VERIFY_RESPONSE" | grep -q '"valid":false'; then
  echo " -> Integrity violation DETECTED correctly"
else
  echo " -> Integrity violation NOT detected (FAIL)"
fi

echo ""
echo "=== VERIFICATION ==="
echo "Check Wazuh Dashboard: Security Events > log_integrity_violation"
echo "Expected: CRITICAL alert (severity 14)"
```

### Expected Results

| Check | Expected | Actual | Pass/Fail |
|-------|----------|--------|-----------|
| Initial integrity check | valid: true | | |
| Tampered log detection | valid: false | | |
| Wazuh Rule 100101 triggered | Yes | | |
| SOC CRITICAL alert | Yes | | |
| Detection time | < 60 sec | | |

### Success Criteria

- [ ] Initial integrity verification passes
- [ ] Tampering detected immediately
- [ ] Wazuh shows log_integrity_violation CRITICAL alert
- [ ] SOC received immediate notification

---

## Scenario 5: End-to-End Alert Flow

**Objective**: Verify complete alert flow from detection to user notification

### Test Script

```bash
#!/bin/bash
set -e

echo "=== Testing End-to-End Alert Flow ==="
echo ""

echo "[1/4] Triggering test alert (brute force)..."
# (Use test from Scenario 1)

echo "[2/4] Waiting for Wazuh to process..."
sleep 30

echo "[3/4] Checking SOC notification..."
echo "  - Email sent to soc@bancoverde.com"
echo "  - Slack message in #security-alerts"

echo "[4/4] Checking user notification..."
echo "  - FCM push to user device"
echo "  - In-app notification"

echo ""
echo "=== VERIFICATION CHECKLIST ==="
echo ""
echo "SOC Email:"
echo "  [ ] Received at soc@bancoverde.com"
echo "  [ ] Contains alert details (user, IP, action)"
echo "  [ ] MITRE ATT&CK mapping included"
echo "  [ ] Severity level correct"
echo ""
echo "User Push Notification:"
echo "  [ ] Received on mobile device"
echo "  [ ] Title: Security Alert"
echo "  [ ] Body describes the event"
echo ""
echo "Wazuh Dashboard:"
echo "  [ ] Alert visible in Security Events"
echo "  [ ] Correlation shows attack chain"
echo "  [ ] MITRE ATT&CK mapping displayed"
```

### Success Criteria

- [ ] SOC receives email within 1 minute of detection
- [ ] User receives FCM notification within 2 minutes
- [ ] Wazuh Dashboard shows complete attack chain
- [ ] All data correctly formatted (JSON schema compliant)

---

## Performance Testing

### Alert Latency

| Scenario | Target | Measurement |
|----------|--------|-------------|
| Brute force detection | < 60 sec | Log timestamp to alert generated |
| Impossible travel | < 60 sec | Second login to alert generated |
| Log integrity violation | < 60 sec | Tampering to alert generated |
| SOC email delivery | < 60 sec | Alert generated to email sent |
| FCM delivery | < 120 sec | Alert generated to notification received |

### Throughput

| Metric | Target | Test Method |
|--------|--------|-------------|
| Logs/sec (per service) | 1000 | Load test with 1000 concurrent logins |
| Elasticsearch indexing | 5000 docs/sec | Bulk insert test |
| Alert processing | 1000 alerts/sec | Flood of test alerts |

---

## Cleanup

After all tests complete:

```bash
#!/bin/bash

# Remove test users
curl -X DELETE "http://localhost:3000/admin/test-users"

# Clear test logs
rm -f /var/log/banco-verde/banco-verde-test-*.jsonl

# Reset Wazuh test alerts (optional)
# wazuh-logtool -p /var/ossec/logs/alerts/alerts.json

echo "Test cleanup complete"
```
