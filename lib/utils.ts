import { SummaryShape } from './types';

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const parseSummaryResponse = (input: unknown): SummaryShape | null => {
  if (!input || typeof input !== 'object') return null;
  const maybe = input as Partial<SummaryShape>;

  if (typeof maybe.executive_summary !== 'string') return null;
  const toArray = (value: unknown) =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

  return {
    executive_summary: maybe.executive_summary,
    key_points: toArray(maybe.key_points),
    decisions: toArray(maybe.decisions),
    action_items: toArray(maybe.action_items),
    open_questions: toArray(maybe.open_questions)
  };
};

export const summaryToText = (summary: SummaryShape) =>
  JSON.stringify(summary, null, 2);
