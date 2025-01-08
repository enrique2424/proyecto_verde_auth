import { Module } from '@nestjs/common';
import { EmailService } from './mail.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [EmailService],
  exports: [EmailService], // Exporta el servicio para que esté disponible en otros módulos
})
export class EmailModule {}
