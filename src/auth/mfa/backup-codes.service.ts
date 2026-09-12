import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

export interface BackupCode {
  code: string;
  used: boolean;
  usedAt?: Date;
}

@Injectable()
export class BackupCodesService {
  private readonly CODE_LENGTH = 8;
  private readonly CODE_COUNT = 8;

  generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < this.CODE_COUNT; i++) {
      const code = randomBytes(this.CODE_LENGTH)
        .toString('hex')
        .substring(0, this.CODE_LENGTH)
        .toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  parseBackupCodes(storedCodes: string): BackupCode[] {
    try {
      return JSON.parse(storedCodes);
    } catch {
      return [];
    }
  }

  stringifyBackupCodes(codes: BackupCode[]): string {
    return JSON.stringify(codes);
  }

  validateBackupCode(
    storedCodes: string,
    inputCode: string,
  ): { valid: boolean; remainingCodes: BackupCode[] } {
    const codes = this.parseBackupCodes(storedCodes);
    const upperInput = inputCode.toUpperCase();

    const codeIndex = codes.findIndex(
      (c) => c.code === upperInput && !c.used,
    );

    if (codeIndex === -1) {
      return { valid: false, remainingCodes: codes };
    }

    codes[codeIndex] = {
      ...codes[codeIndex],
      used: true,
      usedAt: new Date(),
    };

    return { valid: true, remainingCodes: codes };
  }

  countRemainingCodes(storedCodes: string): number {
    const codes = this.parseBackupCodes(storedCodes);
    return codes.filter((c) => !c.used).length;
  }
}
