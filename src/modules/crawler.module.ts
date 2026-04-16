import { Module } from '@nestjs/common';
import { CrawlerController } from '../controller/crawler.controller';
import { DownloadController } from '../controller/download.controller';
import { CrawlerService } from '../services/crawler.service';

@Module({
  controllers: [CrawlerController, DownloadController],
  providers: [CrawlerService],
  exports: [CrawlerService],
})
export class CrawlerModule {}
