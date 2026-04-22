import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ConvertOcrJsonToMarkdownParams,
  ConvertOcrJsonToMarkdownResponse,
  OcrJsonPayload,
} from '../models/ocr.types';

@Injectable()
export class OcrMarkdownService {
  async convertJsonFileToMarkdown(
    params: ConvertOcrJsonToMarkdownParams,
  ): Promise<ConvertOcrJsonToMarkdownResponse> {
    const inputPath = this.resolveWorkspacePath(params.inputPath);
    const outputPath = this.resolveOutputPath(inputPath, params.outputPath);

    if (!params.overwrite && (await this.pathExists(outputPath))) {
      throw new BadRequestException(
        `Output file already exists: ${this.toRelativePath(outputPath)}`,
      );
    }

    const payload = await this.readOcrJson(inputPath);
    const markdown = this.convertExtractedMarkdownToDocument(payload);

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, markdown, 'utf8');

    return {
      inputPath: this.toRelativePath(inputPath),
      outputPath: this.toRelativePath(outputPath),
      sourceFilename: payload.filename ?? path.basename(inputPath),
      totalPages:
        typeof payload.total_pages === 'number' ? payload.total_pages : null,
      markdownLength: markdown.length,
    };
  }

  convertExtractedMarkdownToDocument(payload: OcrJsonPayload): string {
    const rawMarkdown = payload.extracted_markdown;

    if (typeof rawMarkdown !== 'string' || rawMarkdown.trim().length === 0) {
      throw new BadRequestException(
        'The OCR JSON does not contain a non-empty "extracted_markdown" field',
      );
    }

    return this.normalizeMarkdown(rawMarkdown);
  }

  private normalizeMarkdown(rawMarkdown: string): string {
    return rawMarkdown
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .concat('\n');
  }

  private async readOcrJson(inputPath: string): Promise<OcrJsonPayload> {
    let fileContent: string;

    try {
      fileContent = await readFile(inputPath, 'utf8');
    } catch (error: unknown) {
      throw new BadRequestException(
        `Cannot read OCR JSON file: ${this.resolveErrorMessage(error)}`,
      );
    }

    try {
      return JSON.parse(fileContent) as OcrJsonPayload;
    } catch (error: unknown) {
      throw new BadRequestException(
        `Invalid OCR JSON file: ${this.resolveErrorMessage(error)}`,
      );
    }
  }

  private resolveWorkspacePath(targetPath: string): string {
    if (!targetPath || !targetPath.trim()) {
      throw new BadRequestException('Query "input" is required');
    }

    return path.resolve(process.cwd(), targetPath);
  }

  private resolveOutputPath(inputPath: string, outputPath?: string): string {
    if (outputPath && outputPath.trim()) {
      return path.resolve(process.cwd(), outputPath);
    }

    const directory = path.dirname(inputPath);
    const basename = path.basename(inputPath, path.extname(inputPath));
    return path.join(directory, `${basename}.md`);
  }

  private async pathExists(targetPath: string): Promise<boolean> {
    try {
      await access(targetPath);
      return true;
    } catch {
      return false;
    }
  }

  private toRelativePath(targetPath: string): string {
    const relative = path.relative(process.cwd(), targetPath) || '.';
    return relative.split(path.sep).join('/');
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    return 'Unknown error';
  }
}
