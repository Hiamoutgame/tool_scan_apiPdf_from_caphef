import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CrawlerService } from '../services/crawler.service';
import { CafeFType, DownloadPdfsResponse } from '../models/crawler.types';

const ALLOWED_TYPES: CafeFType[] = [0, 1, 3, 4, 5];

interface RawDownloadQuery {
  company?: string;
  symbols?: string;
  type?: string;
  year?: string;
  overwrite?: string;
}

@Controller('crawlbot')
@ApiTags('crawlbot')
export class DownloadController {
  constructor(private readonly crawlerService: CrawlerService) {}

  @Get('download-pdfs')
  @ApiOperation({
    summary: 'Download PDF files to local download folder',
    description:
      'Gets PDF links from CafeF API and downloads files to download/<company>/<file>.pdf.',
  })
  @ApiQuery({
    name: 'company',
    required: false,
    type: String,
    description: 'Single symbol or comma-separated symbols (e.g. FPT,ACB).',
    example: 'FPT',
  })
  @ApiQuery({
    name: 'symbols',
    required: false,
    type: String,
    description: 'Alias of company. Single symbol or comma-separated symbols.',
    example: 'FPT,ACB',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: [0, 1, 3, 4, 5],
    description: 'Report group type. Default is 1.',
    example: 1,
  })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description: 'Year filter, use 0 for all years. Default is 0.',
    example: 2025,
  })
  @ApiQuery({
    name: 'overwrite',
    required: false,
    type: String,
    description:
      'When true, overwrite existing files. Otherwise auto-increments filename.',
    example: 'true',
  })
  @ApiOkResponse({
    description: 'Successfully downloaded candidate PDF files.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters.',
  })
  async downloadPdfs(
    @Query() query: RawDownloadQuery,
  ): Promise<DownloadPdfsResponse> {
    const symbols = this.parseSymbols(query.company, query.symbols);
    const type = this.parseType(query.type);
    const year = this.parseYear(query.year);
    const overwrite = this.parseBoolean(query.overwrite, false);

    return this.crawlerService.downloadPdfs({
      symbols,
      type,
      year,
      overwrite,
    });
  }

  private parseSymbols(company?: string, symbolsQuery?: string): string[] {
    const raw = company ?? symbolsQuery;

    if (!raw || !raw.trim()) {
      throw new BadRequestException(
        'Query "company" or "symbols" is required. Example: ?company=ACB or ?symbols=ACB,FPT',
      );
    }

    const parsed = raw
      .split(',')
      .map((value) => value.trim().toUpperCase())
      .filter((value) => value.length > 0);

    if (parsed.length === 0) {
      throw new BadRequestException('No valid company symbols were provided');
    }

    return [...new Set(parsed)];
  }

  private parseType(rawType?: string): CafeFType {
    if (!rawType) {
      return 1;
    }

    const value = Number(rawType);
    if (
      !Number.isInteger(value) ||
      !ALLOWED_TYPES.includes(value as CafeFType)
    ) {
      throw new BadRequestException(
        'Query "type" must be one of 0, 1, 3, 4, 5',
      );
    }

    return value as CafeFType;
  }

  private parseYear(rawYear?: string): number {
    if (!rawYear) {
      return 0;
    }

    const value = Number(rawYear);
    if (!Number.isInteger(value) || value < 0) {
      throw new BadRequestException('Query "year" must be an integer >= 0');
    }

    return value;
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
