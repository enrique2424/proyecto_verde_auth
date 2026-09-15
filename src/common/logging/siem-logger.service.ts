import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface DeviceInfo {
  type?: string;
  os?: string;
  browser?: string;
  name?: string;
  fingerprint?: string;
}

export interface GeoInfo {
  country?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

export interface StandardLogFormat {
  timestamp?: string;
  service: string;
  user: string;
  action: string;
  result: string;
  ip: string;
  device?: DeviceInfo;
  geo?: GeoInfo;
  metadata?: Record<string, unknown>;
}

export interface LogEntry extends StandardLogFormat {
  hash: string;
  hashAlgorithm: string;
  previousHash: string;
  logSequenceNumber: number;
}

@Injectable()
export class SiemLoggerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SiemLoggerService.name);
  private lastHash = 'GENESIS';
  private sequenceNumber = 0;
  private logDir: string;
  private currentLogFile: string;
  private writeStream: fs.WriteStream;
  private hashCache = new Map<number, string>();
  private readonly GENESIS_HASH = 'GENESIS';

  constructor() {
    this.logDir = process.env.SIEM_LOG_DIR || '/var/log/banco-verde';
    this.ensureLogDirectory();
  }

  async onModuleInit(): Promise<void> {
    this.initializeFromLastLog();
    this.logger.log(`SiemLoggerService initialized. Last hash: ${this.lastHash}, Sequence: ${this.sequenceNumber}`);
  }

  onModuleDestroy(): void {
    this.close();
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true, mode: 0o755 });
    }
  }

  private initializeFromLastLog(): void {
    try {
      const files = fs.readdirSync(this.logDir)
        .filter((f) => f.endsWith('.jsonl'))
        .sort();

      if (files.length > 0) {
        const lastFile = path.join(this.logDir, files[files.length - 1]);
        const content = fs.readFileSync(lastFile, 'utf-8');
        const lines = content.trim().split('\n').filter((l) => l.length > 0);

        if (lines.length > 0) {
          const lastEntry = JSON.parse(lines[lines.length - 1]);
          this.lastHash = lastEntry.hash || this.GENESIS_HASH;
          this.sequenceNumber = lastEntry.logSequenceNumber || 0;
        }
      }
    } catch (error) {
      this.logger.warn('Could not initialize from last log, starting fresh');
      this.lastHash = this.GENESIS_HASH;
      this.sequenceNumber = 0;
    }
  }

  private computeHash(previousHash: string, logEntry: object): string {
    const data = previousHash + JSON.stringify(logEntry);
    return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
  }

  log(format: StandardLogFormat): LogEntry {
    this.sequenceNumber++;

    const timestamp = format.timestamp || new Date().toISOString();

    const logEntryWithoutHash: StandardLogFormat = {
      timestamp,
      service: format.service,
      user: format.user,
      action: format.action,
      result: format.result,
      ip: format.ip,
      device: format.device,
      geo: format.geo,
      metadata: format.metadata,
    };

    const hash = this.computeHash(this.lastHash, logEntryWithoutHash);

    const fullEntry: LogEntry = {
      ...logEntryWithoutHash,
      hash,
      hashAlgorithm: 'SHA-256',
      previousHash: this.lastHash,
      logSequenceNumber: this.sequenceNumber,
    };

    this.lastHash = hash;
    this.hashCache.set(this.sequenceNumber, hash);

    this.writeLog(fullEntry);

    // Also forward to Loki for backward compatibility
    this.forwardToLoki(fullEntry);

    this.logger.debug(
      `Logged: ${format.action} - ${format.result} (seq: ${this.sequenceNumber})`,
    );

    return fullEntry;
  }

  private writeLog(entry: LogEntry): void {
    const date = new Date().toISOString().split('T')[0];
    const logFile = path.join(this.logDir, `banco-verde-${date}.jsonl`);

    if (this.currentLogFile !== logFile) {
      if (this.writeStream) {
        this.writeStream.end();
      }
      this.currentLogFile = logFile;
      this.writeStream = fs.createWriteStream(logFile, { flags: 'a', mode: 0o644 });
    }

    this.writeStream.write(JSON.stringify(entry) + '\n');
  }

  private forwardToLoki(entry: LogEntry): void {
    // Forward to existing Loki transport
    // This maintains backward compatibility with the existing Loki setup
    const lokiEntry = {
      stream: {
        service: entry.service,
        env: process.env.NODE_ENV || 'development',
        level: entry.result === 'SUCCESS' ? 'info' : 'warn',
        eventType: this.getEventType(entry.action, entry.result),
        userId: entry.user,
        action: entry.action,
        ip: entry.ip,
        deviceName: entry.device?.name,
        success: entry.result,
        hash: entry.hash,
        hashAlgorithm: entry.hashAlgorithm,
        logSequenceNumber: entry.logSequenceNumber,
      },
      values: [[Date.now() * 1_000_000, `${entry.action} - ${entry.result}`]],
    };

    // Use dynamic import to avoid circular dependencies
    try {
      const { createLokiLogger } = require('./loki-transport.service');
      const lokiLogger = createLokiLogger();
      lokiLogger.info(`${entry.action} - ${entry.result}`, {
        eventType: this.getEventType(entry.action, entry.result),
        userId: entry.user,
        action: entry.action,
        ip: entry.ip,
        deviceName: entry.device?.name,
        success: entry.result,
        hash: entry.hash,
      });
    } catch {
      // Loki logger not available, skip forwarding
    }
  }

  private getEventType(action: string, result: string): string {
    const actionLower = action.toLowerCase();

    if (actionLower.includes('login')) {
      return result === 'SUCCESS' ? 'login_success' : 'login_failed';
    }
    if (actionLower.includes('logout')) {
      return 'logout';
    }
    if (actionLower.includes('refresh')) {
      return 'token_refresh';
    }
    if (actionLower.includes('mfa') && actionLower.includes('enable')) {
      return 'mfa_enabled';
    }
    if (actionLower.includes('mfa') && actionLower.includes('disable')) {
      return 'mfa_disabled';
    }
    if (actionLower.includes('lock')) {
      return 'account_locked';
    }
    if (actionLower.includes('password')) {
      return 'password_changed';
    }
    if (actionLower.includes('config')) {
      return 'config_change';
    }
    if (actionLower.includes('transfer')) {
      return 'transfer';
    }
    if (actionLower.includes('fraud')) {
      return 'fraud_check';
    }

    return actionLower;
  }

  async verifyChainIntegrity(
    startSeq?: number,
    endSeq?: number,
  ): Promise<{
    valid: boolean;
    brokenAt?: number;
    details?: string;
  }> {
    const start = startSeq || 1;
    const end = endSeq || this.sequenceNumber;

    try {
      const files = fs.readdirSync(this.logDir)
        .filter((f) => f.endsWith('.jsonl'))
        .sort();

      let expectedHash = this.GENESIS_HASH;
      let foundStart = false;

      for (const file of files) {
        const content = fs.readFileSync(path.join(this.logDir, file), 'utf-8');
        const lines = content.trim().split('\n').filter((l) => l.length > 0);

        for (const line of lines) {
          const entry = JSON.parse(line);
          const seq = entry.logSequenceNumber;

          if (seq < start) {
            expectedHash = entry.hash;
            foundStart = seq === start - 1;
            continue;
          }
          if (seq > end) break;

          foundStart = true;

          if (entry.previousHash !== expectedHash) {
            return {
              valid: false,
              brokenAt: seq,
              details: `Hash chain broken at sequence ${seq}: expected ${expectedHash}, got ${entry.previousHash}`,
            };
          }

          const computedHash = this.computeHash(entry.previousHash, {
            timestamp: entry.timestamp,
            service: entry.service,
            user: entry.user,
            action: entry.action,
            result: entry.result,
            ip: entry.ip,
            device: entry.device,
            geo: entry.geo,
            metadata: entry.metadata,
          });

          if (computedHash !== entry.hash) {
            return {
              valid: false,
              brokenAt: seq,
              details: `Hash mismatch at sequence ${seq}: computed ${computedHash}, stored ${entry.hash}`,
            };
          }

          expectedHash = entry.hash;
        }
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        brokenAt: -1,
        details: `Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  getLastHash(): string {
    return this.lastHash;
  }

  getCurrentSequence(): number {
    return this.sequenceNumber;
  }

  close(): void {
    if (this.writeStream) {
      this.writeStream.end();
      this.logger.log('SiemLoggerService closed');
    }
  }
}
