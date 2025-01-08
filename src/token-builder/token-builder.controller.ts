import { Controller } from '@nestjs/common';
import { TokenBuilderService } from './token-builder.service';

@Controller('token-builder')
export class TokenBuilderController {
  constructor(private readonly tokenBuilderService: TokenBuilderService) {}
}
