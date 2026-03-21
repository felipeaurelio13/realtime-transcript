'use client';

import { useCallback } from 'react';
import { TranscriptBlock } from '@/lib/types';
import { useLiveNotesStore } from '@/store/livenotes-store';

export const TranscriptView = ({
  blocks,
  liveText
}: {
  blocks: TranscriptBlock[];
  liveText: string;
}) => {
  const updateBlock = useLiveNotesStore((state) => state.updateBlock);

  const handleBlur = useCallback(
    (id: string, e: React.FocusEvent<HTMLParagraphElement>) => {
      const newText = (e.currentTarget.textContent ?? '').trim();
      const block = blocks.find((b) => b.id === id);
      if (block && newText !== block.text) {
        updateBlock(id, newText);
      }
    },
    [blocks, updateBlock]
  );

  return (
    <div className="space-y-3">
      {blocks.length === 0 && !liveText ? <p className="text-muted">Habla para comenzar la transcripción…</p> : null}

      {blocks.map((block) => (
        <p
          key={block.id}
          className="animate-in fade-in duration-200 cursor-text rounded px-1 outline-none focus:ring-1 focus:ring-accent"
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => handleBlur(block.id, e)}
        >
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
};
