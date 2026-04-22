import { Module } from '@nestjs/common';
import { OcrMarkdownController } from '../controller/ocr-markdown.controller';
import { OcrMarkdownService } from '../services/ocr-markdown.service';

@Module({
  controllers: [OcrMarkdownController],
  providers: [OcrMarkdownService],
  exports: [OcrMarkdownService],
})
export class OcrModule {}
