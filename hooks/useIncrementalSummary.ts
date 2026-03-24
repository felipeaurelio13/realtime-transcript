'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useLiveNotesStore } from '@/store/livenotes-store';
import { SummaryRouteResponse } from '@/lib/types';
import { parseSummaryResponse } from '@/lib/utils';

const BASE_MIN_NEW_CHARS = 60;
const MAX_MIN_NEW_CHARS = 250;
const RAMP_DURATION_MS = 10 * 60 * 1000;
const MIN_INTERVAL_MS = 2000;
const HEARTBEAT_MS = 4000;
const PAUSE_MS = 800;

const getMinNewChars = (sessionStartedAt: number | null) => {
  if (!sessionStartedAt) return BASE_MIN_NEW_CHARS;
  const elapsed = Date.now() - sessionStartedAt;
  const t = Math.min(elapsed / RAMP_DURATION_MS, 1);
  return Math.round(BASE_MIN_NEW_CHARS + t * (MAX_MIN_NEW_CHARS - BASE_MIN_NEW_CHARS));
};

export const useIncrementalSummary = () => {
  const status = useLiveNotesStore((state) => state.status);
  const fullTranscript = useLiveNotesStore((state) => state.fullTranscript);
  const summarizedOffset = useLiveNotesStore((state) => state.summarizedOffset);

  const pendingRef = useRef(false);
  const previousStatusRef = useRef(status);
  const editDebounceRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const refreshSummary = useCallback(
    async (options?: { force?: boolean }) => {
      if (pendingRef.current) return;

      const state = useLiveNotesStore.getState();
      const { fullTranscript: ft, summarizedOffset: offset, currentSummary, contextPrompt, sessionStartedAt, lastSummaryUpdateAt } = state;
      const { setSummary, setErrorMessage, addSummaryCost } = state;

      const delta = offset > ft.length ? ft : ft.slice(offset).trimStart();
      if (!delta.trim()) return;

      const minChars = getMinNewChars(sessionStartedAt);
      if (!options?.force && delta.length < minChars) return;
      if (!options?.force && Date.now() - lastSummaryUpdateAt < MIN_INTERVAL_MS) return;

      pendingRef.current = true;
      const capturedLength = ft.length;

      try {
        const response = await fetch('/api/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            // Send the full shape so the API can extract sections
            previousSummary: JSON.stringify(currentSummary),
            newTranscript: delta,
            contextPrompt: contextPrompt || undefined,
          })
        });

        if (!response.ok) {
          setErrorMessage('No se pudo actualizar el resumen.');
          return;
        }

        const data = (await response.json()) as SummaryRouteResponse;
        const parsed = parseSummaryResponse(data);
        if (parsed) {
          setSummary(parsed, capturedLength);
          setErrorMessage(data.warning ?? null);
          if (data.usage) {
            addSummaryCost(data.usage.input_tokens, data.usage.output_tokens);
          }
        }
      } finally {
        pendingRef.current = false;
      }
    },
    []
  );

  useEffect(() => {
    if (status !== 'recording') return;

    const heartbeatTimer = setInterval(() => {
      void refreshSummary();
    }, HEARTBEAT_MS);

    const pauseTimer = setTimeout(() => {
      void refreshSummary();
    }, PAUSE_MS);

    return () => {
      clearInterval(heartbeatTimer);
      clearTimeout(pauseTimer);
    };
  }, [refreshSummary, status, fullTranscript]);

  useEffect(() => {
    if (previousStatusRef.current === 'recording' && status === 'idle') {
      void refreshSummary({ force: true });
    }
    previousStatusRef.current = status;
  }, [refreshSummary, status]);

  useEffect(() => {
    if (summarizedOffset === 0 && fullTranscript.trim()) {
      clearTimeout(editDebounceRef.current);
      editDebounceRef.current = setTimeout(() => {
        void refreshSummary({ force: true });
      }, 800);
    }
    return () => clearTimeout(editDebounceRef.current);
  }, [fullTranscript, summarizedOffset, refreshSummary]);
};
