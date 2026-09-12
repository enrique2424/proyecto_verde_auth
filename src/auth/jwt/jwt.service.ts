import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService as NestJwtService } from '@nestjs/jwt';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  type: 'refresh';
}

@Injectable()
export class JwtAuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: NestJwtService,
  ) {}

  generateAccessToken(userId: string, email: string): string {
    const payload: AccessTokenPayload = { sub: userId, email, type: 'access' };
    return this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRES') || '15m',
    });
  }

  generateRefreshToken(userId: string): { token: string; jti: string } {
    const jti =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    const payload: RefreshTokenPayload = { sub: userId, jti, type: 'refresh' };
    const token = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES') || '7d',
    });
    return { token, jti };
  }

  verifyAccessToken(token: string): AccessTokenPayload | null {
    try {
      return this.jwtService.verify(token, {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
      });
    } catch {
      return null;
    }
  }

  verifyRefreshToken(token: string): RefreshTokenPayload | null {
    try {
      return this.jwtService.verify(token, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      return null;
    }
  }

  async generateTokens(
    userId: string,
    email: string,
    device: string,
    ip: string,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const accessToken = this.generateAccessToken(userId, email);
    const { token: refreshToken } = this.generateRefreshToken(userId);
    return { accessToken, refreshToken, expiresIn: 900 };
  }
}
