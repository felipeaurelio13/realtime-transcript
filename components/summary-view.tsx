import ReactMarkdown from 'react-markdown';
import { SummaryShape } from '@/lib/types';

export const SummaryView = ({ summary }: { summary: SummaryShape }) => (
  <div className="prose prose-sm max-w-none animate-in fade-in duration-200 text-text prose-headings:text-text prose-strong:text-text prose-li:text-text">
    {summary.content ? (
      <ReactMarkdown>{summary.content}</ReactMarkdown>
    ) : (
      <p className="text-muted">Esperando señales para resumir…</p>
    )}
  </div>
);
