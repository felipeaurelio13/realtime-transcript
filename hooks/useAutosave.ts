'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useLiveNotesStore } from '@/store/livenotes-store';
import { saveSession, loadSession, clearSavedSession, SavedSession } from '@/lib/autosave';

const AUTOSAVE_INTERVAL_MS = 30_000; // 30 seconds

export const useAutosave = () => {
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const save = useCallback(() => {
    const state = useLiveNotesStore.getState();
    if (!state.committedTranscript.length && !state.currentSummary.content) return;

    const session: SavedSession = {
      committedTranscript: state.committedTranscript,
      fullTranscript: state.fullTranscript,
      currentSummary: state.currentSummary,
      contextPrompt: state.contextPrompt,
      transcriptionCost: state.transcriptionCost,
      summaryCost: state.summaryCost,
      savedAt: Date.now(),
    };
    void saveSession(session);
  }, []);

  // Auto-save on interval
  useEffect(() => {
    timerRef.current = setInterval(save, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(timerRef.current);
  }, [save]);

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => save();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [save]);

  const restore = useCallback(async (): Promise<boolean> => {
    const saved = await loadSession();
    if (!saved || !saved.committedTranscript.length) return false;

    const store = useLiveNotesStore.getState();
    // Don't restore if there's already data in the current session
    if (store.committedTranscript.length > 0) return false;

    useLiveNotesStore.setState({
      committedTranscript: saved.committedTranscript,
      fullTranscript: saved.fullTranscript,
      currentSummary: saved.currentSummary,
      contextPrompt: saved.contextPrompt,
      transcriptionCost: saved.transcriptionCost,
      summaryCost: saved.summaryCost,
    });
    return true;
  }, []);

  const clear = useCallback(async () => {
    await clearSavedSession();
  }, []);

  return { save, restore, clear };
};
