import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

export class TokenCryptService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly authTagLength = 16;
  private readonly salt = 'BancoVerdeMFA2024';

  constructor(private readonly encryptionKey: string) {}

  async encrypt(plaintext: string): Promise<string> {
    const key = await this.deriveKey();
    const iv = randomBytes(this.ivLength);

    const cipher = createCipheriv(this.algorithm, key, iv, {
      authTagLength: this.authTagLength,
    });

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    const result = Buffer.concat([iv, authTag, encrypted]);
    return result.toString('base64');
  }

  async decrypt(ciphertext: string): Promise<string> {
    const key = await this.deriveKey();
    const buffer = Buffer.from(ciphertext, 'base64');

    const iv = buffer.subarray(0, this.ivLength);
    const authTag = buffer.subarray(
      this.ivLength,
      this.ivLength + this.authTagLength,
    );
    const encrypted = buffer.subarray(this.ivLength + this.authTagLength);

    const decipher = createDecipheriv(this.algorithm, key, iv, {
      authTagLength: this.authTagLength,
    });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  private async deriveKey(): Promise<Buffer> {
    return (await promisify(scrypt)(
      this.encryptionKey,
      this.salt,
      this.keyLength,
    )) as Buffer;
  }
}
