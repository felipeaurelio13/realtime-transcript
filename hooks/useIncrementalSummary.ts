'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useLiveNotesStore } from '@/store/livenotes-store';
import { parseSummaryResponse } from '@/lib/utils';

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
  const setSummary = useLiveNotesStore((state) => state.setSummary);

  const pendingRef = useRef(false);

  const nextDelta = useMemo(() => {
    if (!fullTranscript.startsWith(lastSummarizedText)) {
      return fullTranscript;
    }
    return fullTranscript.slice(lastSummarizedText.length).trimStart();
  }, [fullTranscript, lastSummarizedText]);

  useEffect(() => {
    let heartbeatTimer: NodeJS.Timeout | undefined;
    let pauseTimer: NodeJS.Timeout | undefined;

    const refreshSummary = async (reason: 'pause' | 'heartbeat') => {
      if (pendingRef.current || nextDelta.length < MIN_NEW_CHARS) return;
      if (Date.now() - lastSummaryUpdateAt < MIN_INTERVAL_MS) return;

      pendingRef.current = true;
      try {
        const response = await fetch('/api/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            previousSummary: JSON.stringify(currentSummary),
            newTranscript: nextDelta,
            reason
          })
        });

        if (!response.ok) return;
        const data = await response.json();
        const parsed = parseSummaryResponse(data);
        if (parsed) {
          setSummary(parsed, fullTranscript);
        }
      } finally {
        pendingRef.current = false;
      }
    };

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
  }, [currentSummary, fullTranscript, lastSummaryUpdateAt, nextDelta, setSummary, status]);
};
