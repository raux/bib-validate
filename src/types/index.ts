export interface PaperMetadata {
  title: string;
  authors: string[];
  year: string;
  source: string;
}

export type SourceStatus = 'idle' | 'loading' | 'success' | 'error';

export interface SourceResult {
  status: SourceStatus;
  data: PaperMetadata | null;
  error: string | null;
}

export interface AppState {
  input: string;
  step: number;
  sources: {
    arxiv: SourceResult;
    dblp: SourceResult;
    scholar: SourceResult;
    ieee: SourceResult;
  };
  discrepancies: Discrepancy[];
}

export interface Discrepancy {
  field: 'title' | 'authors' | 'year';
  source: string;
  groundTruth: string;
  found: string;
  message: string;
}

export type AppAction =
  | { type: 'SET_INPUT'; payload: string }
  | { type: 'SET_STEP'; payload: number }
  | { type: 'SOURCE_LOADING'; source: keyof AppState['sources'] }
  | { type: 'SOURCE_SUCCESS'; source: keyof AppState['sources']; data: PaperMetadata }
  | { type: 'SOURCE_ERROR'; source: keyof AppState['sources']; error: string }
  | { type: 'SET_DISCREPANCIES'; payload: Discrepancy[] }
  | { type: 'RESET' };
