export interface TranscriptBlock {
  id: string;
  text: string;
  createdAt: number;
}

export interface SummaryShape {
  executive_summary: string;
  key_points: string[];
  decisions: string[];
  action_items: string[];
  open_questions: string[];
}

export const EMPTY_SUMMARY: SummaryShape = {
  executive_summary: '',
  key_points: [],
  decisions: [],
  action_items: [],
  open_questions: []
};
