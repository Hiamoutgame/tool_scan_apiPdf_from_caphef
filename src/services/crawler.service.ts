import { access, mkdir, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  CafeFApiPayload,
  CafeFType,
  CrawlApiListParams,
  CrawlApiListResponse,
  DownloadFileResult,
  DownloadPdfsParams,
  DownloadPdfsResponse,
  LinkOnlyRecord,
  ReportRecord,
  SymbolSummary,
} from '../models/crawler.types';

const CAFEF_ENDPOINT = 'https://cafef.vn/du-lieu/Ajax/PageNew/FileBCTC.ashx';
const REQUEST_HEADERS: HeadersInit = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  Referer: 'https://cafef.vn/',
};

@Injectable()
export class CrawlerService {
  async getApiList(params: CrawlApiListParams): Promise<CrawlApiListResponse> {
    const records: (ReportRecord | LinkOnlyRecord)[] = [];
    const summary: SymbolSummary[] = [];

    for (const symbol of params.symbols) {
      const apiUrl = this.buildCafeFApiUrl(symbol, params.type, params.year);

      try {
        const payload = await this.fetchCafeFApiData(apiUrl);

        if (!payload.Success || !payload.Data) {
          summary.push({
            Symbol: symbol,
            ApiSuccess: false,
            TotalFromApi: 0,
            AddedToList: 0,
            Note: payload.Message ?? 'Success=false or empty Data',
          });
          continue;
        }

        let added = 0;

        for (const item of payload.Data) {
          const cleanLink = (item.Link ?? '').trim();
          if (!cleanLink) {
            continue;
          }

          const extension = this.extractExtension(cleanLink);
          const isPdf = extension === '.pdf';

          if (!params.includeNonPdf && !isPdf) {
            continue;
          }

          if (params.linkOnly) {
            records.push({ Link: cleanLink });
          } else {
            records.push({
              Symbol: symbol,
              Type: params.type,
              ApiYearFilter: params.year,
              Year: Number(item.Year) || 0,
              Quarter: Number(item.Quarter) || 0,
              Time: item.Time ?? '',
              Name: item.Name ?? '',
              Link: cleanLink,
              Extension: extension,
              IsPdf: isPdf,
              ApiUrl: apiUrl,
            });
          }

          added += 1;
        }

        summary.push({
          Symbol: symbol,
          ApiSuccess: true,
          TotalFromApi: payload.Data.length,
          AddedToList: added,
          Note: params.includeNonPdf ? 'all extensions' : 'pdf only',
        });
      } catch (error: unknown) {
        summary.push({
          Symbol: symbol,
          ApiSuccess: false,
          TotalFromApi: 0,
          AddedToList: 0,
          Note: this.resolveErrorMessage(error),
        });
      }
    }

    return {
      GeneratedAt: new Date().toISOString(),
      Type: params.type,
      YearFilter: params.year,
      IncludeNonPdf: params.includeNonPdf,
      LinkOnly: params.linkOnly,
      Symbols: params.symbols,
      TotalRecords: records.length,
      Summary: summary,
      Data: records,
    };
  }

  async downloadPdfs(
    params: DownloadPdfsParams,
  ): Promise<DownloadPdfsResponse> {
    const listResult = await this.getApiList({
      symbols: params.symbols,
      type: params.type,
      year: params.year,
      includeNonPdf: false,
      linkOnly: false,
    });

    // linkOnly is always false above, so Data is expected to be ReportRecord[]
    const reportRecords = listResult.Data as ReportRecord[];

    const outputRoot = path.join(process.cwd(), 'download');
    const results: DownloadFileResult[] = [];
    let downloaded = 0;
    let failed = 0;

    for (const record of reportRecords) {
      const companyFolder = record.Symbol.toLowerCase();
      const targetDirectory = path.join(outputRoot, companyFolder);

      const preferredFileName = this.getFileNameFromLinkOrName(
        record.Link,
        record.Name,
      );
      let targetFileName = preferredFileName;
      let targetFilePath = path.join(targetDirectory, preferredFileName);

      try {
        await mkdir(targetDirectory, { recursive: true });

        const { fileName, filePath } = await this.resolveTargetFilePath(
          targetDirectory,
          preferredFileName,
          params.overwrite,
        );
        targetFileName = fileName;
        targetFilePath = filePath;

        const fileBuffer = await this.fetchBinaryFile(record.Link);
        await writeFile(targetFilePath, fileBuffer);

        results.push({
          Symbol: record.Symbol,
          Link: record.Link,
          FileName: targetFileName,
          SavedTo: this.toRelativePath(targetFilePath),
          Status: 'downloaded',
        });
        downloaded += 1;
      } catch (error: unknown) {
        failed += 1;
        results.push({
          Symbol: record.Symbol,
          Link: record.Link,
          FileName: targetFileName,
          SavedTo: this.toRelativePath(targetFilePath),
          Status: 'failed',
          Message: this.resolveErrorMessage(error),
        });
      }
    }

    return {
      GeneratedAt: new Date().toISOString(),
      Type: params.type,
      YearFilter: params.year,
      Symbols: params.symbols,
      OutputRoot: this.toRelativePath(outputRoot),
      TotalCandidates: reportRecords.length,
      Downloaded: downloaded,
      Failed: failed,
      Summary: listResult.Summary,
      Results: results,
    };
  }

  private buildCafeFApiUrl(
    symbol: string,
    type: CafeFType,
    year: number,
  ): string {
    const url = new URL(CAFEF_ENDPOINT);
    url.searchParams.set('Symbol', symbol.toUpperCase());
    url.searchParams.set('Type', String(type));
    url.searchParams.set('Year', String(year));

    return url.toString();
  }

  private extractExtension(link: string): string {
    try {
      const url = new URL(link);
      const path = url.pathname;
      const index = path.lastIndexOf('.');

      if (index < 0) {
        return '';
      }

      return path.slice(index).toLowerCase();
    } catch {
      const sanitized = link.split('?')[0] ?? link;
      const index = sanitized.lastIndexOf('.');

      if (index < 0) {
        return '';
      }

      return sanitized.slice(index).toLowerCase();
    }
  }

  private getFileNameFromLinkOrName(
    link: string,
    fallbackName: string,
  ): string {
    let fileName = '';

    try {
      const url = new URL(link);
      fileName = decodeURIComponent(path.basename(url.pathname));
    } catch {
      const sanitizedLink = link.split('?')[0] ?? link;
      fileName = path.basename(sanitizedLink);
    }

    if (!fileName || fileName === '.' || fileName === '/') {
      fileName = fallbackName;
    }

    let sanitizedName = this.sanitizeFileName(fileName);

    if (!sanitizedName) {
      sanitizedName = 'report.pdf';
    }

    if (path.extname(sanitizedName).toLowerCase() !== '.pdf') {
      sanitizedName = `${sanitizedName}.pdf`;
    }

    return sanitizedName;
  }

  private sanitizeFileName(rawValue: string): string {
    const sanitized = rawValue
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/[. ]+$/g, '');

    if (!sanitized) {
      return '';
    }

    if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i.test(sanitized)) {
      return `_${sanitized}`;
    }

    return sanitized;
  }

  private async resolveTargetFilePath(
    directory: string,
    preferredFileName: string,
    overwrite: boolean,
  ): Promise<{ fileName: string; filePath: string }> {
    if (overwrite) {
      return {
        fileName: preferredFileName,
        filePath: path.join(directory, preferredFileName),
      };
    }

    const extension = path.extname(preferredFileName);
    const baseName = preferredFileName.slice(
      0,
      preferredFileName.length - extension.length,
    );

    let candidateName = preferredFileName;
    let index = 1;

    while (await this.pathExists(path.join(directory, candidateName))) {
      candidateName = `${baseName} (${index})${extension}`;
      index += 1;
    }

    return {
      fileName: candidateName,
      filePath: path.join(directory, candidateName),
    };
  }

  private async pathExists(targetPath: string): Promise<boolean> {
    try {
      await access(targetPath);
      return true;
    } catch {
      return false;
    }
  }

  private async fetchBinaryFile(fileUrl: string): Promise<Buffer> {
    let response: Response;

    try {
      response = await fetch(fileUrl, {
        method: 'GET',
        headers: REQUEST_HEADERS,
      });
    } catch (error: unknown) {
      throw new BadGatewayException(
        `Cannot download file: ${this.resolveErrorMessage(error)}`,
      );
    }

    if (!response.ok) {
      throw new BadGatewayException(
        `Download failed with status ${response.status}`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      throw new InternalServerErrorException('Downloaded file is empty');
    }

    return buffer;
  }

  private toRelativePath(targetPath: string): string {
    const relative = path.relative(process.cwd(), targetPath) || '.';
    return relative.split(path.sep).join('/');
  }

  private async fetchCafeFApiData(apiUrl: string): Promise<CafeFApiPayload> {
    let response: Response;

    try {
      response = await fetch(apiUrl, {
        method: 'GET',
        headers: REQUEST_HEADERS,
      });
    } catch (error: unknown) {
      throw new BadGatewayException(
        `Cannot connect to CafeF API: ${this.resolveErrorMessage(error)}`,
      );
    }

    if (!response.ok) {
      throw new BadGatewayException(
        `CafeF API failed with status ${response.status}`,
      );
    }

    try {
      return (await response.json()) as CafeFApiPayload;
    } catch {
      throw new InternalServerErrorException(
        'CafeF API returned an invalid JSON payload',
      );
    }
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    return 'Unknown error';
  }
}
