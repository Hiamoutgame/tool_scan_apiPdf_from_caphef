import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ConvertOcrJsonToMarkdownResponse } from '../models/ocr.types';
import { OcrMarkdownService } from '../services/ocr-markdown.service';

interface RawConvertOcrQuery {
  input?: string;
  output?: string;
  overwrite?: string;
}

@Controller('ocr')
@ApiTags('ocr')
export class OcrMarkdownController {
  constructor(private readonly ocrMarkdownService: OcrMarkdownService) {}

  @Get('markdown')
  @ApiOperation({
    summary: 'Convert OCR JSON to a Markdown file',
    description:
      'Reads an OCR JSON file, converts extracted_markdown into a real Markdown document, and saves it locally.',
  })
  @ApiQuery({
    name: 'input',
    required: true,
    type: String,
    description: 'Relative path to OCR JSON file.',
    example: 'asset/a.json',
  })
  @ApiQuery({
    name: 'output',
    required: false,
    type: String,
    description:
      'Relative output path for the Markdown file. Defaults to the same name as the input with .md extension.',
    example: 'asset/a.md',
  })
  @ApiQuery({
    name: 'overwrite',
    required: false,
    type: String,
    description:
      'When true, overwrite existing Markdown file. Default is false.',
    example: 'true',
  })
  @ApiOkResponse({
    description: 'OCR JSON converted to Markdown successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters or OCR JSON input.',
  })
  async convertToMarkdown(
    @Query() query: RawConvertOcrQuery,
  ): Promise<ConvertOcrJsonToMarkdownResponse> {
    return this.ocrMarkdownService.convertJsonFileToMarkdown({
      inputPath: query.input ?? '',
      outputPath: query.output,
      overwrite: this.parseBoolean(query.overwrite, false),
    });
  }

  private parseBoolean(
    rawValue: string | undefined,
    defaultValue: boolean,
  ): boolean {
    if (rawValue === undefined) {
      return defaultValue;
    }

    const normalized = rawValue.trim().toLowerCase();

    if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) {
      return true;
    }

    if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) {
      return false;
    }

    throw new BadRequestException(
      'Boolean query values must be one of: true/false, 1/0, yes/no',
    );
  }
}
