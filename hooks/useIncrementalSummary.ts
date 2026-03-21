'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useLiveNotesStore } from '@/store/livenotes-store';
import { parseSummaryResponse } from '@/lib/utils';
import { SummaryRouteResponse } from '@/lib/types';

const MIN_NEW_CHARS = 60;
const MIN_INTERVAL_MS = 3000;
const HEARTBEAT_MS = 5000;
const PAUSE_MS = 1500;

export const useIncrementalSummary = () => {
  const fullTranscript = useLiveNotesStore((state) => state.fullTranscript);
  const lastSummarizedText = useLiveNotesStore((state) => state.lastSummarizedText);
  const currentSummary = useLiveNotesStore((state) => state.currentSummary);
  const lastSummaryUpdateAt = useLiveNotesStore((state) => state.lastSummaryUpdateAt);
  const status = useLiveNotesStore((state) => state.status);
  const contextPrompt = useLiveNotesStore((state) => state.contextPrompt);
  const setSummary = useLiveNotesStore((state) => state.setSummary);
  const setErrorMessage = useLiveNotesStore((state) => state.setErrorMessage);
  const addSummaryCost = useLiveNotesStore((state) => state.addSummaryCost);

  const pendingRef = useRef(false);
  const previousStatusRef = useRef(status);
  const editDebounceRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const nextDelta = useMemo(() => {
    if (!fullTranscript.startsWith(lastSummarizedText)) {
      return fullTranscript;
    }
    return fullTranscript.slice(lastSummarizedText.length).trimStart();
  }, [fullTranscript, lastSummarizedText]);

  const refreshSummary = useCallback(
    async (reason: 'pause' | 'heartbeat' | 'stop', options?: { force?: boolean }) => {
      if (pendingRef.current || !nextDelta.trim()) return;
      if (!options?.force && nextDelta.length < MIN_NEW_CHARS) return;
      if (!options?.force && Date.now() - lastSummaryUpdateAt < MIN_INTERVAL_MS) return;

      pendingRef.current = true;
      try {
        const response = await fetch('/api/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            previousSummary: JSON.stringify(currentSummary),
            newTranscript: nextDelta,
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
          setSummary(parsed, fullTranscript);
          setErrorMessage(data.warning ?? null);
          if (data.usage) {
            addSummaryCost(data.usage.input_tokens, data.usage.output_tokens);
          }
        }
      } finally {
        pendingRef.current = false;
      }
    },
    [addSummaryCost, contextPrompt, currentSummary, fullTranscript, lastSummaryUpdateAt, nextDelta, setErrorMessage, setSummary]
  );

  useEffect(() => {
    let heartbeatTimer: NodeJS.Timeout | undefined;
    let pauseTimer: NodeJS.Timeout | undefined;

    if (status === 'recording') {
      heartbeatTimer = setInterval(() => {
        void refreshSummary('heartbeat');
      }, HEARTBEAT_MS);

      pauseTimer = setTimeout(() => {
        void refreshSummary('pause');
      }, PAUSE_MS);
    }

    return () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (pauseTimer) clearTimeout(pauseTimer);
    };
  }, [refreshSummary, status]);

  useEffect(() => {
    if (previousStatusRef.current === 'recording' && status === 'idle') {
      void refreshSummary('stop', { force: true });
    }

    previousStatusRef.current = status;
  }, [refreshSummary, status]);

  // Re-summarize when transcript is edited (lastSummarizedText resets to '')
  useEffect(() => {
    if (lastSummarizedText === '' && fullTranscript.trim()) {
      clearTimeout(editDebounceRef.current);
      editDebounceRef.current = setTimeout(() => {
        void refreshSummary('stop', { force: true });
      }, 800);
    }

    return () => clearTimeout(editDebounceRef.current);
  }, [fullTranscript, lastSummarizedText, refreshSummary]);
};
