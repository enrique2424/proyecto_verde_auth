import { IsString, IsNotEmpty } from 'class-validator';

export class MfaDisableDto {
  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  code: string;
}

export class MfaStatusDto {
  mfaEnabled: boolean;
  backupCodesRemaining: number;
  lastVerified: Date | null;
}
