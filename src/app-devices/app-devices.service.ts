import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { AppDevice } from './entities/app-device.entity';

const moment = require('moment');

@Injectable()
export class AppDevicesService {
  constructor(
    @InjectRepository(AppDevice)
    private readonly appDevice: Repository<AppDevice>,
  ) {}
  async findCollector(codCobrador: number) {
    try {
      return await this.appDevice
        .createQueryBuilder()
        .where('tz_lock=:tz_lock', { tz_lock: 0 })
        .andWhere('cod_cobrador = :codCobrador', { codCobrador })
        .getOne();
    } catch (error) {
      throw new Error('se produjo el siguiente error' + error);
    }
  }

  async findByDevice(idDevice: string) {
    try {
      const result = await this.appDevice
        .createQueryBuilder()
        .where('tz_lock=:tz_lock', { tz_lock: 0 })
        .andWhere('id_devices = :idDevice', { idDevice })
        .getOne();
      return result;
    } catch (error) {
      throw new Error('se produjo el siguiente error' + error);
    }
  }

  async deviceUnique(idCobrador: number, tokenUnique: string) {
    const idDevice = tokenUnique.substring(192, 256);
    const collector = await this.findCollector(idCobrador);
    const device = await this.findByDevice(idDevice);
    if (!collector && !device) {
      const app = new AppDevice();
      app.codCobrador = idCobrador;
      app.idDevice = idDevice;
      app.tz_lock = 0;
      const result = await this.appDevice.insert(app);
      if (result) return true;
    } else {
      if (
        collector &&
        collector.codCobrador == idCobrador &&
        collector.idDevice == idDevice &&
        device &&
        device.idDevice == idDevice &&
        device.codCobrador == idCobrador
      ) {
        await this.appDevice.update(
          {
            tz_lock: 0,
            idDevice: collector.idDevice,
            codCobrador: collector.codCobrador,
          },
          {
            updatedAt: moment().format('YYYY-MM-DD HH:mm:ss'),
          },
        );
        return true;
      } else {
        return false;
      }
    }
  }
}
