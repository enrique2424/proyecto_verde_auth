import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { createLokiLogger } from '../common/logging';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);
  private readonly securityLogger = createLokiLogger();

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(
    action: string,
    userId: string | null,
    ip: string | null,
    device: string | null,
    success: boolean,
  ): Promise<void> {
    const auditLog = this.auditLogRepository.create({
      userId,
      action,
      ip,
      device,
      success,
    });
    await this.auditLogRepository.save(auditLog);

    // Send to Loki for centralized monitoring
    const eventType = this.getEventType(action, success);
    const logMessage = `${action} - ${success ? 'SUCCESS' : 'FAILED'}`;
    this.securityLogger.info(logMessage, {
      eventType,
      userId: userId || 'anonymous',
      action,
      ip: ip || 'unknown',
      device: device || 'unknown',
      success: String(success),
    });
  }

  private getEventType(action: string, success: boolean): string {
    const actionLower = action.toLowerCase();

    if (actionLower.includes('login')) {
      return success ? 'login_success' : 'login_failed';
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
    if (actionLower.includes('lock')) {
      return 'account_locked';
    }
    if (actionLower.includes('password')) {
      return 'password_changed';
    }

    return actionLower;
  }

  async findByUserId(userId: string, limit = 100): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { userId },
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }
}
