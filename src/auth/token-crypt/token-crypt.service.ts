import { createCipheriv, scrypt, createDecipheriv } from 'crypto';
import { promisify } from 'util';

export class TokenCryptService {
  private readonly password = process.env.AES_KEY;
  private readonly iv = Buffer.from('066a42ac4a0aee28');
  constructor() {}

  public async encode(textToCrypt) {
    const key = await this.genKey();
    const cipher = createCipheriv('aes-256-ctr', key, this.iv);
    const encryptedText = Buffer.concat([
      cipher.update(textToCrypt),
      cipher.final(),
    ]);
    return encryptedText;
  }
  async decode(textEncoded) {
    const decodeTo = Buffer.from(textEncoded, 'base64').toString('ascii');
    const decipher = createDecipheriv(
      'aes-256-ctr',
      await this.genKey(),
      this.iv,
    );
    const decryptedText = Buffer.concat([
      decipher.update(textEncoded),
      decipher.final(),
    ]);
    return decryptedText;
  }
  private async genKey() {
    return (await promisify(scrypt)(this.password, 'salt', 32)) as Buffer;
  }
}
