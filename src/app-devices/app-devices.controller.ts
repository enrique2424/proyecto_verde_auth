import { Controller } from '@nestjs/common';
import { AppDevicesService } from './app-devices.service';

@Controller('app-devices')
export class AppDevicesController {
  constructor(private readonly appDevicesService: AppDevicesService) {}
}
