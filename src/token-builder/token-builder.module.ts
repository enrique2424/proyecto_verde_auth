import { Module } from '@nestjs/common';
import { TokenBuilderService } from './token-builder.service';
import { TokenBuilderController } from './token-builder.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  controllers: [TokenBuilderController],
  imports: [ConfigModule],
  providers: [TokenBuilderService],
  exports: [TokenBuilderService],
})
export class TokenBuilderModule {}
