import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TokenBuilderService } from './token-builder.service';
import axios from 'axios';
import { btoa } from 'js-base64';

jest.mock('axios');

describe('TokenBuilderService', () => {
  let service: TokenBuilderService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenBuilderService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              switch (key) {
                case 'URL_TOKEN_BUILDER':
                  return 'https://mockurl.com';
                default:
                  return null;
              }
            }),
          },
        },
      ],
    }).compile();

    service = module.get<TokenBuilderService>(TokenBuilderService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    const mockUser = 'testuser';
    const mockPassword = 'password';
    const mockResponse = { data: { token: 'mocktoken' } };
    const mockErrorResponse = {
      response: {
        status: 401,
        data: { message: 'Unauthorized' },
      },
    };

    it('should call axios with correct URL and headers', async () => {
      (axios.get as jest.Mock).mockResolvedValue(mockResponse);
      const result = await service.login(mockUser, mockPassword);

      expect(configService.get).toHaveBeenCalledWith('URL_TOKEN_BUILDER');
      expect(axios.get).toHaveBeenCalledWith('https://mockurl.com', {
        headers: {
          Authorization: 'Basic ' + btoa(mockUser + ':' + mockPassword),
        },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle 401 error and return error message', async () => {
      (axios.get as jest.Mock).mockRejectedValue(mockErrorResponse);
      const result = await service.login(mockUser, mockPassword);

      expect(result).toEqual({
        success: false,
        error: 401,
        message: 'Unauthorized',
      });
    });
  });
});
