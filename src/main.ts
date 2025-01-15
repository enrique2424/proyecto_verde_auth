import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function main() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.CORS.split(','),
  });
  console.log('escuchando el puerto: ', process.env.PORT);
  await app.listen(process.env.PORT);
}
main();
