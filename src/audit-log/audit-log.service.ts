import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditLogService {
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
  }

  async findByUserId(userId: string, limit = 100): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { userId },
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }
}
