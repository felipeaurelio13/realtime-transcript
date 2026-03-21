import { useLiveNotesStore } from '@/store/livenotes-store';
import { EMPTY_SUMMARY } from '@/lib/types';

describe('useLiveNotesStore', () => {
  beforeEach(() => {
    useLiveNotesStore.getState().reset();
  });

  it('commits live transcript blocks and appends full transcript', () => {
    const store = useLiveNotesStore.getState();
    store.updateLiveDelta('Hola');
    store.updateLiveDelta(' equipo');
    store.commitLiveTranscript();

    const next = useLiveNotesStore.getState();
    expect(next.committedTranscript).toHaveLength(1);
    expect(next.committedTranscript[0].text).toBe('Hola equipo');
    expect(next.fullTranscript).toBe('Hola equipo');
    expect(next.liveTranscript).toBe('');
  });

  it('updates summary watermark and current summary', () => {
    const summary = { content: '## Resumen\n\nPuntos clave: A, B' };

    useLiveNotesStore.getState().setSummary(summary, 'texto');
    const next = useLiveNotesStore.getState();
    expect(next.currentSummary).toEqual(summary);
    expect(next.lastSummarizedText).toBe('texto');
    expect(next.lastSummaryUpdateAt).toBeGreaterThan(0);
  });

  it('resets to initial state', () => {
    useLiveNotesStore.getState().updateLiveDelta('data');
    useLiveNotesStore.getState().setStatus('recording');
    useLiveNotesStore.getState().setErrorMessage('boom');
    useLiveNotesStore.getState().reset();

    const next = useLiveNotesStore.getState();
    expect(next.currentSummary).toEqual(EMPTY_SUMMARY);
    expect(next.status).toBe('idle');
    expect(next.errorMessage).toBeNull();
    expect(next.liveTranscript).toBe('');
  });

  it('can preserve live text while committing a completed block', () => {
    const store = useLiveNotesStore.getState();
    store.setLiveTranscript('texto en curso');
    store.commitLiveTranscript('bloque cerrado', { preserveLiveTranscript: true });

    const next = useLiveNotesStore.getState();
    expect(next.committedTranscript[0].text).toBe('bloque cerrado');
    expect(next.liveTranscript).toBe('texto en curso');
  });
});
