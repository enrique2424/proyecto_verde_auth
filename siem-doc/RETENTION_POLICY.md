# Banco Verde SIEM Retention Policy

## Overview

This policy defines log retention requirements aligned with PCI DSS v4.0, GDPR, and NIST SP 800-53 standards.

## Retention Schedule

| Data Type | Minimum Retention | Hot (SSD) | Warm (HDD) | Cold (Archive) | Destruction |
|-----------|------------------|-----------|------------|----------------|------------|
| Security Logs | 1 year | 30 days | 60 days | 275 days | Secure deletion |
| Audit Logs | 1 year | 30 days | 60 days | 275 days | Secure deletion |
| Alerts | 1 year | 30 days | 60 days | 275 days | Secure deletion |
| Raw Logs | 90 days | 30 days | 60 days | N/A | Overwrite |
| Hash Chain | 3 years | 1 year | 2 years | N/A | Secure deletion |

## Compliance Mapping

### PCI DSS v4.0

| Requirement | Description | Implementation |
|------------|-------------|----------------|
| 10.1 | Audit trails linked to individual user | userId field in all logs |
| 10.2 | Implement automated audit trails | SIEM correlation rules |
| 10.3 | Record audit trail entries | JSON log format with hash |
| 10.4 | Protect audit trail integrity | SHA-256 hash chain |
| 10.5 | Limit audit trail access | Role-based access control |
| 10.6 | Review audit trails regularly | SOC daily review process |
| 10.7 | Retain audit trail history | 1 year minimum, 3 months online |

### GDPR (EU Users)

| Article | Requirement | Implementation |
|---------|-------------|----------------|
| 5(1)(e) | Storage limitation | 1 year retention, then deletion |
| 32 | Security of processing | Hash chain integrity |
| 33 | Breach notification | 72-hour alert SLA |
| 17 | Right to erasure | Anonymization option for EU users |

### NIST SP 800-53

| Control | Description | Implementation |
|---------|-------------|----------------|
| AU-9 | Protection of audit information | Hash chain + WORM storage |
| AU-11 | Audit record retention | 1 year minimum |
| AU-4 | Audit storage capacity | 3x current volume allocated |
| AU-6 | Audit record review | SOC daily procedures |

## Storage Tiers

### Tier 1: Hot Storage (SSD) - 30 days

**Purpose:**
- Active investigation data
- Current security events
- Real-time correlation engine

**Access:**
- SOC analysts (read/write)
- Automated tools (read/write)

### Tier 2: Warm Storage (HDD) - 31-90 days

**Purpose:**
- Historical analysis
- Trend reporting
- Compliance audits

**Access:**
- SOC analysts (read only)
- Compliance team (read only)

### Tier 3: Cold Storage (Archive) - 91-365 days

**Purpose:**
- Regulatory compliance
- Long-term forensics
- Legal hold data

**Access:**
- Security Manager approval required
- Legal team for litigation

## Implementation

### Wazuh Indexer Lifecycle

```yaml
indices:
  banco-verde-iam:
    lifecycle:
      hot:
        min_age: 0s
        actions:
          rollover:
            max_age: 30d
      warm:
        min_age: 30d
        actions:
          shrink:
            enabled: true
          forcemerge:
            enabled: true
      cold:
        min_age: 90d
        actions:
          freeze:
            enabled: true
      delete:
        min_age: 365d
```

### Loki Retention

```yaml
schema_config:
  configs:
    - from: 2026-01-01
      store: boltdb
      object_store: s3
      schema: v11
retention:
  days: 365
```

## Data Integrity

### Hash Chain Verification

| Frequency | Scope | Owner |
|-----------|-------|-------|
| Real-time | Each log entry | SiemLoggerService |
| Daily | Full chain validation | Automated job |
| Weekly | Chain integrity report | SOC |
| Monthly | External audit sampling | Compliance |

### Verification Process

1. Automated daily check compares computed hash vs stored hash
2. Gaps in sequence numbers trigger alert
3. SOC investigates any integrity failures
4. Monthly report submitted to Compliance

## Data Disposal

### Secure Deletion Standards

| Method | Media Type | Standard |
|--------|------------|----------|
| Overwrite (zero + random) | HDD | NIST 800-88 |
| Cryptographic erasure | SSD/NVMe | NIST 800-88 |
| Physical destruction | All | DOD 5220.22 |

### Certificate of Destruction

Each disposal event generates:
- Date and time
- Method used
- Data scope (date range, log types)
- Operator name
- Verification hash

## Review Schedule

| Review | Frequency | Owner |
|--------|-----------|-------|
| Policy review | Quarterly | Security Team |
| Compliance audit | Annual | External Auditor |
| Access review | Monthly | SOC Lead |
| Incident retrospective | Post-incident | Security Manager |

## Approved Exceptions

None. All retention requirements are mandatory.
