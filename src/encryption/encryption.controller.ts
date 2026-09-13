import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Headers,
  HttpCode,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EncryptionService } from './encryption.service';
import { KeyManagementService } from './key-management.service';

class EncryptDataDto {
  data: string;
}

class DecryptDataDto {
  encryptedData: string;
}

@Controller('encryption')
export class EncryptionController {
  constructor(
    private readonly encryptionService: EncryptionService,
    private readonly keyManagementService: KeyManagementService,
  ) {}

  @Post('encrypt')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(200)
  async encrypt(@Body() dto: EncryptDataDto) {
    const encrypted = await this.encryptionService.encryptField(dto.data);
    return { success: true, encryptedData: encrypted };
  }

  @Post('decrypt')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(200)
  async decrypt(@Body() dto: DecryptDataDto) {
    const decrypted = await this.encryptionService.decryptField(dto.encryptedData);
    return { success: true, data: decrypted };
  }

  @Post('keys/generate')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(200)
  async generateKeyPair() {
    const keyPair = await this.keyManagementService.generateAndEncryptKeyPair();
    return {
      success: true,
      publicKey: keyPair.publicKey,
      encryptedPrivateKey: keyPair.encryptedPrivateKey,
    };
  }

  @Get('health')
  @HttpCode(200)
  health() {
    return {
      success: true,
      status: 'Encryption module operational',
      algorithm: 'AES-256-GCM',
      keyDerivation: 'scrypt',
    };
  }
}
