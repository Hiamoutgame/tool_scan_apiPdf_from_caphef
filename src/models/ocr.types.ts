export interface OcrJsonPayload {
  filename?: string;
  total_pages?: number;
  extracted_markdown?: string;
}

export interface ConvertOcrJsonToMarkdownParams {
  inputPath: string;
  outputPath?: string;
  overwrite: boolean;
}

export interface ConvertOcrJsonToMarkdownResponse {
  inputPath: string;
  outputPath: string;
  sourceFilename: string;
  totalPages: number | null;
  markdownLength: number;
}
