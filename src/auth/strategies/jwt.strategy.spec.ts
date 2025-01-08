import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { JwtPayLoad } from './interfaces/jwt-payload.interface';
import { UnauthorizedException } from '@nestjs/common';

describe('JwtStrategy', () => {
  let jwtStrategy: JwtStrategy;
  let configService: ConfigService;

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
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(jwtStrategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return the name from the payload', async () => {
      const mockPayload: JwtPayLoad = {
        name: 'testUser',
        collectorId: 1,
        id: '123',
        roleId: 2,
      };
      const result = jwtStrategy.validate(mockPayload);

      expect(result).toEqual(mockPayload.name);
    });

    it('should throw an UnauthorizedException if the payload is invalid', async () => {
      const invalidPayload: JwtPayLoad = {
        name: '', // Simulating an invalid name
        collectorId: 1,
        id: '123',
        roleId: 2,
      };
      try {
        jwtStrategy.validate(invalidPayload);
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
      }
    });
  });
});
