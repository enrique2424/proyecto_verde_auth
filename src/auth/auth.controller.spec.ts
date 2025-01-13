import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { HttpStatus } from '@nestjs/common';
import { Response } from 'express';

describe('AuthController', () => {
  let authController: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    loginSGC: jest.fn(),
    verifySGC: jest.fn(),
  };

  const mockResponse = () => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnThis();
    res.set = jest.fn().mockReturnThis();
    res.send = jest.fn().mockReturnThis();
    return res as Response;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    authController = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(authController).toBeDefined();
    expect(authService).toBeDefined();
  });

  describe('loginSGC', () => {
    it('should return a successful response when login succeeds', async () => {
      const mockRequest = {
        headers: { xxpm: 'mock-token', 'user-agent': 'mock-user-agent' },
      };
      const mockBody = { xxh1: 'testUser', xx99: 'testPassword' };
      const mockIp = '127.0.0.1';
      const mockResult = { success: true, token: 'mock-token' };
      const res = mockResponse();

      mockAuthService.loginSGC.mockResolvedValue(mockResult);

      await authController.loginSGC(mockIp, mockRequest, res, mockBody);

      expect(authService.loginSGC).toHaveBeenCalledWith({
        user: mockBody.xxh1,
        password: mockBody.xx99,
        tokenUnique: mockRequest.headers['xxpm'],
        ip: mockIp,
        userAgent: mockRequest.headers['user-agent'],
      });
      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.set).toHaveBeenCalledWith({ xx14: '11' });
      expect(res.send).toHaveBeenCalledWith(mockResult);
    });

    it('should return an unauthorized response when login fails', async () => {
      const mockRequest = {
        headers: { xxpm: 'mock-token', 'user-agent': 'mock-user-agent' },
      };
      const mockBody = { xxh1: 'testUser', xx99: 'testPassword' };
      const mockIp = '127.0.0.1';
      const mockResult = { success: false };
      const res = mockResponse();

      mockAuthService.loginSGC.mockResolvedValue(mockResult);

      await authController.loginSGC(mockIp, mockRequest, res, mockBody);

      expect(authService.loginSGC).toHaveBeenCalledWith({
        user: mockBody.xxh1,
        password: mockBody.xx99,
        tokenUnique: mockRequest.headers['xxpm'],
        ip: mockIp,
        userAgent: mockRequest.headers['user-agent'],
      });
      expect(res.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(res.send).toHaveBeenCalledWith({
        success: 'false',
        message: 'Problemas de conexión',
      });
    });
  });

  describe('verifySGC', () => {
    it('should call verifySGC and return its response', async () => {
      const mockBody = { token: 'testToken' };
      const mockResult = { valid: true };

      mockAuthService.verifySGC.mockResolvedValue(mockResult);

      const result = await authController.verifySGC(mockBody);

      expect(authService.verifySGC).toHaveBeenCalledWith(mockBody.token);
      expect(result).toEqual(mockResult);
    });
  });
});
