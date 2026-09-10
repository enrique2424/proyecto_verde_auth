import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { SessionsService } from '../sessions/sessions.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { JwtAuthService } from './jwt/jwt.service';
import { TokenCryptService } from './token-crypt/token-crypt.service';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let sessionsService: SessionsService;
  let jwtAuthService: JwtAuthService;

  const mockUser = {
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
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            validatePassword: jest.fn(),
            incrementFailedAttempts: jest.fn(),
            resetFailedAttempts: jest.fn(),
          },
        },
        {
          provide: SessionsService,
          useValue: {
            createRefreshToken: jest.fn(),
            validateRefreshToken: jest.fn(),
            revokeSession: jest.fn(),
          },
        },
        {
          provide: AuditLogService,
          useValue: {
            log: jest.fn(),
          },
        },
        {
          provide: JwtAuthService,
          useValue: {
            generateAccessToken: jest.fn(),
            generateRefreshToken: jest.fn(),
            verifyAccessToken: jest.fn(),
            verifyRefreshToken: jest.fn(),
          },
        },
        {
          provide: TokenCryptService,
          useValue: {
            encode: jest.fn(),
            decode: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, any> = {
                MAX_LOGIN_ATTEMPTS: 5,
                LOCKOUT_DURATION_MINUTES: 15,
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    sessionsService = module.get<SessionsService>(SessionsService);
    jwtAuthService = module.get<JwtAuthService>(JwtAuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser as any);
      jest.spyOn(usersService, 'validatePassword').mockResolvedValue(true);
      jest
        .spyOn(sessionsService, 'createRefreshToken')
        .mockResolvedValue('refresh-token');
      jest
        .spyOn(jwtAuthService, 'generateAccessToken')
        .mockReturnValue('access-token');
      jest
        .spyOn(jwtAuthService, 'generateRefreshToken')
        .mockReturnValue({ token: 'refresh-token', jti: 'jti' });

      const result = await service.login(
        { email: 'test@test.com', password: 'password123' },
        '127.0.0.1',
        'Mozilla/5.0',
      );

      expect(result.success).toBe(true);
      expect(result.data.accessToken).toBe('access-token');
      expect(result.data.refreshToken).toBe('refresh-token');
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(null);

      await expect(
        service.login(
          { email: 'test@test.com', password: 'wrong' },
          '127.0.0.1',
          'Mozilla',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw LockedException for locked account', async () => {
      const lockedUser = { ...mockUser, lockedUntil: new Date(Date.now() + 60000) };
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(lockedUser as any);

      await expect(
        service.login(
          { email: 'test@test.com', password: 'password' },
          '127.0.0.1',
          'Mozilla',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      jest
        .spyOn(jwtAuthService, 'verifyRefreshToken')
        .mockReturnValue({ sub: 'user-uuid', jti: 'jti', type: 'refresh' as const });
      jest
        .spyOn(sessionsService, 'validateRefreshToken')
        .mockResolvedValue(true);
      jest.spyOn(usersService, 'findById').mockResolvedValue(mockUser as any);
      jest
        .spyOn(jwtAuthService, 'generateAccessToken')
        .mockReturnValue('new-access-token');
      jest
        .spyOn(jwtAuthService, 'generateRefreshToken')
        .mockReturnValue({ token: 'new-refresh-token', jti: 'new-jti' });

      const result = await service.refresh(
        'valid-refresh-token',
        '127.0.0.1',
        'Mozilla',
      );

      expect(result.success).toBe(true);
      expect(result.data.accessToken).toBe('new-access-token');
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      jest.spyOn(sessionsService, 'revokeSession').mockResolvedValue(undefined);

      const result = await service.logout(
        'refresh-token',
        'user-uuid',
        '127.0.0.1',
        'Mozilla',
      );

      expect(result.success).toBe(true);
      expect(sessionsService.revokeSession).toHaveBeenCalledWith(
        'user-uuid',
        'refresh-token',
      );
    });
  });
});
