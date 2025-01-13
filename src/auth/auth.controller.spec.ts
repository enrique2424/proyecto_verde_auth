import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { HttpStatus } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            loginSGC: jest.fn(),
            verify: jest.fn(),
            verifySGC: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return a token on successful loginSGC', async () => {
    const mockResponse = {
      success: true,
      token: 'mockTokenSGC',
    };
    jest.spyOn(authService, 'loginSGC').mockResolvedValue(mockResponse);

    const mockReq = { headers: { 'user-agent': 'Mozilla', xxpm: 'mockToken' } };
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    const body = { xxh1: 'userSGC', xx99: 'passwordSGC' };

    await controller.loginSGC('127.0.0.1', mockReq, mockRes, body);

    expect(authService.loginSGC).toHaveBeenCalledWith({
      user: body.xxh1,
      password: body.xx99,
      tokenUnique: mockReq.headers['xxpm'],
      ip: '127.0.0.1',
      userAgent: mockReq.headers['user-agent'],
    });
    expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(mockRes.set).toHaveBeenCalledWith({ xx14: '11' });
    expect(mockRes.send).toHaveBeenCalledWith(mockResponse);
  });
});
