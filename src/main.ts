import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('CafeF Crawlbot API')
    .setDescription('API for crawling CafeF report lists and downloading PDFs')
    .setVersion('1.0.0')
    .build();

  const openApiDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('swagger', app, openApiDocument);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
