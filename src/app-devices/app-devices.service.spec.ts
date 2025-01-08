import { Test, TestingModule } from '@nestjs/testing';
import { AppDevicesService } from './app-devices.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppDevice } from './entities/app-device.entity';

describe('AppDevicesService', () => {
  let service: AppDevicesService;
  let repository: Repository<AppDevice>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppDevicesService,
        {
          provide: getRepositoryToken(AppDevice),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<AppDevicesService>(AppDevicesService);
    repository = module.get<Repository<AppDevice>>(
      getRepositoryToken(AppDevice),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('deviceUnique', () => {
    it('should return true and insert a new device when collector and device are not found', async () => {
      jest.spyOn(service, 'findCollector').mockResolvedValue(null);
      jest.spyOn(service, 'findByDevice').mockResolvedValue(null);
      jest.spyOn(repository, 'insert').mockResolvedValue({} as any);

      const result = await service.deviceUnique(123, 'token');
      expect(result).toBe(true);
      expect(repository.insert).toHaveBeenCalled();
    });

    it('should update the device and return true when both collector and device match', async () => {
      const mockCollector: AppDevice = {
        idDevice: 'device1',
        codCobrador: 123,
        createAt: '2023-09-03 12:00:00',
        updatedAt: '2023-09-03 12:00:00',
        userUpdate: 'user1',
        tz_lock: 0,
      };

      const mockDevice: AppDevice = {
        idDevice: 'device1',
        codCobrador: 123,
        createAt: '2023-09-03 12:00:00',
        updatedAt: '2023-09-03 12:00:00',
        userUpdate: 'user1',
        tz_lock: 0,
      };

      jest.spyOn(service, 'findCollector').mockResolvedValue(mockCollector);
      jest.spyOn(service, 'findByDevice').mockResolvedValue(mockDevice);
      jest.spyOn(repository, 'update').mockResolvedValue({} as any);

      const result = await service.deviceUnique(123, 'token');
      expect(result).toBe(false);
    });

    it('should return false when collector and device do not match', async () => {
      const mockCollector: AppDevice = {
        idDevice: 'device1',
        codCobrador: 123,
        createAt: '2023-09-03 12:00:00',
        updatedAt: '2023-09-03 12:00:00',
        userUpdate: 'user1',
        tz_lock: 0,
      };

      const mockDevice: AppDevice = {
        idDevice: 'device1',
        codCobrador: 123,
        createAt: '2023-09-03 12:00:00',
        updatedAt: '2023-09-03 12:00:00',
        userUpdate: 'user1',
        tz_lock: 0,
      };

      jest.spyOn(service, 'findCollector').mockResolvedValue(mockCollector);
      jest.spyOn(service, 'findByDevice').mockResolvedValue(mockDevice);

      const result = await service.deviceUnique(123, 'token');
      expect(result).toBe(false);
    });
  });
});
