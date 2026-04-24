export interface UploadLocalFileParams {
  localPath: string;
  remotePath?: string;
  bucket?: string;
  upsert: boolean;
  cacheControl?: string;
  contentType?: string;
}

export interface UploadIncomingFileParams {
  file: {
    buffer: Buffer;
    originalname: string;
    mimetype?: string;
  };
  filePath?: string;
  contentType?: string;
}

export interface UploadLocalFileResponse {
  bucket: string;
  localPath: string;
  sourceFileName?: string;
  remotePath: string;
  contentType: string;
  size: number;
  id?: string;
  path: string;
  fullPath: string;
  publicUrl: string;
}
