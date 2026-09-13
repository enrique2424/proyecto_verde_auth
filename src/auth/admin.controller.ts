import { Controller, Post, Body } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

@Controller('admin')
export class AdminController {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  @Post('unlock-user')
  async unlockUser(@Body() body: { email: string }) {
    const user = await this.userRepository.findOne({
      where: { email: body.email },
    });

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    await this.userRepository.update(user.id, {
      failedAttempts: 0,
      lockedUntil: null,
      mfaFailedAttempts: 0,
      mfaLockedUntil: null,
    });

    return {
      success: true,
      message: `User ${body.email} has been unlocked`,
    };
  }

  @Post('reset-user')
  async resetUser(@Body() body: { email: string }) {
    const user = await this.userRepository.findOne({
      where: { email: body.email },
    });

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    await this.userRepository.update(user.id, {
      failedAttempts: 0,
      lockedUntil: null,
      mfaEnabled: false,
      mfaSecret: null,
      mfaBackupCodes: null,
      mfaTempToken: null,
      mfaTempTokenExpires: null,
      mfaLastVerified: null,
      mfaFailedAttempts: 0,
      mfaLockedUntil: null,
    });

    return {
      success: true,
      message: `User ${body.email} has been reset`,
    };
  }
}
