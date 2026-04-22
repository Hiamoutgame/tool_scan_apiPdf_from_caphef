import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  UploadLocalFileParams,
  UploadLocalFileResponse,
} from '../models/supabase-storage.types';

@Injectable()
export class SupabaseStorageService {
  // Reuse one client instance for the process so we do not recreate it on every upload.
  private supabaseClient: SupabaseClient | null = null;

  /**
   * Main upload flow:
   * 1. Validate and resolve the local file path
   * 2. Decide which bucket/path to write to
   * 3. Read the file from disk
   * 4. Upload it with Supabase Storage's standard upload API
   *
   * Why this shape:
   * - Supabase's `.from(bucket).upload(path, fileBody, options)` requires an
   *   existing bucket, a target path, and the file body.
   * - We keep all orchestration here so the controller stays thin and only
   *   passes request data into the service.
   */
  async uploadLocalFile(
    params: UploadLocalFileParams,
  ): Promise<UploadLocalFileResponse> {
    const localPath = this.resolveLocalPath(params.localPath);
    const bucket = this.resolveBucketName(params.bucket);
    const remotePath = this.resolveRemotePath(localPath, params.remotePath);
    const fileBuffer = await this.readLocalFile(localPath);
    const contentType =
      params.contentType ?? this.detectContentType(localPath, remotePath);

    const supabase = this.getSupabaseClient();
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(remotePath, fileBuffer, {
        upsert: params.upsert,
        cacheControl: params.cacheControl ?? '3600',
        contentType,
      });

    if (error) {
      throw new BadGatewayException(`Supabase upload failed: ${error.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(remotePath);

    return {
      bucket,
      localPath: this.toRelativePath(localPath),
      remotePath,
      contentType,
      size: fileBuffer.byteLength,
      id: data.id,
      path: data.path,
      fullPath: data.fullPath,
      publicUrl,
    };
  }

  /**
   * Lazily creates and caches the Supabase client.
   *
   * Why setup like this:
   * - The official client is created from `projectUrl` + `apiKey`.
   * - A single shared client is enough for this backend process.
   * - `autoRefreshToken` and `persistSession` are disabled because this backend
   *   is not acting like a browser app with long-lived user sessions.
   */
  private getSupabaseClient(): SupabaseClient {
    if (this.supabaseClient) {
      return this.supabaseClient;
    }

    const projectUrl = this.getRequiredEnv('SUPABASE_PROJECT_URL');
    const apiKey = this.getStorageApiKey();

    this.supabaseClient = createClient(projectUrl, apiKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    return this.supabaseClient;
  }

  /**
   * Chooses which API key the backend should use for Storage calls.
   *
   * Why publishable key first:
   * - You said your team wants this backend to prioritize
   *   `SUPABASE_PUBLISHABLE_KEY`.
   * - With a publishable key, uploads still depend on Storage policies and
   *   bucket restrictions from Supabase.
   * - `SUPABASE_SERVICE_ROLE_KEY` is kept as a fallback path for environments
   *   where trusted server-side access is needed later.
   */
  private getStorageApiKey(): string {
    const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
    if (publishableKey) {
      return publishableKey;
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (serviceRoleKey) {
      return serviceRoleKey;
    }

    throw new InternalServerErrorException(
      'Missing Supabase key. Set SUPABASE_PUBLISHABLE_KEY, or fallback to SUPABASE_SERVICE_ROLE_KEY',
    );
  }

  /**
   * Reads a required environment variable and fails fast if it is missing.
   *
   * Why setup like this:
   * - Storage uploads cannot work without a project URL or key.
   * - Throwing early gives a clear backend configuration error instead of a
   *   harder-to-debug upload failure later.
   */
  private getRequiredEnv(name: string): string {
    const value = process.env[name]?.trim();

    if (!value) {
      throw new InternalServerErrorException(
        `Missing required environment variable: ${name}`,
      );
    }

    return value;
  }

  /**
   * Resolves the incoming local path against the current working directory.
   *
   * Why setup like this:
   * - Request payloads usually send relative paths such as `asset/a.md`.
   * - `path.resolve(process.cwd(), ...)` makes file access predictable from the
   *   project root regardless of where the process was started from.
   */
  private resolveLocalPath(targetPath: string): string {
    if (!targetPath || !targetPath.trim()) {
      throw new BadRequestException('Field "localPath" is required');
    }

    return path.resolve(process.cwd(), targetPath);
  }

  /**
   * Decides the object path inside Supabase Storage.
   *
   * Why setup like this:
   * - Supabase upload paths are logical object keys like `folder/file.pdf`.
   * - If the caller passes `remotePath`, we respect it.
   * - Otherwise we mirror the local project-relative path so uploads stay easy
   *   to trace back to local files.
   */
  private resolveRemotePath(localPath: string, remotePath?: string): string {
    if (remotePath?.trim()) {
      return this.normalizeStoragePath(remotePath);
    }

    const relativePath = path.relative(process.cwd(), localPath);
    if (!relativePath || relativePath.startsWith('..')) {
      return this.normalizeStoragePath(path.basename(localPath));
    }

    return this.normalizeStoragePath(relativePath);
  }

  /**
   * Chooses the Storage bucket from request input or environment config.
   *
   * Why setup like this:
   * - Most uploads in this project should go to one default bucket.
   * - Allowing an override in the request still gives flexibility for testing
   *   or future multi-bucket flows.
   */
  private resolveBucketName(bucket?: string): string {
    const candidate = bucket?.trim() || process.env.SUPABASE_STORAGE_BUCKET;

    if (!candidate?.trim()) {
      throw new InternalServerErrorException(
        'Missing storage bucket. Set SUPABASE_STORAGE_BUCKET or pass "bucket" in the request body',
      );
    }

    return candidate.trim();
  }

  /**
   * Normalizes object keys into the slash-separated form expected by Storage.
   *
   * Why setup like this:
   * - Supabase Storage paths are object keys, not Windows filesystem paths.
   * - Replacing backslashes and duplicate slashes prevents malformed keys when
   *   this backend runs on Windows.
   */
  private normalizeStoragePath(storagePath: string): string {
    return storagePath
      .replace(/\\/g, '/')
      .replace(/^\/+/, '')
      .replace(/\/{2,}/g, '/');
  }

  /**
   * Reads the file content from the local filesystem.
   *
   * Why setup like this:
   * - Supabase upload accepts the file body, so we load the local file into a
   *   `Buffer` first.
   * - Read errors are translated into a `BadRequestException` because the input
   *   path from the caller is invalid or inaccessible.
   */
  private async readLocalFile(localPath: string): Promise<Buffer> {
    try {
      return await readFile(localPath);
    } catch (error: unknown) {
      throw new BadRequestException(
        `Cannot read local file: ${this.resolveErrorMessage(error)}`,
      );
    }
  }

  /**
   * Provides a best-effort MIME type when the caller does not specify one.
   *
   * Why setup like this:
   * - Supabase upload supports `contentType`, and bucket restrictions can
   *   depend on MIME type.
   * - We map common project file types explicitly so uploaded objects are
   *   easier to serve and inspect later.
   * - `.md` is currently sent as `text/plain` because this project's bucket
   *   rejected `text/markdown` during live testing.
   */
  private detectContentType(localPath: string, remotePath: string): string {
    const extension =
      path.extname(remotePath || localPath).toLowerCase() ||
      path.extname(localPath).toLowerCase();

    switch (extension) {
      case '.md':
      case '.markdown':
        return 'text/plain';
      case '.txt':
        return 'text/plain';
      case '.json':
        return 'application/json';
      case '.pdf':
        return 'application/pdf';
      case '.html':
        return 'text/html';
      case '.csv':
        return 'text/csv';
      case '.png':
        return 'image/png';
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      default:
        return 'application/octet-stream';
    }
  }

  /**
   * Converts absolute local paths into project-relative paths for API output.
   *
   * Why setup like this:
   * - Relative paths are easier to read in logs and responses than full
   *   machine-specific absolute paths.
   */
  private toRelativePath(targetPath: string): string {
    const relative = path.relative(process.cwd(), targetPath) || '.';
    return relative.split(path.sep).join('/');
  }

  /**
   * Extracts a readable message from unknown errors.
   *
   * Why setup like this:
   * - Node, filesystem, and Supabase errors do not always share the same
   *   shape, so this keeps our exception messages consistent.
   */
  private resolveErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    return 'Unknown error';
  }
}
