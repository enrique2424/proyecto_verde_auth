import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { JwtPayLoad } from './interfaces/jwt-payload.interface';

describe('JwtStrategy', () => {
  let jwtStrategy: JwtStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('mockJwtSecret'),
          },
        },
      ],
    }).compile();

    jwtStrategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('should be defined', () => {
    expect(jwtStrategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return userId and email from payload', async () => {
      const mockPayload: JwtPayLoad = {
        sub: 'user-123',
        email: 'test@example.com',
        type: 'access',
        iat: Date.now(),
        exp: Date.now() + 900000,
      };
      const result = jwtStrategy.validate(mockPayload);

      expect(result).toEqual({ userId: 'user-123', email: 'test@example.com' });
    });
  });
});
