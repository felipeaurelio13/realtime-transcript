'use client';

import { useMemo, useState } from 'react';
import { Card, PillButton } from '@/components/ui';
import { CostIndicator } from '@/components/cost-indicator';
import { SummaryView } from '@/components/summary-view';
import { TranscriptView } from '@/components/transcript-view';
import { useIncrementalSummary } from '@/hooks/useIncrementalSummary';
import { useRealtimeTranscription } from '@/hooks/useRealtimeTranscription';
import { summaryToText } from '@/lib/utils';
import { useLiveNotesStore } from '@/store/livenotes-store';

const APP_VERSION = 'v1.0.0';

export default function HomePage() {
  useIncrementalSummary();

  const status = useLiveNotesStore((state) => state.status);
  const errorMessage = useLiveNotesStore((state) => state.errorMessage);
  const liveTranscript = useLiveNotesStore((state) => state.liveTranscript);
  const committedTranscript = useLiveNotesStore((state) => state.committedTranscript);
  const currentSummary = useLiveNotesStore((state) => state.currentSummary);
  const contextPrompt = useLiveNotesStore((state) => state.contextPrompt);
  const setContextPrompt = useLiveNotesStore((state) => state.setContextPrompt);
  const [showContext, setShowContext] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const { start, stop } = useRealtimeTranscription();

  const startStopLabel = useMemo(() => {
    if (isConnecting) return 'Recording…';
    if (status === 'recording') return 'Stop';
    return 'Start';
  }, [isConnecting, status]);

  const toggleRecording = async () => {
    if (status === 'idle') {
      setIsConnecting(true);
      try {
        await start();
      } catch (error) {
        console.error('No se pudo iniciar la sesión realtime:', error);
      } finally {
        setIsConnecting(false);
      }
      return;
    }
    setIsConnecting(true);
    try {
      await stop();
    } finally {
      setIsConnecting(false);
    }
  };

  const copySummary = async () => {
    await navigator.clipboard.writeText(summaryToText(currentSummary));
  };

  const saveSession = () => {
    const payload = {
      transcript: committedTranscript,
      summary: currentSummary,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `livenotes-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex flex-col items-center gap-3 text-center">
        <h1 className="text-3xl font-semibold">LiveNotes</h1>
        <p className="text-sm text-muted">Habla una vez. Obtén transcripción y síntesis viva.</p>
        <button
          type="button"
          onClick={() => setShowContext((v) => !v)}
          className="text-xs text-muted underline underline-offset-2 hover:text-text transition"
        >
          {showContext ? 'Ocultar instrucciones' : 'Personalizar resumen'}
        </button>
        {showContext ? (
          <textarea
            value={contextPrompt}
            onChange={(e) => setContextPrompt(e.target.value)}
            placeholder="Ej: Eres un asistente de reuniones. Agrupa el resumen por país y destaca decisiones comerciales…"
            disabled={status === 'recording'}
            rows={2}
            className="w-full max-w-xl resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted/60 focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-60"
          />
        ) : null}
        {errorMessage ? (
          <p className="max-w-xl rounded-full border border-border bg-surface px-4 py-2 text-xs text-muted">
            {errorMessage}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => void toggleRecording()}
          disabled={isConnecting}
          className="mt-4 rounded-full bg-accent px-8 py-4 text-base font-medium text-accentForeground transition duration-smooth active:scale-95 disabled:opacity-70"
        >
          {startStopLabel}
        </button>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <Card title="Transcripción">
          <TranscriptView blocks={committedTranscript} liveText={liveTranscript} />
        </Card>

        <Card title="Resumen">
          <SummaryView summary={currentSummary} />
        </Card>
      </section>

      <footer className="mt-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted">{APP_VERSION}</p>
          <CostIndicator />
        </div>
        <div className="flex gap-3">
          <PillButton label="Copy" onClick={() => void copySummary()} />
          <PillButton label="Save" onClick={saveSession} kind="accent" />
        </div>
      </footer>
    </main>
  );
}
