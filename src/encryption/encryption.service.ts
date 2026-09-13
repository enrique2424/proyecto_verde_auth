import { Injectable } from '@nestjs/common';
import { TokenCryptService } from '../auth/token-crypt/token-crypt.service';

export interface EncryptedField {
  encryptedData: string;
  iv: string;
  authTag: string;
}

@Injectable()
export class EncryptionService {
  constructor(private readonly tokenCryptService: TokenCryptService) {}

  async encryptField(data: string): Promise<string> {
    return this.tokenCryptService.encrypt(data);
  }

  async decryptField(encryptedData: string): Promise<string> {
    return this.tokenCryptService.decrypt(encryptedData);
  }

  async encryptUserData(data: {
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: string;
  }): Promise<Record<string, string>> {
    const encrypted: Record<string, string> = {};

    if (data.email) {
      encrypted.email = await this.encryptField(data.email);
    }
    if (data.firstName) {
      encrypted.firstName = await this.encryptField(data.firstName);
    }
    if (data.lastName) {
      encrypted.lastName = await this.encryptField(data.lastName);
    }
    if (data.phone) {
      encrypted.phone = await this.encryptField(data.phone);
    }
    if (data.address) {
      encrypted.address = await this.encryptField(data.address);
    }

    return encrypted;
  }

  async decryptUserData(encryptedData: {
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: string;
  }): Promise<Record<string, string>> {
    const decrypted: Record<string, string> = {};

    if (encryptedData.email) {
      decrypted.email = await this.decryptField(encryptedData.email);
    }
    if (encryptedData.firstName) {
      decrypted.firstName = await this.decryptField(encryptedData.firstName);
    }
    if (encryptedData.lastName) {
      decrypted.lastName = await this.decryptField(encryptedData.lastName);
    }
    if (encryptedData.phone) {
      decrypted.phone = await this.decryptField(encryptedData.phone);
    }
    if (encryptedData.address) {
      decrypted.address = await this.decryptField(encryptedData.address);
    }

    return decrypted;
  }
}
