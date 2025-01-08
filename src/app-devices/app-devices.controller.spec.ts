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

  describe('findCollector', () => {
    it('should return a collector when found', async () => {
      const mockCollector = { codCobrador: 123, idDevice: 'device1' };
      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockCollector),
      } as any);

      const result = await service.findCollector(123);
      expect(result).toEqual(mockCollector);
    });

    it('should throw an error when there is an exception', async () => {
      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockRejectedValue(new Error('DB Error')),
      } as any);

      await expect(service.findCollector(123)).rejects.toThrow(
        'se produjo el siguiente errorError: DB Error',
      );
    });
  });

  describe('findByDevice', () => {
    it('should return a device when found', async () => {
      const mockDevice = { codCobrador: 123, idDevice: 'device1' };
      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockDevice),
      } as any);

      const result = await service.findByDevice('device1');
      expect(result).toEqual(mockDevice);
    });

    it('should throw an error when there is an exception', async () => {
      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockRejectedValue(new Error('DB Error')),
      } as any);

      await expect(service.findByDevice('device1')).rejects.toThrow(
        'se produjo el siguiente errorError: DB Error',
      );
    });
  });
});
