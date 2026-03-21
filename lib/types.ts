export interface TranscriptBlock {
  id: string;
  text: string;
  createdAt: number;
}

export interface SummaryShape {
  content: string;
}

export interface SummaryRouteResponse extends SummaryShape {
  fallback?: boolean;
  warning?: string;
  usage?: { input_tokens: number; output_tokens: number };
}

export const EMPTY_SUMMARY: SummaryShape = {
  content: ''
};
