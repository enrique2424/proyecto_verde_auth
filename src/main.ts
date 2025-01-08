import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function main() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.CORS.split(','),
  });
  await app.listen(process.env.PORT);
}
main();
