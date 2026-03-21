'use client';

import { useEffect, useState } from 'react';
import { useLiveNotesStore } from '@/store/livenotes-store';

export const CostIndicator = () => {
  const totalCost = useLiveNotesStore((state) => state.totalCost);
  const status = useLiveNotesStore((state) => state.status);
  const [display, setDisplay] = useState('$0.000');

  useEffect(() => {
    const update = () => setDisplay(`$${totalCost().toFixed(3)}`);
    update();

    if (status !== 'recording') return;

    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [totalCost, status]);

  return (
    <span className="text-xs text-muted" title="Costo estimado OpenAI (transcripción + resumen)">
      {display}
    </span>
  );
};
