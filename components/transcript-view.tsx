import { TranscriptBlock } from '@/lib/types';

export const TranscriptView = ({
  blocks,
  liveText
}: {
  blocks: TranscriptBlock[];
  liveText: string;
}) => (
  <div className="space-y-3">
    {blocks.length === 0 && !liveText ? <p className="text-muted">Habla para comenzar la transcripción…</p> : null}

    {blocks.map((block) => (
      <p key={block.id} className="animate-in fade-in duration-200">
        {block.text}
      </p>
    ))}

    {liveText ? (
      <p className="text-text animate-pulse">
        {liveText}
        <span className="inline-block w-2">▍</span>
      </p>
    ) : null}
  </div>
);
