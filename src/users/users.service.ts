import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async create(email: string, password: string): Promise<User> {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = this.userRepository.create({
      email,
      passwordHash,
      isActive: true,
      failedAttempts: 0,
    });
    return this.userRepository.save(user);
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }

  async incrementFailedAttempts(user: User): Promise<void> {
    user.failedAttempts += 1;
    if (user.failedAttempts >= 5) {
      user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    }
    await this.userRepository.save(user);
  }

  async resetFailedAttempts(user: User): Promise<void> {
    user.failedAttempts = 0;
    user.lockedUntil = null;
    await this.userRepository.save(user);
  }

  async findByMfaTempToken(tempToken: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { mfaTempToken: tempToken },
    });
  }

  async enableMfa(userId: string, encryptedBackupCodes: string): Promise<void> {
    await this.userRepository.update(userId, {
      mfaEnabled: true,
      mfaBackupCodes: encryptedBackupCodes,
    });
  }

  async disableMfa(userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      mfaEnabled: false,
      mfaSecret: null,
      mfaBackupCodes: null,
      mfaTempToken: null,
      mfaTempTokenExpires: null,
      mfaFailedAttempts: 0,
      mfaLockedUntil: null,
    });
  }

  async clearMfaTempToken(userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      mfaTempToken: null,
      mfaTempTokenExpires: null,
      mfaLastVerified: new Date(),
    });
  }

  async updateBackupCodes(userId: string, encryptedCodes: string): Promise<void> {
    await this.userRepository.update(userId, {
      mfaBackupCodes: encryptedCodes,
    });
  }

  async setMfaTempToken(
    userId: string,
    tempToken: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.userRepository.update(userId, {
      mfaTempToken: tempToken,
      mfaTempTokenExpires: expiresAt,
    });
  }

  async setMfaSecret(userId: string, encryptedSecret: string): Promise<void> {
    await this.userRepository.update(userId, {
      mfaSecret: encryptedSecret,
    });
  }

  async incrementMfaFailedAttempts(userId: string): Promise<void> {
    const user = await this.findById(userId);
    if (!user) return;

    user.mfaFailedAttempts += 1;
    if (user.mfaFailedAttempts >= 3) {
      user.mfaLockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    }
    await this.userRepository.save(user);
  }

  async resetMfaFailedAttempts(userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      mfaFailedAttempts: 0,
      mfaLockedUntil: null,
    });
  }

  async isMfaLocked(userId: string): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user) return false;
    return user.mfaLockedUntil !== null && new Date(user.mfaLockedUntil) > new Date();
  }

  async enableBiometric(userId: string, deviceBiometricId: string): Promise<void> {
    await this.userRepository.update(userId, {
      biometricEnabled: true,
      deviceBiometricId,
      preferredMfaMethod: 'biometric',
    });
  }

  async disableBiometric(userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      biometricEnabled: false,
      deviceBiometricId: null,
      preferredMfaMethod: 'totp',
    });
  }

  async validateBiometric(userId: string, deviceBiometricId: string): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user) return false;
    return user.biometricEnabled && user.deviceBiometricId === deviceBiometricId;
  }
}
