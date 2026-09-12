import { Test, TestingModule } from '@nestjs/testing';
import { BackupCodesService } from './backup-codes.service';

describe('BackupCodesService', () => {
  let backupCodesService: BackupCodesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BackupCodesService],
    }).compile();

    backupCodesService = module.get<BackupCodesService>(BackupCodesService);
  });

  describe('generateBackupCodes', () => {
    it('should generate 8 backup codes', () => {
      const codes = backupCodesService.generateBackupCodes();

      expect(codes).toHaveLength(8);
    });

    it('should generate 8-character codes', () => {
      const codes = backupCodesService.generateBackupCodes();

      codes.forEach((code) => {
        expect(code.length).toBe(8);
        expect(code).toMatch(/^[A-F0-9]+$/);
      });
    });

    it('should generate unique codes each time', () => {
      const codes1 = backupCodesService.generateBackupCodes();
      const codes2 = backupCodesService.generateBackupCodes();

      expect(codes1).not.toEqual(codes2);
    });

    it('should generate uppercase codes', () => {
      const codes = backupCodesService.generateBackupCodes();

      codes.forEach((code) => {
        expect(code).toBe(code.toUpperCase());
      });
    });
  });

  describe('parseBackupCodes', () => {
    it('should parse valid JSON backup codes', () => {
      const storedCodes = JSON.stringify([
        { code: 'ABCD1234', used: false },
        { code: 'EFGH5678', used: true, usedAt: new Date() },
      ]);

      const parsed = backupCodesService.parseBackupCodes(storedCodes);

      expect(parsed).toHaveLength(2);
      expect(parsed[0].code).toBe('ABCD1234');
      expect(parsed[0].used).toBe(false);
    });

    it('should return empty array for invalid JSON', () => {
      const storedCodes = 'not-valid-json';
      const parsed = backupCodesService.parseBackupCodes(storedCodes);

      expect(parsed).toEqual([]);
    });
  });

  describe('stringifyBackupCodes', () => {
    it('should convert backup codes to JSON string', () => {
      const codes = [
        { code: 'ABCD1234', used: false },
        { code: 'EFGH5678', used: true },
      ];

      const stringified = backupCodesService.stringifyBackupCodes(codes);
      const parsed = JSON.parse(stringified);

      expect(parsed).toEqual(codes);
    });
  });

  describe('validateBackupCode', () => {
    it('should validate a correct unused code', () => {
      const storedCodes = JSON.stringify([
        { code: 'ABCD1234', used: false },
        { code: 'EFGH5678', used: false },
      ]);

      const result = backupCodesService.validateBackupCode(storedCodes, 'ABCD1234');

      expect(result.valid).toBe(true);
      expect(result.remainingCodes).toHaveLength(2);
    });

    it('should reject an already used code', () => {
      const storedCodes = JSON.stringify([
        { code: 'ABCD1234', used: true, usedAt: new Date() },
        { code: 'EFGH5678', used: false },
      ]);

      const result = backupCodesService.validateBackupCode(storedCodes, 'ABCD1234');

      expect(result.valid).toBe(false);
    });

    it('should reject a non-existent code', () => {
      const storedCodes = JSON.stringify([
        { code: 'ABCD1234', used: false },
      ]);

      const result = backupCodesService.validateBackupCode(storedCodes, 'XXXX0000');

      expect(result.valid).toBe(false);
    });

    it('should be case-insensitive', () => {
      const storedCodes = JSON.stringify([
        { code: 'ABCD1234', used: false },
      ]);

      const result = backupCodesService.validateBackupCode(storedCodes, 'abcd1234');

      expect(result.valid).toBe(true);
    });

    it('should mark code as used after validation', () => {
      const storedCodes = JSON.stringify([
        { code: 'ABCD1234', used: false },
        { code: 'EFGH5678', used: false },
      ]);

      const result = backupCodesService.validateBackupCode(storedCodes, 'ABCD1234');

      expect(result.valid).toBe(true);
      expect(result.remainingCodes[0].used).toBe(true);
      expect(result.remainingCodes[0].usedAt).toBeDefined();
    });
  });

  describe('countRemainingCodes', () => {
    it('should count remaining unused codes', () => {
      const storedCodes = JSON.stringify([
        { code: 'ABCD1234', used: false },
        { code: 'EFGH5678', used: true },
        { code: 'IJKL9012', used: false },
      ]);

      const count = backupCodesService.countRemainingCodes(storedCodes);

      expect(count).toBe(2);
    });

    it('should return 0 for all used codes', () => {
      const storedCodes = JSON.stringify([
        { code: 'ABCD1234', used: true },
        { code: 'EFGH5678', used: true },
      ]);

      const count = backupCodesService.countRemainingCodes(storedCodes);

      expect(count).toBe(0);
    });

    it('should return 0 for empty array', () => {
      const storedCodes = JSON.stringify([]);
      const count = backupCodesService.countRemainingCodes(storedCodes);
      expect(count).toBe(0);
    });
  });
});
