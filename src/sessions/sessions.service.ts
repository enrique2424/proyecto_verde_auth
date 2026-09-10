import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Session } from './entities/session.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  async createRefreshToken(
    userId: string,
    deviceInfo: string,
    ipAddress: string,
  ): Promise<string> {
    const refreshToken = this.generateToken();
    const hashedToken = await bcrypt.hash(refreshToken, 10);

    const session = this.sessionRepository.create({
      userId,
      refreshToken: hashedToken,
      deviceInfo,
      ipAddress,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isRevoked: false,
    });

    await this.sessionRepository.save(session);
    return refreshToken;
  }

  async validateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<boolean> {
    const sessions = await this.sessionRepository.find({
      where: { userId, isRevoked: false },
    });

    for (const session of sessions) {
      const isValid = await bcrypt.compare(refreshToken, session.refreshToken);
      if (isValid && new Date(session.expiresAt) > new Date()) {
        return true;
      }
    }
    return false;
  }

  async revokeSession(userId: string, refreshToken: string): Promise<void> {
    const sessions = await this.sessionRepository.find({
      where: { userId, isRevoked: false },
    });

    for (const session of sessions) {
      if (await bcrypt.compare(refreshToken, session.refreshToken)) {
        session.isRevoked = true;
        await this.sessionRepository.save(session);
        return;
      }
    }
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.sessionRepository.update({ userId, isRevoked: false }, { isRevoked: true });
  }

  async cleanupExpiredSessions(): Promise<void> {
    await this.sessionRepository.delete({
      expiresAt: LessThan(new Date()),
    });
  }

  private generateToken(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }
}
