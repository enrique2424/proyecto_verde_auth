import { PartialType } from '@nestjs/mapped-types';
import { CreateAppDeviceDto } from './create-app-device.dto';

export class UpdateAppDeviceDto extends PartialType(CreateAppDeviceDto) {}
