# Banco Verde SIEM Architecture

## Overview

The Banco Verde SIEM (Security Information and Event Management) system provides centralized logging, threat detection, and incident response capabilities across all ecosystem components.

## Architecture Diagram

```
+--------------------------------------------------------------------------------------------+
|                              BANCO VERDE SIEM ARCHITECTURE                                  |
+--------------------------------------------------------------------------------------------+

    +------------------+     +------------------+     +------------------+     +------------------+
    |   API Gateway    |     |  Core Bancario   |     |   Motor Fraude   |     |   App Movil +    |
    |   (Service 1)    |     |   (Service 2)    |     |   (Service 3)    |     |   IAM Service    |
    +--------+---------+     +--------+---------+     +--------+---------+     +--------+---------+
             |                        |                        |                        |
             |  JSON Logs (SHA-256)   |  JSON Logs (SHA-256)   |  JSON Logs (SHA-256)   |  JSON Logs (SHA-256)
             |  + Hash Signature      |  + Hash Signature      |  + Hash Signature      |  + Hash Signature
             v                        v                        v                        v
    +--------------------------------------------------------------------------------------+
    |                           LOG SHIPPING LAYER                                          |
    |  +------------------+  +------------------+  +------------------+  +------------------+
    |  |   Filebeat 1    |  |   Filebeat 2    |  |   Filebeat 3    |  |   Filebeat 4    |
    |  | (per service)   |  | (per service)   |  | (per service)   |  | (per service)   |
    +--------+--------+  +--------+--------+  +--------+--------+  +--------+--------+
              |                   |                   |                   |
              +-------------------+-------------------+-------------------+
                                      |
                                      v
                         +---------------------+
                         |  Wazuh Indexer     |
                         | (Elasticsearch)     |
                         +----------+----------+
                                    |
                         +----------+----------+
                         |  Wazuh Server      |
                         | (Analysis, Rules,  |
                         |  Correlation, API) |
                         +----------+----------+
                                    |
           +------------------------+------------------------+
           |                                                 |
           v                                                 v
  +------------------+                            +------------------+
  |  SOC (Agent 0/6) |                            |   Wazuh Dashboard|
  |  Real-time alerts|                            |   (Kibana-based) |
  +--------+---------+                            +------------------+
           |
           v
  +------------------+
  |  Alert Manager   |
  |  (SOC Routing)   |
  +--------+---------+
           |
           +--> Push Notifications (FCM) --> End Users
           +--> Email/SMS --> SOC Team
           +--> Slack/Teams --> SOC Channel

+------------------------------------------------------------------------------+
|                        EXISTING MONITORING STACK                             |
|  +------------------+  +------------------+  +------------------+           |
|  |     Loki        |  |    Promtail      |  |    Grafana       |           |
|  |  (Log Storage)   |  |  (Log Scraper)   |  | (Dashboards)     |           |
|  +------------------+  +------------------+  +------------------+           |
+------------------------------------------------------------------------------+
```

## Components

### 1. Log Sources

| Service | Type | Log Format | Hash Signing |
|---------|------|------------|--------------|
| API Gateway | Docker | JSON | SHA-256 |
| Core Bancario | Docker | JSON | SHA-256 |
| Motor Fraude | Docker | JSON | SHA-256 |
| App Móvil | Docker | JSON | SHA-256 |
| IAM Service | NestJS | JSON | SHA-256 |

### 2. Log Shipping Layer

- **Filebeat**: Reads JSON logs from each service, enriches with host metadata
- **TLS Encryption**: All log traffic encrypted in transit
- **Buffering**: 5-second flush interval

### 3. Wazuh SIEM Stack

| Component | Purpose | Port |
|-----------|---------|------|
| Wazuh Indexer | Log storage and indexing (Elasticsearch-based) | 9200, 9600 |
| Wazuh Server | Analysis engine, correlation rules, API | 1514, 1515, 514 |
| Wazuh Dashboard | Kibana-based visualization | 5601 |

### 4. Alert Routing

| Channel | Target | Trigger |
|---------|--------|---------|
| Email | soc@bancoverde.com | Severity >= 10 |
| FCM Push | End user mobile app | User-affecting events |
| Slack/Teams | SOC channel | All security alerts |

## Data Flow

1. **Log Generation**: Services emit JSON logs with SHA-256 hash chain
2. **Log Shipping**: Filebeat reads logs and forwards to Wazuh Indexer
3. **Indexing**: Wazuh Indexer stores logs with full-text search
4. **Correlation**: Wazuh Server applies MITRE ATT&CK rules
5. **Alert Generation**: Matching rules trigger alerts
6. **Alert Routing**: Alerts sent to SOC and end users

## Network Ports

| Port | Service | Purpose |
|------|---------|---------|
| 9200 | Wazuh Indexer | Elasticsearch API |
| 9600 | Wazuh Indexer | Indexer cluster |
| 1514 | Wazuh Server | Agent communication |
| 1515 | Wazuh Server | Wazuh API |
| 514 | Wazuh Server | Syslog |
| 5601 | Wazuh Dashboard | Web UI |
| 3100 | Loki | Existing log storage |

## Security Considerations

- All inter-component communication uses TLS
- Wazuh Indexer authentication required
- Filebeat uses certificate-based auth
- Log integrity maintained via hash chain
- SOC credentials rotated quarterly
