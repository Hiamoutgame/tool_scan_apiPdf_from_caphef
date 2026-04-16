import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CrawlerService } from '../services/crawler.service';
import { CafeFType, CrawlApiListResponse } from '../models/crawler.types';

const ALLOWED_TYPES: CafeFType[] = [0, 1, 3, 4, 5];

interface RawApiListQuery {
  company?: string;
  symbols?: string;
  type?: string;
  year?: string;
  includeNonPdf?: string;
  linkOnly?: string;
}

@Controller('crawlbot')
@ApiTags('crawlbot')
export class CrawlerController {
  constructor(private readonly crawlerService: CrawlerService) {}

  @Get('api-list')
  @ApiOperation({
    summary: 'Get report list from CafeF API',
    description:
      'Returns report records (or links only) by symbol, type and year filter.',
  })
  @ApiQuery({
    name: 'company',
    required: false,
    type: String,
    description: 'Single symbol or comma-separated symbols (e.g. ACB,FPT).',
    example: 'ACB',
  })
  @ApiQuery({
    name: 'symbols',
    required: false,
    type: String,
    description: 'Alias of company. Single symbol or comma-separated symbols.',
    example: 'ACB,FPT',
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
    name: 'includeNonPdf',
    required: false,
    type: String,
    description:
      'When true, includes non-PDF files in the result. Default is false.',
    example: 'false',
  })
  @ApiQuery({
    name: 'linkOnly',
    required: false,
    type: String,
    description: 'When true, returns only link objects. Default is false.',
    example: 'true',
  })
  @ApiOkResponse({
    description: 'Successfully fetched report list from CafeF API.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters.',
  })
  async getApiList(
    @Query() query: RawApiListQuery,
  ): Promise<CrawlApiListResponse> {
    const symbols = this.parseSymbols(query.company, query.symbols);
    const type = this.parseType(query.type);
    const year = this.parseYear(query.year);
    const includeNonPdf = this.parseBoolean(query.includeNonPdf, false);
    const linkOnly = this.parseBoolean(query.linkOnly, false);

    return this.crawlerService.getApiList({
      symbols,
      type,
      year,
      includeNonPdf,
      linkOnly,
    });
  }

  private parseSymbols(company?: string, symbolsQuery?: string): string[] {
    const raw = company ?? symbolsQuery;

    if (!raw || !raw.trim()) {
      throw new BadRequestException(
        'Query "company" or "symbols" is required. Example: ?company=VIC or ?symbols=VIC,FPT',
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
