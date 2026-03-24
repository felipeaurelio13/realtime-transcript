'use client';

import { memo, useCallback } from 'react';
import { TranscriptBlock } from '@/lib/types';
import { useLiveNotesStore } from '@/store/livenotes-store';

/** Memoized single block — only re-renders when its own text changes. */
const Block = memo(
  ({ id, text, onBlur }: { id: string; text: string; onBlur: (id: string, newText: string) => void }) => (
    <p
      className="animate-in fade-in duration-200 cursor-text rounded px-1 outline-none focus:ring-1 focus:ring-accent"
      contentEditable
      suppressContentEditableWarning
      onBlur={(e) => {
        const newText = (e.currentTarget.textContent ?? '').trim();
        if (newText !== text) onBlur(id, newText);
      }}
    >
      {text}
    </p>
  )
);
Block.displayName = 'Block';

/** Live text indicator — isolated so delta updates don't touch committed blocks. */
const LiveIndicator = memo(({ text }: { text: string }) => (
  <p className="text-text animate-pulse">
    {text}
    <span className="inline-block w-2">▍</span>
  </p>
));
LiveIndicator.displayName = 'LiveIndicator';

export const TranscriptView = ({
  blocks,
  liveText
}: {
  blocks: TranscriptBlock[];
  liveText: string;
}) => {
  const updateBlock = useLiveNotesStore((state) => state.updateBlock);

  const handleBlur = useCallback(
    (id: string, newText: string) => {
      updateBlock(id, newText);
    },
    [updateBlock]
  );

  return (
    <div className="space-y-3">
      {blocks.length === 0 && !liveText ? <p className="text-muted">Habla para comenzar la transcripción…</p> : null}

      {blocks.map((block) => (
        <Block key={block.id} id={block.id} text={block.text} onBlur={handleBlur} />
      ))}

      {liveText ? <LiveIndicator text={liveText} /> : null}
    </div>
  );
};
