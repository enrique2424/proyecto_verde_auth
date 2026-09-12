import { IsString, IsNotEmpty } from 'class-validator';

export class MfaVerifySetupDto {
  @IsString()
  @IsNotEmpty()
  code: string;
}

export class MfaVerifyDto {
  @IsString()
  @IsNotEmpty()
  tempToken: string;

  @IsString()
  @IsNotEmpty()
  code: string;
}

export class MfaVerifyBackupDto {
  @IsString()
  @IsNotEmpty()
  tempToken: string;

  @IsString()
  @IsNotEmpty()
  backupCode: string;
}
