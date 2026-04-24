import { Body, Controller, UploadedFile, UseInterceptors, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadLocalFileResponse } from '../models/supabase-storage.types';
import { SupabaseStorageService } from '../services/supabase-storage.service';

interface UploadFileFormBody {
  file_path?: string;
  contentType?: string;
}

@Controller('storage')
@ApiTags('storage')
export class SupabaseStorageController {
  constructor(
    private readonly supabaseStorageService: SupabaseStorageService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload a PDF file to Supabase Storage',
    description:
      'Accepts a multipart/form-data PDF upload and sends the uploaded file to a Supabase Storage bucket.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'file_path'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        file_path: {
          type: 'string',
          example: 'pdf/cv-resume.pdf',
        },
        contentType: {
          type: 'string',
          example: 'application/pdf',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Uploaded request file sent to Supabase Storage successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid upload form body or missing file.',
  })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadFileFormBody,
  ): Promise<UploadLocalFileResponse> {
    return this.supabaseStorageService.uploadIncomingFile({
      file: {
        buffer: file?.buffer,
        originalname: file?.originalname ?? '',
        mimetype: file?.mimetype,
      },
      filePath: body.file_path,
      contentType: body.contentType,
    });
  }
}
