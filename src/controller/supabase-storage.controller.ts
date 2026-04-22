import {
  BadRequestException,
  Body,
  Controller,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UploadLocalFileResponse } from '../models/supabase-storage.types';
import { SupabaseStorageService } from '../services/supabase-storage.service';

interface UploadLocalFileBody {
  localPath?: string;
  remotePath?: string;
  bucket?: string;
  upsert?: boolean | string;
  cacheControl?: string;
  contentType?: string;
}

@Controller('storage')
@ApiTags('storage')
export class SupabaseStorageController {
  constructor(
    private readonly supabaseStorageService: SupabaseStorageService,
  ) {}

  @Post('upload-local')
  @ApiOperation({
    summary: 'Upload a local file to Supabase Storage',
    description:
      'Reads a file from the local backend filesystem and uploads it to a Supabase Storage bucket.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['localPath'],
      properties: {
        localPath: {
          type: 'string',
          example: 'asset/a.md',
        },
        remotePath: {
          type: 'string',
          example: 'ocr/a.md',
        },
        bucket: {
          type: 'string',
          example: 'Storage_PDF_MD_LumiFin',
        },
        upsert: {
          type: 'boolean',
          example: true,
        },
        cacheControl: {
          type: 'string',
          example: '3600',
        },
        contentType: {
          type: 'string',
          example: 'text/plain',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'File uploaded to Supabase Storage successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid request body or unreadable local file.',
  })
  async uploadLocal(
    @Body() body: UploadLocalFileBody,
  ): Promise<UploadLocalFileResponse> {
    return this.supabaseStorageService.uploadLocalFile({
      localPath: body.localPath ?? '',
      remotePath: body.remotePath,
      bucket: body.bucket,
      upsert: this.parseBoolean(body.upsert, false),
      cacheControl: body.cacheControl,
      contentType: body.contentType,
    });
  }

  private parseBoolean(
    rawValue: boolean | string | undefined,
    defaultValue: boolean,
  ): boolean {
    if (rawValue === undefined) {
      return defaultValue;
    }

    if (typeof rawValue === 'boolean') {
      return rawValue;
    }

    const normalized = rawValue.trim().toLowerCase();

    if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) {
      return true;
    }

    if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) {
      return false;
    }

    throw new BadRequestException(
      'Field "upsert" must be one of: true/false, 1/0, yes/no',
    );
  }
}
