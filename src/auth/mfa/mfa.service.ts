import { Injectable } from '@nestjs/common';
import { TOTP } from '@otplib/totp';
import { NodeCryptoPlugin } from '@otplib/plugin-crypto-node';
import { ScureBase32Plugin } from '@otplib/plugin-base32-scure';
import * as QRCode from 'qrcode';
import { TokenCryptService } from '../token-crypt/token-crypt.service';
import { MfaSetupResponseDto } from './dto/mfa-setup.dto';

@Injectable()
export class MfaService {
  private readonly totp: TOTP;

  constructor(private readonly tokenCryptService: TokenCryptService) {
    this.totp = new TOTP({
      crypto: new NodeCryptoPlugin(),
      base32: new ScureBase32Plugin(),
      issuer: 'BancoVerde',
      period: 30,
      digits: 6,
    });
  }

  generateSecret(): string {
    return this.totp.generateSecret();
  }

  generateOtpauthUri(secret: string, email: string): string {
    return this.totp.toURI({ label: email, secret });
  }

  async generateQRCode(otpauthUri: string): Promise<string> {
    return QRCode.toDataURL(otpauthUri);
  }

  async verifyTotp(secret: string, code: string): Promise<boolean> {
    const result = await this.totp.verify(code, { secret });
    return result.valid;
  }

  async encryptSecret(secret: string): Promise<string> {
    return this.tokenCryptService.encrypt(secret);
  }

  async decryptSecret(encrypted: string): Promise<string> {
    return this.tokenCryptService.decrypt(encrypted);
  }

  async generateSetupResponse(
    email: string,
  ): Promise<MfaSetupResponseDto> {
    const secret = this.generateSecret();
    const otpauthUri = this.generateOtpauthUri(secret, email);
    const qrCodeUrl = await this.generateQRCode(otpauthUri);

    return {
      secret,
      otpauthUri,
      qrCodeUrl,
    };
  }
}
