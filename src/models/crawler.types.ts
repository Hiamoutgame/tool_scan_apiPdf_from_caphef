export type CafeFType = 0 | 1 | 3 | 4 | 5;

export interface CafeFApiDataItem {
  Year: number;
  Quarter: number;
  Time: string;
  Name: string;
  Link: string;
}

export interface CafeFApiPayload {
  Success: boolean;
  Message?: string;
  Data?: CafeFApiDataItem[];
}

export interface SymbolSummary {
  Symbol: string;
  ApiSuccess: boolean;
  TotalFromApi: number;
  AddedToList: number;
  Note: string;
}

export interface ReportRecord {
  Symbol: string;
  Type: CafeFType;
  ApiYearFilter: number;
  Year: number;
  Quarter: number;
  Time: string;
  Name: string;
  Link: string;
  Extension: string;
  IsPdf: boolean;
  ApiUrl: string;
}

export interface LinkOnlyRecord {
  Link: string;
}

export interface CrawlApiListResponse {
  GeneratedAt: string;
  Type: CafeFType;
  YearFilter: number;
  IncludeNonPdf: boolean;
  LinkOnly: boolean;
  Symbols: string[];
  TotalRecords: number;
  Summary: SymbolSummary[];
  Data: ReportRecord[] | LinkOnlyRecord[];
}

export interface CrawlApiListParams {
  symbols: string[];
  type: CafeFType;
  year: number;
  includeNonPdf: boolean;
  linkOnly: boolean;
}

export interface DownloadPdfsParams {
  symbols: string[];
  type: CafeFType;
  year: number;
  overwrite: boolean;
}

export interface DownloadFileResult {
  Symbol: string;
  Link: string;
  FileName: string;
  SavedTo: string;
  Status: 'downloaded' | 'failed';
  Message?: string;
}

export interface DownloadPdfsResponse {
  GeneratedAt: string;
  Type: CafeFType;
  YearFilter: number;
  Symbols: string[];
  OutputRoot: string;
  TotalCandidates: number;
  Downloaded: number;
  Failed: number;
  Summary: SymbolSummary[];
  Results: DownloadFileResult[];
}
