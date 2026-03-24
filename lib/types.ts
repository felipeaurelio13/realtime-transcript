export interface TranscriptBlock {
  id: string;
  text: string;
  createdAt: number;
}

/** A single bullet item inside a summary section. */
export interface SummaryItem {
  text: string;
}

/** One named section of the structured summary. */
export interface SummarySection {
  title: string;
  items: SummaryItem[];
}

/**
 * Structured summary stored as an ordered list of sections, each with bullet items.
 * Also carries a `content` field with the rendered markdown for display / export.
 */
export interface SummaryShape {
  content: string;
  sections?: SummarySection[];
}

export interface SummaryRouteResponse {
  /** Updated sections from the LLM (structured path). */
  sections?: SummarySection[];
  /** Rendered markdown fallback. */
  content?: string;
  fallback?: boolean;
  warning?: string;
  usage?: { input_tokens: number; output_tokens: number };
}

export const EMPTY_SUMMARY: SummaryShape = {
  content: '',
  sections: []
};
