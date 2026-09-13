import { Module } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { KeyManagementService } from './key-management.service';
import { EncryptionController } from './encryption.controller';
import { TokenCryptService } from '../auth/token-crypt/token-crypt.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [EncryptionController],
  providers: [
    EncryptionService,
    KeyManagementService,
    {
      provide: TokenCryptService,
      useFactory: (configService: ConfigService) =>
        new TokenCryptService(configService.get('MFA_ENCRYPTION_KEY')),
      inject: [ConfigService],
    },
  ],
  exports: [EncryptionService, KeyManagementService],
})
export class EncryptionModule {}
