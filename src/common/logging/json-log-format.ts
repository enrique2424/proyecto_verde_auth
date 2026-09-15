/**
 * Banco Verde - Standardized JSON Log Format Schema
 *
 * All services MUST emit logs in this format for SIEM ingestion.
 * Based on MITRE ATT&CK logging recommendations.
 */

export const LOG_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['timestamp', 'service', 'action', 'result', 'hash', 'hashAlgorithm'],
  properties: {
    timestamp: {
      type: 'string',
      format: 'date-time',
      description: 'ISO 8601 timestamp with timezone (UTC preferred)',
    },
    service: {
      type: 'string',
      enum: ['api-gateway', 'core-bancario', 'motor-fraude', 'app-movil', 'iam-service'],
      description: 'Source service identifier',
    },
    user: {
      type: 'string',
      description: 'User ID or "anonymous" for unauthenticated requests',
    },
    action: {
      type: 'string',
      description: 'Action performed',
      examples: ['LOGIN', 'LOGOUT', 'PASSWORD_CHANGE', 'TRANSFER', 'FRAUD_CHECK'],
    },
    result: {
      type: 'string',
      enum: ['SUCCESS', 'FAILED', 'BLOCKED', 'PENDING'],
      description: 'Outcome of the action',
    },
    ip: {
      type: 'string',
      description: 'Client IP address',
    },
    device: {
      type: 'object',
      properties: {
        type: { type: 'string', examples: ['mobile', 'desktop', 'tablet'] },
        os: { type: 'string', examples: ['iOS 17.2', 'Android 14', 'Windows 11'] },
        browser: { type: 'string' },
        name: { type: 'string', description: 'Device friendly name' },
        fingerprint: { type: 'string', description: 'Device fingerprint hash' },
      },
    },
    geo: {
      type: 'object',
      properties: {
        country: { type: 'string', examples: ['MX', 'US', 'CO'] },
        city: { type: 'string' },
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        timezone: { type: 'string' },
      },
    },
    metadata: {
      type: 'object',
      description: 'Action-specific additional data',
      properties: {
        reason: { type: 'string', description: 'Failure reason' },
        attempts: { type: 'integer', description: 'Login attempts count' },
        sessionId: { type: 'string' },
        transactionId: { type: 'string' },
        amount: { type: 'number' },
        currency: { type: 'string', examples: ['MXN', 'USD'] },
        riskScore: { type: 'number', minimum: 0, maximum: 100 },
      },
    },
    hash: {
      type: 'string',
      pattern: '^[a-f0-9]{64}$',
      description: 'SHA-256 hash of previous hash + current log entry',
    },
    hashAlgorithm: {
      type: 'string',
      const: 'SHA-256',
      description: 'Hash algorithm identifier',
    },
    previousHash: {
      type: 'string',
      pattern: '^[a-f0-9]{64}$',
      description: 'Hash of previous log entry',
    },
    logSequenceNumber: {
      type: 'integer',
      minimum: 1,
      description: 'Sequential log number within service',
    },
  },
};

export const VALID_SERVICES = LOG_SCHEMA.properties.service.enum as string[];
export const VALID_RESULTS = LOG_SCHEMA.properties.result.enum as string[];

export function validateLogEntry(entry: unknown): { valid: boolean; errors?: string[] } {
  if (!entry || typeof entry !== 'object') {
    return { valid: false, errors: ['Entry must be an object'] };
  }

  const obj = entry as Record<string, unknown>;
  const errors: string[] = [];

  if (!obj.timestamp) errors.push('timestamp is required');
  if (!obj.service) errors.push('service is required');
  if (!obj.action) errors.push('action is required');
  if (!obj.result) errors.push('result is required');
  if (!obj.hash) errors.push('hash is required');
  if (!obj.hashAlgorithm) errors.push('hashAlgorithm is required');

  if (obj.service && !VALID_SERVICES.includes(obj.service as string)) {
    errors.push(`service must be one of: ${VALID_SERVICES.join(', ')}`);
  }

  if (obj.result && !VALID_RESULTS.includes(obj.result as string)) {
    errors.push(`result must be one of: ${VALID_RESULTS.join(', ')}`);
  }

  if (obj.hashAlgorithm && obj.hashAlgorithm !== 'SHA-256') {
    errors.push('hashAlgorithm must be SHA-256');
  }

  return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
}
