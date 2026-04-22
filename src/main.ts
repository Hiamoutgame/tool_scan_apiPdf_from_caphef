import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '0.0.0.0';

  const swaggerConfig = new DocumentBuilder()
    .setTitle('CafeF Crawlbot API')
    .setDescription('API for crawling CafeF report lists and downloading PDFs')
    .setVersion('1.0.0')
    .build();

  const openApiDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('swagger', app, openApiDocument);

  console.log(`Starting server on ${host}:${port}...`);
  await app.listen(port, host);
  const logHost = host === '0.0.0.0' ? 'localhost' : host;
  const swaggerUrl = `http://${logHost}:${port}/swagger`;
  console.log(`Swagger docs: ${swaggerUrl}`);
}
void bootstrap();
