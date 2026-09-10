import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { SessionsService } from './sessions.service';
import { Session } from './entities/session.entity';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

describe('SessionsService', () => {
  let service: SessionsService;
  let repository: Repository<Session>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        {
          provide: getRepositoryToken(Session),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
    repository = module.get<Repository<Session>>(getRepositoryToken(Session));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRefreshToken', () => {
    it('should create and store a hashed refresh token', async () => {
      const mockSession = { id: 'session-uuid', refreshToken: 'hashed' };
      jest.spyOn(repository, 'create').mockReturnValue(mockSession as any);
      jest.spyOn(repository, 'save').mockResolvedValue(mockSession as any);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-token');

      const result = await service.createRefreshToken(
        'user-uuid',
        'device',
        '127.0.0.1',
      );

      expect(result).toBeDefined();
      expect(repository.create).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('validateRefreshToken', () => {
    it('should return true for valid non-expired token', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const mockSession = { refreshToken: 'hashed', expiresAt: futureDate };
      jest.spyOn(repository, 'find').mockResolvedValue([mockSession as any]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateRefreshToken('user-uuid', 'plain-token');

      expect(result).toBe(true);
    });

    it('should return false for expired token', async () => {
      const pastDate = new Date(Date.now() - 1000);
      const mockSession = { refreshToken: 'hashed', expiresAt: pastDate };
      jest.spyOn(repository, 'find').mockResolvedValue([mockSession as any]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateRefreshToken('user-uuid', 'plain-token');

      expect(result).toBe(false);
    });
  });

  describe('revokeSession', () => {
    it('should revoke the session matching the token', async () => {
      const mockSession = {
        id: 'session-uuid',
        isRevoked: false,
        refreshToken: 'hashed',
      };
      jest.spyOn(repository, 'find').mockResolvedValue([mockSession as any]);
      jest
        .spyOn(repository, 'save')
        .mockResolvedValue({ ...mockSession, isRevoked: true } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.revokeSession('user-uuid', 'plain-token');

      expect(repository.save).toHaveBeenCalled();
    });
  });
});
