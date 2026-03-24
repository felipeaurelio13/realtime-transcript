import { EMPTY_SUMMARY, SummaryShape, SummarySection } from './types';

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

// ---------------------------------------------------------------------------
// Summary parsing
// ---------------------------------------------------------------------------

export const parseSummaryResponse = (input: unknown): SummaryShape | null => {
  if (!input || typeof input !== 'object') return null;
  const maybe = input as Partial<SummaryShape & { sections?: SummarySection[] }>;

  // Structured path: sections + content
  if (Array.isArray(maybe.sections)) {
    return {
      content: maybe.content ?? sectionsToMarkdown(maybe.sections),
      sections: maybe.sections
    };
  }

  // Legacy path: plain content string
  if (typeof maybe.content === 'string') {
    return { content: maybe.content };
  }

  return null;
};

export const coerceSummaryShape = (input: unknown): SummaryShape => {
  const parsed = parseSummaryResponse(input);
  return parsed ?? EMPTY_SUMMARY;
};

// ---------------------------------------------------------------------------
// Structured sections → Markdown rendering
// ---------------------------------------------------------------------------

export const sectionsToMarkdown = (sections: SummarySection[]): string => {
  if (!sections.length) return '';

  return sections
    .map((section) => {
      const heading = `**${section.title}**`;
      if (section.items.length === 0) return heading;
      if (section.items.length === 1) return `${heading}\n\n${section.items[0].text}`;
      const bullets = section.items.map((item) => `- ${item.text}`).join('\n');
      return `${heading}\n\n${bullets}`;
    })
    .join('\n\n');
};

// ---------------------------------------------------------------------------
// Merge operations into existing sections
// ---------------------------------------------------------------------------

interface SummaryOp {
  action: 'add' | 'update';
  section: string;
  items: string[];
}

export const mergeSections = (
  existing: SummarySection[],
  ops: SummaryOp[]
): SummarySection[] => {
  // Deep clone to avoid mutating input
  const sections = existing.map((s) => ({
    title: s.title,
    items: s.items.map((i) => ({ text: i.text }))
  }));

  for (const op of ops) {
    const idx = sections.findIndex(
      (s) => s.title.toLowerCase() === op.section.toLowerCase()
    );

    if (op.action === 'add') {
      if (idx >= 0) {
        // Append new items to existing section
        for (const text of op.items) {
          sections[idx].items.push({ text });
        }
      } else {
        // Create new section
        sections.push({
          title: op.section,
          items: op.items.map((text) => ({ text }))
        });
      }
    } else if (op.action === 'update') {
      if (idx >= 0) {
        // Replace items in existing section
        sections[idx].items = op.items.map((text) => ({ text }));
      } else {
        // Create if it doesn't exist
        sections.push({
          title: op.section,
          items: op.items.map((text) => ({ text }))
        });
      }
    }
  }

  return sections;
};

// ---------------------------------------------------------------------------
// Fallback summary (when OpenAI is unavailable)
// ---------------------------------------------------------------------------

export const buildFallbackSummary = (
  previousSections: SummarySection[],
  newTranscript: string
): SummaryShape => {
  const sentences = newTranscript
    .split(/\n|(?<=[.!?])\s+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const recent = sentences.slice(-5).join(' ');

  const sections: SummarySection[] = [
    ...previousSections,
    {
      title: 'Resumen local provisional',
      items: [{ text: recent }]
    }
  ];

  return {
    content: sectionsToMarkdown(sections),
    sections
  };
};

export const summaryToText = (summary: SummaryShape) => summary.content;
