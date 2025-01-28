import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { TokenBuilderService } from 'src/token-builder/token-builder.service';
import { TokenCryptService } from './token-crypt/token-crypt.service';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Usuarios } from './entities/usuarios.entity';
import { TokenUnique } from './entities/token_unique.entity';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let tokenCryptService: TokenCryptService;

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
    tokenCryptService = module.get<TokenCryptService>(TokenCryptService);
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

  it('should handle verification errors', async () => {
    const token = 'mockToken';
    jest.spyOn(jwtService, 'verify').mockImplementation(() => {
      throw new Error('Invalid token');
    });
    jest
      .spyOn(tokenCryptService, 'decode')
      .mockResolvedValue(Buffer.from(token, 'base64'));

    const result = await service.verifySGC(token);

    expect(result).toEqual({
      status: false,
      message: 'Token Invalido',
    });
  });

  it('should build result from user SGC', async () => {
    const resultQuery = {
      Name: 'Test User SGC',
      CodUser: 1,
      IdBanca: 1,
      Banca: 'Banca',
      IdPlaza: 1,
      Plaza: 'SCZ',
      IdOficina: 1,
      Oficina: 'Central',
      Role: 'Admin',
      RoleId: 1,
      Objetivo: 60,
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
      idBanca: resultQuery.IdBanca,
      banca: resultQuery.Banca,
      idPlaza: resultQuery.IdPlaza,
      plaza: resultQuery.Plaza,
      idOficina: resultQuery.IdOficina,
      oficina: resultQuery.Oficina,
      role: resultQuery.Role,
      roleId: resultQuery.RoleId,
      Objetivo: resultQuery.Objetivo,
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
          xz20: Buffer.from(resultQuery.CodUser.toString(), 'binary').toString(
            'base64',
          ),
          xv10: Buffer.from(resultQuery.IdBanca.toString(), 'binary').toString(
            'base64',
          ),
          xt11: Buffer.from(resultQuery.Banca.toString(), 'binary').toString(
            'base64',
          ),
          xa30: Buffer.from(resultQuery.IdPlaza.toString(), 'binary').toString(
            'base64',
          ),
          xr51: Buffer.from(resultQuery.Plaza.toString(), 'binary').toString(
            'base64',
          ),
          xm21: Buffer.from(
            resultQuery.IdOficina.toString(),
            'binary',
          ).toString('base64'),
          xd65: Buffer.from(resultQuery.Oficina.toString(), 'binary').toString(
            'base64',
          ),
          xy15: Buffer.from(resultQuery.Role.toString(), 'binary').toString(
            'base64',
          ),
          xr22: Buffer.from(resultQuery.Objetivo.toString(), 'binary').toString(
            'base64',
          ),
        },
      },
    });
  });
});
