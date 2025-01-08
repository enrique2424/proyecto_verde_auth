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
            login: jest.fn(),
            loginApp: jest.fn(),
            loginRRJJ: jest.fn(),
            verify: jest.fn(),
            verifyRRJJ: jest.fn(),
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

  it('should return a token on successful login', async () => {
    const mockResponse = {
      success: true,
      token: 'mockToken',
    };
    jest.spyOn(authService, 'login').mockResolvedValue(mockResponse);

    const mockReq = { headers: { 'user-agent': 'Mozilla', xxpm: 'mockToken' } };
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    const body = { xxh1: 'user', xx99: 'password' };

    await controller.login('127.0.0.1', mockReq, mockRes, body);

    expect(authService.login).toHaveBeenCalledWith({
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

  it('should return unauthorized on failed login', async () => {
    const mockResponse = {
      success: false,
    };
    jest.spyOn(authService, 'login').mockResolvedValue(mockResponse);

    const mockReq = { headers: { 'user-agent': 'Mozilla', xxpm: 'mockToken' } };
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    const body = { xxh1: 'user', xx99: 'password' };

    await controller.login('127.0.0.1', mockReq, mockRes, body);

    expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: 'false',
      message: 'Problemas de conexión',
    });
  });

  it('should return a token on successful loginApp', async () => {
    const mockResponse = {
      success: true,
      token: 'mockTokenApp',
    };
    jest.spyOn(authService, 'loginApp').mockResolvedValue(mockResponse);

    const mockReq = { headers: { 'user-agent': 'Mozilla', xxpm: 'mockToken' } };
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    const body = { xxh1: 'userApp', xx99: 'passwordApp' };

    await controller.loginApp('127.0.0.1', mockReq, mockRes, body);

    expect(authService.loginApp).toHaveBeenCalledWith({
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

  it('should return a token on successful loginRRJJ', async () => {
    const mockResponse = {
      success: true,
      token: 'mockTokenRRJJ',
    };
    jest.spyOn(authService, 'loginRRJJ').mockResolvedValue(mockResponse);

    const mockReq = { headers: { 'user-agent': 'Mozilla', xxpm: 'mockToken' } };
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    const body = { xxh1: 'userRRJJ', xx99: 'passwordRRJJ' };

    await controller.loginRRJJ('127.0.0.1', mockReq, mockRes, body);

    expect(authService.loginRRJJ).toHaveBeenCalledWith({
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
