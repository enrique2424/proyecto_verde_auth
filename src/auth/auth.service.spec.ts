import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { TokenBuilderService } from 'src/token-builder/token-builder.service';
import { TokenCryptService } from './token-crypt/token-crypt.service';
import { AppDevicesService } from 'src/app-devices/app-devices.service';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Usuarios } from './entities/usuarios.entity';
import { TokenUnique } from './entities/token_unique.entity';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let tokenBuilderService: TokenBuilderService;
  let tokenCryptService: TokenCryptService;
  let appDevicesService: AppDevicesService;
  let configService: ConfigService;
  let usuarioRepository: Repository<Usuarios>;
  let tokenUniqueRepository: Repository<TokenUnique>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: TokenBuilderService,
          useValue: {
            login: jest.fn(),
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
          provide: AppDevicesService,
          useValue: {
            deviceUnique: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {},
        },
        {
          provide: 'UsuariosRepository',
          useClass: Repository,
        },
        {
          provide: 'TokenUniqueRepository',
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    tokenBuilderService = module.get<TokenBuilderService>(TokenBuilderService);
    tokenCryptService = module.get<TokenCryptService>(TokenCryptService);
    appDevicesService = module.get<AppDevicesService>(AppDevicesService);
    configService = module.get<ConfigService>(ConfigService);
    usuarioRepository = module.get<Repository<Usuarios>>('UsuariosRepository');
    tokenUniqueRepository = module.get<Repository<TokenUnique>>(
      'TokenUniqueRepository',
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should build token', () => {
    const payload = { userId: 1 };
    const token = 'mockToken';
    jest.spyOn(jwtService, 'sign').mockReturnValue(token);

    const result = (service as any)['builtToken'](payload);

    expect(jwtService.sign).toHaveBeenCalledWith(payload);
    expect(result).toBe(token);
  });

  it('should build result from user', async () => {
    const resultQuery = {
      Name: 'Test User',
      CodCollector: 1,
      Id: 'testuser',
      RoleId: 1,
      ip: '127.0.0.1',
      userAgent: 'Mozilla',
    };
    const mockToken = 'mockToken';
    const mockEncodedToken = Buffer.from(mockToken).toString('base64');
    const mockEncode = Buffer.from(mockToken).toString('base64');

    jest.spyOn(jwtService, 'sign').mockReturnValue(mockToken);
    jest
      .spyOn(tokenCryptService, 'encode')
      .mockResolvedValue(Buffer.from(mockToken));
    jest.spyOn(service, 'updTKN').mockResolvedValue(undefined);

    const result = await (service as any)['buildResultFromUser'](resultQuery);

    expect(jwtService.sign).toHaveBeenCalledWith({
      name: resultQuery.Name,
      collectorId: resultQuery.CodCollector,
      id: resultQuery.Id,
      roleId: resultQuery.RoleId,
      ip: resultQuery.ip,
      userAgent: resultQuery.userAgent,
    });
    expect(tokenCryptService.encode).toHaveBeenCalledWith(mockToken);
    expect(result).toEqual({
      success: true,
      data: {
        token: mockEncodedToken,
        userDetails: {
          name: resultQuery.Name,
          xx24: Buffer.from(resultQuery.RoleId.toString(), 'binary').toString(
            'base64',
          ),
        },
      },
    });
  });

  it('should handle verification errors', async () => {
    const token = 'mockToken';
    jest.spyOn(jwtService, 'verify').mockImplementation(() => {
      throw new Error('Invalid token');
    });
    jest
      .spyOn(tokenCryptService, 'decode')
      .mockResolvedValue(Buffer.from(token, 'base64'));

    const result = await service.verify(token);

    expect(result).toEqual({
      status: false,
      message: 'Token Invalido',
    });
  });

  it('should build result from user SGC', async () => {
    const resultQuery = {
      Name: 'Test User SGC',
      CodUser: 1,
      Role: 'Admin',
      RoleId: 1,
      ip: '127.0.0.1',
      userAgent: 'Mozilla',
    };
    const mockToken = 'mockToken';
    const mockEncodedToken = Buffer.from(mockToken).toString('base64');
    const mockEncode = Buffer.from(mockToken).toString('base64');

    jest.spyOn(jwtService, 'sign').mockReturnValue(mockToken);
    jest
      .spyOn(tokenCryptService, 'encode')
      .mockResolvedValue(Buffer.from(mockToken));
    jest.spyOn(service, 'updTKNSGC').mockResolvedValue(undefined);

    const result = await (service as any)['buildResultFromUserSGC'](
      resultQuery,
    );

    expect(jwtService.sign).toHaveBeenCalledWith({
      name: resultQuery.Name,
      codUser: resultQuery.CodUser,
      role: resultQuery.Role,
      roleId: resultQuery.RoleId,
      ip: resultQuery.ip,
      userAgent: resultQuery.userAgent,
    });
    expect(tokenCryptService.encode).toHaveBeenCalledWith(mockToken);
    expect(result).toEqual({
      success: true,
      data: {
        token: mockEncodedToken,
        userDetails: {
          name: resultQuery.Name,
          xx24: Buffer.from(resultQuery.RoleId.toString(), 'binary').toString(
            'base64',
          ),
          xy15: Buffer.from(resultQuery.Role, 'binary').toString('base64'),
        },
      },
    });
  });
});
