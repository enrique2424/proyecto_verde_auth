import { Test, TestingModule } from '@nestjs/testing';
import { TokenCryptService } from '../token-crypt/token-crypt.service';

const mockTOTPInstance = {
  generateSecret: jest.fn(() => 'MOCKSECRET123456789012345678'),
  toURI: jest.fn((opts: { label: string; secret: string }) =>
    `otpauth://totp/BancoVerde:${opts.label}?secret=${opts.secret}&issuer=BancoVerde`,
  ),
  verify: jest.fn((token: string, opts: { secret: string }) => ({
    valid: token === '123456',
  })),
};

jest.mock('@otplib/totp', () => ({
  TOTP: jest.fn(() => mockTOTPInstance),
}));

jest.mock('@otplib/plugin-crypto-node', () => ({
  NodeCryptoPlugin: jest.fn(),
}));

jest.mock('@otplib/plugin-base32-scure', () => ({
  ScureBase32Plugin: jest.fn(),
}));

import { MfaService } from './mfa.service';

describe('MfaService', () => {
  let mfaService: MfaService;
  let tokenCryptService: TokenCryptService;

  const mockTokenCryptService = {
    encrypt: jest.fn((text) => Promise.resolve(`encrypted_${text}`)),
    decrypt: jest.fn((text) => Promise.resolve(text.replace('encrypted_', ''))),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MfaService,
        {
          provide: TokenCryptService,
          useValue: mockTokenCryptService,
        },
      ],
    }).compile();

    mfaService = module.get<MfaService>(MfaService);
    tokenCryptService = module.get<TokenCryptService>(TokenCryptService);
  });

  describe('generateSecret', () => {
    it('should generate a Base32 secret', () => {
      const secret = mfaService.generateSecret();
      expect(secret).toBeDefined();
      expect(typeof secret).toBe('string');
      expect(secret.length).toBeGreaterThan(0);
    });
  });

  describe('generateOtpauthUri', () => {
    it('should generate valid otpauth URI', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const email = 'test@example.com';
      const uri = mfaService.generateOtpauthUri(secret, email);

      expect(uri).toContain('otpauth://totp/');
      expect(uri).toContain(secret);
      expect(uri).toContain('BancoVerde');
      expect(uri).toContain(email);
    });
  });

  describe('generateQRCode', () => {
    it('should generate base64 QR code URL', async () => {
      const uri = 'otpauth://totp/BancoVerde:test@example.com?secret=JBSWY3DPEHPK3PXP';
      const qrCode = await mfaService.generateQRCode(uri);

      expect(qrCode).toBeDefined();
      expect(qrCode.startsWith('data:image/png;base64,')).toBe(true);
    });
  });

  describe('verifyTotp', () => {
    it('should verify a valid TOTP code using mock', async () => {
      const isValid = await mfaService.verifyTotp('anySecret', '123456');
      expect(isValid).toBe(true);
    });

    it('should reject an invalid TOTP code using mock', async () => {
      const isValid = await mfaService.verifyTotp('anySecret', '000000');
      expect(isValid).toBe(false);
    });

    it('should reject a malformed code', async () => {
      const isValid = await mfaService.verifyTotp('anySecret', 'abc');
      expect(isValid).toBe(false);
    });
  });

  describe('encryptSecret and decryptSecret', () => {
    it('should encrypt a secret', async () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const encrypted = await mfaService.encryptSecret(secret);

      expect(encrypted).not.toBe(secret);
      expect(mockTokenCryptService.encrypt).toHaveBeenCalledWith(secret);
    });

    it('should decrypt an encrypted secret', async () => {
      const encrypted = 'encrypted_JBSWY3DPEHPK3PXP';
      const decrypted = await mfaService.decryptSecret(encrypted);

      expect(decrypted).toBe('JBSWY3DPEHPK3PXP');
      expect(mockTokenCryptService.decrypt).toHaveBeenCalledWith(encrypted);
    });
  });

  describe('generateSetupResponse', () => {
    it('should generate setup response with secret, uri and qrCode', async () => {
      const email = 'test@example.com';
      const response = await mfaService.generateSetupResponse(email);

      expect(response).toHaveProperty('secret');
      expect(response).toHaveProperty('otpauthUri');
      expect(response).toHaveProperty('qrCodeUrl');
      expect(response.otpauthUri).toContain('otpauth://totp/');
      expect(response.qrCodeUrl).toContain('data:image/png;base64,');
    });
  });
});
