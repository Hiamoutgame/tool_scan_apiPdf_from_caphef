export interface UploadLocalFileParams {
  localPath: string;
  remotePath?: string;
  bucket?: string;
  upsert: boolean;
  cacheControl?: string;
  contentType?: string;
}

export interface UploadLocalFileResponse {
  bucket: string;
  localPath: string;
  remotePath: string;
  contentType: string;
  size: number;
  id?: string;
  path: string;
  fullPath: string;
  publicUrl: string;
}
