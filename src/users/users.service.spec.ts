import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

describe('UsersService', () => {
  let service: UsersService;
  let repository: Repository<User>;

  const mockUser: Partial<User> = {
    id: 'user-uuid',
    email: 'test@test.com',
    passwordHash: '$2b$10$hashedpassword',
    isActive: true,
    failedAttempts: 0,
    lockedUntil: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockUser as User);

      const result = await service.findByEmail('test@test.com');

      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      const result = await service.findByEmail('notfound@test.com');

      expect(result).toBeNull();
    });
  });

  describe('validatePassword', () => {
    it('should return true for valid password', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validatePassword(mockUser as User, 'password123');

      expect(result).toBe(true);
    });

    it('should return false for invalid password', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validatePassword(mockUser as User, 'wrongpassword');

      expect(result).toBe(false);
    });
  });

  describe('incrementFailedAttempts', () => {
    it('should increment failed attempts and lock after 5 attempts', async () => {
      const userWith4Attempts = { ...mockUser, failedAttempts: 4 };
      jest.spyOn(repository, 'save').mockResolvedValue(userWith4Attempts as User);

      await service.incrementFailedAttempts(userWith4Attempts as User);

      expect(repository.save).toHaveBeenCalled();
      expect(userWith4Attempts.lockedUntil).toBeDefined();
    });
  });
});
