import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CrawlerModule } from './modules/crawler.module';
import { OcrModule } from './modules/ocr.module';
import { StorageModule } from './modules/storage.module';

@Module({
  imports: [CrawlerModule, OcrModule, StorageModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
