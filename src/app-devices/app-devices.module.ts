import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { AppDevicesController } from './app-devices.controller';
import { AppDevicesService } from './app-devices.service';
import { AppDevice } from './entities/app-device.entity';

@Module({
  controllers: [AppDevicesController],
  providers: [AppDevicesService],
  imports: [ConfigModule, TypeOrmModule.forFeature([AppDevice])],
  exports: [AppDevicesService],
})
export class AppDevicesModule {}
