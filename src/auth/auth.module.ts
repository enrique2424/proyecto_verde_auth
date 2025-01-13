import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TokenBuilderModule } from 'src/token-builder/token-builder.module';
import { Usuarios } from './entities/usuarios.entity';
import { TokenUnique } from './entities/token_unique.entity';
import { AppDevicesModule } from '../app-devices/app-devices.module';
import { TokenCryptService } from './token-crypt/token-crypt.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, TokenCryptService],
  imports: [
    TypeOrmModule.forFeature([Usuarios, TokenUnique]),
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          secret: configService.get('JWT_SECRET'),
          signOptions: {
            expiresIn: configService.get('EXPIRES'),
          },
        };
      },
    }),
    TokenBuilderModule,
    AppDevicesModule,
  ],
  exports: [JwtStrategy, PassportModule, JwtModule],
})
export class AuthModule {}
