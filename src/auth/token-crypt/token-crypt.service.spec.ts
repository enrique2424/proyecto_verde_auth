import { Test, TestingModule } from '@nestjs/testing';
import { TokenCryptService } from './token-crypt.service';

describe('TokenCryptService', () => {
  let service: TokenCryptService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TokenCryptService],
    }).compile();

    service = module.get<TokenCryptService>(TokenCryptService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
