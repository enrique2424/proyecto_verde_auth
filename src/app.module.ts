import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { AuthModule } from './auth/auth.module';
import { TokenBuilderModule } from './token-builder/token-builder.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          ttl: configService.get('TIME'),
          limit: configService.get('LIMITING'),
        };
      },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          type: 'oracle',
          connectString: `${configService.get(
            'ORACLE_HOST',
          )}:${configService.get('ORACLE_PORT')}/${configService.get(
            'ORACLE_DB_NAME',
          )}`,
          username: configService.get('ORACLE_USER'),
          password: configService.get('ORACLE_PASSWORD'),
          synchronize: false,
          autoLoadEntities: true,
        };
      },
    }),
    AuthModule,
    TokenBuilderModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [],
})
export class AppModule {}
