import { EMPTY_SUMMARY, SummaryShape } from './types';

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const parseSummaryResponse = (input: unknown): SummaryShape | null => {
  if (!input || typeof input !== 'object') return null;
  const maybe = input as Partial<SummaryShape>;
  if (typeof maybe.content !== 'string') return null;
  return { content: maybe.content };
};

export const coerceSummaryShape = (input: unknown): SummaryShape => {
  const parsed = parseSummaryResponse(input);
  return parsed ?? EMPTY_SUMMARY;
};

export const buildFallbackSummary = (
  previousSummary: SummaryShape,
  newTranscript: string
): SummaryShape => {
  const sentences = newTranscript
    .split(/\n|(?<=[.!?])\s+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const recent = sentences.slice(-5).join(' ');
  const content = previousSummary.content
    ? `${previousSummary.content}\n\n---\n\n(Resumen local provisional) ${recent}`
    : `(Resumen local provisional) ${recent}`;

  return { content };
};

export const summaryToText = (summary: SummaryShape) => summary.content;
