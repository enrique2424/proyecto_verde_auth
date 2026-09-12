import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TokenCryptService } from './token-crypt/token-crypt.service';
import { JwtAuthService } from './jwt/jwt.service';
import { MfaService } from './mfa/mfa.service';
import { MfaController } from './mfa/mfa.controller';
import { BackupCodesService } from './mfa/backup-codes.service';

import { UsersModule } from '../users/users.module';
import { SessionsModule } from '../sessions/sessions.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

import { User } from '../users/entities/user.entity';
import { Session } from '../sessions/entities/session.entity';
import { AuditLog } from '../audit-log/entities/audit-log.entity';

@Module({
  controllers: [AuthController, MfaController],
  providers: [
    AuthService,
    JwtAuthService,
    JwtStrategy,
    MfaService,
    BackupCodesService,
    {
      provide: TokenCryptService,
      useFactory: (configService: ConfigService) =>
        new TokenCryptService(configService.get('MFA_ENCRYPTION_KEY')),
      inject: [ConfigService],
    },
  ],
  imports: [
    TypeOrmModule.forFeature([User, Session, AuditLog]),
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          secret: configService.get('JWT_ACCESS_SECRET'),
          signOptions: {
            expiresIn: configService.get('JWT_ACCESS_EXPIRES') || '15m',
          },
        };
      },
    }),
    UsersModule,
    SessionsModule,
    AuditLogModule,
  ],
  exports: [
    JwtStrategy,
    PassportModule,
    JwtModule,
    AuthService,
    MfaService,
    BackupCodesService,
    TokenCryptService,
  ],
})
export class AuthModule {}
