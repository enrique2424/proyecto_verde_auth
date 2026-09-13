import { Injectable } from '@nestjs/common';
import { randomBytes, createECDH } from 'crypto';
import { TokenCryptService } from '../auth/token-crypt/token-crypt.service';

export interface UserKeyPair {
  publicKey: string;
  encryptedPrivateKey: string;
}

export interface AsymmetricKeyPair {
  publicKey: string;
  privateKey: string;
}

@Injectable()
export class KeyManagementService {
  constructor(private readonly tokenCryptService: TokenCryptService) {}

  generateSymmetricKey(): string {
    return randomBytes(32).toString('hex');
  }

  generateECDHKeyPair(): AsymmetricKeyPair {
    const ecdh = createECDH('secp256k1');
    ecdh.generateKeys();

    return {
      publicKey: ecdh.getPublicKey('base64'),
      privateKey: ecdh.getPrivateKey('base64'),
    };
  }

  async generateAndEncryptKeyPair(): Promise<UserKeyPair> {
    const { publicKey, privateKey } = this.generateECDHKeyPair();
    const encryptedPrivateKey = await this.tokenCryptService.encrypt(privateKey);

    return {
      publicKey,
      encryptedPrivateKey,
    };
  }

  async encryptPrivateKey(privateKey: string): Promise<string> {
    return this.tokenCryptService.encrypt(privateKey);
  }

  async decryptPrivateKey(encryptedPrivateKey: string): Promise<string> {
    return this.tokenCryptService.decrypt(encryptedPrivateKey);
  }

  generateEphemeralKey(): string {
    return randomBytes(32).toString('base64');
  }

  generateRandomIV(): string {
    return randomBytes(16).toString('hex');
  }

  deriveSharedSecret(privateKey: string, publicKey: string): Buffer {
    const ecdh = createECDH('secp256k1');
    ecdh.setPrivateKey(Buffer.from(privateKey, 'base64'));
    return ecdh.computeSecret(Buffer.from(publicKey, 'base64'));
  }
}
