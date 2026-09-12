import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Headers,
  HttpCode,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { MfaService } from './mfa.service';
import { BackupCodesService } from './backup-codes.service';
import { UsersService } from '../../users/users.service';
import { JwtAuthService } from '../jwt/jwt.service';
import { TokenCryptService } from '../token-crypt/token-crypt.service';
import {
  MfaSetupResponseDto,
  MfaVerifySetupDto,
  MfaVerifyDto,
  MfaVerifyBackupDto,
  MfaDisableDto,
  MfaStatusDto,
} from './dto';

@Controller('auth/mfa')
export class MfaController {
  constructor(
    private readonly mfaService: MfaService,
    private readonly backupCodesService: BackupCodesService,
    private readonly usersService: UsersService,
    private readonly jwtAuthService: JwtAuthService,
    private readonly tokenCryptService: TokenCryptService,
  ) {}

  @Post('setup')
  @HttpCode(200)
  async setup(@Headers('x-user-id') userId: string): Promise<MfaSetupResponseDto> {
    const user = await this.usersService.findById(userId);
    return this.mfaService.generateSetupResponse(user.email);
  }

  @Post('verify-setup')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(200)
  async verifySetup(
    @Headers('x-user-id') userId: string,
    @Body() dto: MfaVerifySetupDto,
  ) {
    const user = await this.usersService.findById(userId);

    const decryptedSecret = await this.mfaService.decryptSecret(user.mfaSecret);
    const isValid = this.mfaService.verifyTotp(decryptedSecret, dto.code);

    if (!isValid) {
      return { success: false, message: 'Código inválido' };
    }

    const backupCodes = this.backupCodesService.generateBackupCodes();
    const encryptedBackupCodes = await this.tokenCryptService.encrypt(
      this.backupCodesService.stringifyBackupCodes(
        backupCodes.map((code) => ({ code, used: false })),
      ),
    );

    await this.usersService.enableMfa(userId, encryptedBackupCodes);

    return {
      success: true,
      backupCodes,
    };
  }

  @Post('disable')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(200)
  async disable(
    @Headers('x-user-id') userId: string,
    @Body() dto: MfaDisableDto,
  ) {
    const user = await this.usersService.findById(userId);

    const isPasswordValid = await this.usersService.validatePassword(
      user,
      dto.password,
    );
    if (!isPasswordValid) {
      return { success: false, message: 'Contraseña incorrecta' };
    }

    const decryptedSecret = await this.mfaService.decryptSecret(user.mfaSecret);
    const isCodeValid = this.mfaService.verifyTotp(decryptedSecret, dto.code);

    if (!isCodeValid) {
      return { success: false, message: 'Código MFA incorrecto' };
    }

    await this.usersService.disableMfa(userId);

    return { success: true };
  }

  @Get('status')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(200)
  async getStatus(@Headers('x-user-id') userId: string): Promise<MfaStatusDto> {
    const user = await this.usersService.findById(userId);

    return {
      mfaEnabled: user.mfaEnabled,
      backupCodesRemaining: user.mfaEnabled
        ? this.backupCodesService.countRemainingCodes(user.mfaBackupCodes)
        : 0,
      lastVerified: user.mfaLastVerified,
    };
  }

  @Post('verify')
  @Throttle(3, 300000)
  @HttpCode(200)
  async verify(@Body() dto: MfaVerifyDto, @Req() request: any) {
    const ip = request.ip;
    const device = request.headers['user-agent'] || 'unknown';

    const user = await this.usersService.findByMfaTempToken(dto.tempToken);

    if (!user) {
      return { success: false, message: 'Sesión MFA expirada o inválida' };
    }

    if (user.mfaTempTokenExpires < new Date()) {
      return { success: false, message: 'Sesión MFA expirada' };
    }

    if (await this.usersService.isMfaLocked(user.id)) {
      return { success: false, message: 'MFA bloqueado por demasiados intentos fallidos' };
    }

    const decryptedSecret = await this.mfaService.decryptSecret(user.mfaSecret);
    const isValid = await this.mfaService.verifyTotp(decryptedSecret, dto.code);

    if (!isValid) {
      await this.usersService.incrementMfaFailedAttempts(user.id);
      return { success: false, message: 'Código MFA incorrecto' };
    }

    await this.usersService.resetMfaFailedAttempts(user.id);
    await this.usersService.clearMfaTempToken(user.id);

    const tokens = await this.jwtAuthService.generateTokens(user.id, user.email, ip, device);

    return {
      success: true,
      ...tokens,
    };
  }

  @Post('verify-backup')
  @Throttle(3, 300000)
  @HttpCode(200)
  async verifyBackup(@Body() dto: MfaVerifyBackupDto, @Req() request: any) {
    const ip = request.ip;
    const device = request.headers['user-agent'] || 'unknown';

    const user = await this.usersService.findByMfaTempToken(dto.tempToken);

    if (!user) {
      return { success: false, message: 'Sesión MFA expirada o inválida' };
    }

    if (user.mfaTempTokenExpires < new Date()) {
      return { success: false, message: 'Sesión MFA expirada' };
    }

    if (await this.usersService.isMfaLocked(user.id)) {
      return { success: false, message: 'MFA bloqueado por demasiados intentos fallidos' };
    }

    const validation = this.backupCodesService.validateBackupCode(
      user.mfaBackupCodes,
      dto.backupCode,
    );

    if (!validation.valid) {
      await this.usersService.incrementMfaFailedAttempts(user.id);
      return { success: false, message: 'Código de backup inválido' };
    }

    await this.usersService.resetMfaFailedAttempts(user.id);
    await this.usersService.updateBackupCodes(
      user.id,
      await this.tokenCryptService.encrypt(
        this.backupCodesService.stringifyBackupCodes(validation.remainingCodes),
      ),
    );

    await this.usersService.clearMfaTempToken(user.id);

    const tokens = await this.jwtAuthService.generateTokens(user.id, user.email, ip, device);

    return {
      success: true,
      ...tokens,
    };
  }
}
