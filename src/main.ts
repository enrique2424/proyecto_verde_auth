import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function main() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.CORS.split(','),
  });
  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('API Documentación')
    .setDescription('Documentación de la API con Swagger')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document); // El endpoint de Swagger será /api

  console.log('escuchando el puerto: ', process.env.PORT);
  await app.listen(process.env.PORT);
}
main();
