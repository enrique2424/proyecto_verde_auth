import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { SessionsService } from '../sessions/sessions.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { JwtAuthService } from './jwt/jwt.service';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly maxLoginAttempts: number;
  private readonly lockoutDurationMinutes: number;

  constructor(
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
    private readonly auditLogService: AuditLogService,
    private readonly jwtAuthService: JwtAuthService,
    private readonly configService: ConfigService,
  ) {
    this.maxLoginAttempts = this.configService.get('MAX_LOGIN_ATTEMPTS') || 5;
    this.lockoutDurationMinutes =
      this.configService.get('LOCKOUT_DURATION_MINUTES') || 15;
  }

  async login(loginDto: LoginDto, ip: string, device: string) {
    const { email, password } = loginDto;

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      await this.auditLogService.log('LOGIN_FAILED', null, ip, device, false);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      await this.auditLogService.log('LOGIN_LOCKED', user.id, ip, device, false);
      throw new ForbiddenException('Cuenta bloqueada. Intente más tarde.');
    }

    const isPasswordValid =
      await this.usersService.validatePassword(user, password);
    if (!isPasswordValid) {
      await this.usersService.incrementFailedAttempts(user);
      await this.auditLogService.log('LOGIN_FAILED', user.id, ip, device, false);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    await this.usersService.resetFailedAttempts(user);

    const accessToken = this.jwtAuthService.generateAccessToken(
      user.id,
      user.email,
    );
    const { token: refreshToken } =
      this.jwtAuthService.generateRefreshToken(user.id);

    await this.sessionsService.createRefreshToken(user.id, device, ip);

    await this.auditLogService.log('LOGIN_SUCCESS', user.id, ip, device, true);

    return {
      success: true,
      data: {
        accessToken,
        refreshToken,
        expiresIn: 900,
      },
    };
  }

  async refresh(refreshToken: string, ip: string, device: string) {
    const payload = this.jwtAuthService.verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    const isValid = await this.sessionsService.validateRefreshToken(
      payload.sub,
      refreshToken,
    );
    if (!isValid) {
      throw new UnauthorizedException(
        'Refresh token inválido o expirado',
      );
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuario no encontrado o inactivo');
    }

    const newAccessToken = this.jwtAuthService.generateAccessToken(
      user.id,
      user.email,
    );
    const { token: newRefreshToken } =
      this.jwtAuthService.generateRefreshToken(user.id);

    await this.sessionsService.revokeSession(user.id, refreshToken);
    await this.sessionsService.createRefreshToken(user.id, device, ip);

    await this.auditLogService.log(
      'TOKEN_REFRESH',
      user.id,
      ip,
      device,
      true,
    );

    return {
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 900,
      },
    };
  }

  async logout(
    refreshToken: string,
    userId: string,
    ip: string,
    device: string,
  ) {
    await this.sessionsService.revokeSession(userId, refreshToken);
    await this.auditLogService.log('LOGOUT', userId, ip, device, true);
    return { success: true, message: 'Sesión cerrada correctamente' };
  }

  async verify(token: string) {
    try {
      let decodedToken = token;
      try {
        const buffer = Buffer.from(token, 'base64');
        decodedToken = buffer.toString('ascii');
      } catch {
        // Token is not base64 encoded, use as is
      }

      const payload = this.jwtAuthService.verifyAccessToken(decodedToken);
      if (!payload) {
        return { status: false, message: 'Token Inválido' };
      }
      return { status: true, payload };
    } catch {
      return { status: false, message: 'Token Inválido' };
    }
  }
}
