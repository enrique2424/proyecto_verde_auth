import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createLokiLogger } from './common/logging';

async function main() {
  const logger = createLokiLogger();

  const app = await NestFactory.create(AppModule, {
    logger,
  });

  app.enableCors({
    origin: process.env.CORS.split(','),
  });

  await app.listen(process.env.PORT);

  logger.info('Banco Verde IAM started', {
    port: process.env.PORT,
    environment: process.env.NODE_ENV || 'development',
  });
}
main();
