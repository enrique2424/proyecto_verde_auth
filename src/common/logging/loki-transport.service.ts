import * as winston from 'winston';
import * as http from 'http';

const LOKI_HOST = process.env.LOKI_HOST || 'localhost';
const LOKI_PORT = parseInt(process.env.LOKI_PORT || '3100', 10);
const LOKI_PATH = '/loki/api/v1/push';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  userId?: string;
  userEmail?: string;
  action?: string;
  eventType?: string;
  ip?: string;
  deviceName?: string;
  success?: string;
  sessionId?: string;
}

const logBuffer: LogEntry[] = [];
let flushTimer: NodeJS.Timeout | null = null;

function startFlushTimer() {
  if (flushTimer) return;
  flushTimer = setInterval(flushLogs, 5000);
}

function sanitizeLabel(value: string): string {
  // Loki labels must be alphanumeric with underscores, no spaces or special chars
  return value.replace(/[^a-zA-Z0-9_.-]/g, '_').substring(0, 128);
}

function flushLogs() {
  if (logBuffer.length === 0) return;

  const logsToSend = [...logBuffer];
  logBuffer.length = 0;

  const streams = logsToSend.map((entry) => {
    const labels: Record<string, string> = {
      service: 'banco-verde-iam',
      env: sanitizeLabel(process.env.NODE_ENV || 'development'),
      level: entry.level,
    };

    if (entry.userId) labels.userId = sanitizeLabel(entry.userId);
    if (entry.userEmail) labels.userEmail = sanitizeLabel(entry.userEmail);
    if (entry.eventType) labels.eventType = sanitizeLabel(entry.eventType);
    if (entry.action) labels.action = sanitizeLabel(entry.action);
    if (entry.ip) labels.ip = sanitizeLabel(entry.ip);
    if (entry.deviceName) labels.deviceName = sanitizeLabel(entry.deviceName);
    if (entry.success) labels.success = entry.success;
    if (entry.sessionId) labels.sessionId = sanitizeLabel(entry.sessionId);

    return {
      stream: labels,
      values: [[nanoTime(entry.timestamp), entry.message]] as [string, string][],
    };
  });

  const payload = JSON.stringify({ streams });

  const options: http.RequestOptions = {
    hostname: LOKI_HOST,
    port: LOKI_PORT,
    path: LOKI_PATH,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
    timeout: 5000,
  };

  const req = http.request(options, (res) => {
    if (res.statusCode !== 204 && res.statusCode !== 200) {
      console.error(`Loki: Failed to send logs, status ${res.statusCode}`);
    }
  });

  req.on('error', (error) => {
    console.error(`Loki: Error sending logs - ${error.message}`);
  });

  req.write(payload);
  req.end();
}

function nanoTime(timestamp: string): string {
  const date = new Date(timestamp);
  const nanos = date.getTime() * 1_000_000;
  return String(nanos);
}

function extractLogData(info: winston.Logform.TransformableInfo): LogEntry {
  return {
    timestamp: (info.timestamp as string) || new Date().toISOString(),
    level: info.level || 'info',
    message: (info.message as string) || JSON.stringify(info),
    userId: info.userId as string | undefined,
    userEmail: info.userEmail as string | undefined,
    action: info.action as string | undefined,
    eventType: info.eventType as string | undefined,
    ip: info.ip as string | undefined,
    deviceName: info.deviceName as string | undefined,
    success: info.success as string | undefined,
    sessionId: info.sessionId as string | undefined,
  };
}

// Custom format that sends to Loki
const lokiFormat = winston.format((info) => {
  startFlushTimer();
  logBuffer.push(extractLogData(info));
  return info;
});

export function createLokiLogger() {
  return winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      lokiFormat(),
      winston.format.json(),
    ),
    defaultMeta: { service: 'banco-verde-iam' },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
        ),
      }),
    ],
  });
}

export function closeLokiLogger() {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  flushLogs();
}
