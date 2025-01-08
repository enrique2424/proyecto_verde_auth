import { PartialType } from '@nestjs/mapped-types';
import { CreateAuthDto } from './create-auth.dto';
import { Type } from 'class-transformer';
import { IsString } from 'class-validator';

export class TestDto extends PartialType(CreateAuthDto) {
  @Type(() => String)
  @IsString()
  readonly pIntExisteError: string;

  @Type(() => String)
  @IsString()
  readonly pStrMensajeError: string;
}
