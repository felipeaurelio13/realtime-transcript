import { create } from 'zustand';
import { EMPTY_SUMMARY, SummaryShape, TranscriptBlock } from '@/lib/types';
import { uid } from '@/lib/utils';

interface LiveNotesState {
  status: 'idle' | 'recording';
  liveTranscript: string;
  committedTranscript: TranscriptBlock[];
  fullTranscript: string;
  lastSummarizedText: string;
  currentSummary: SummaryShape;
  lastSummaryUpdateAt: number;
  setStatus: (status: 'idle' | 'recording') => void;
  updateLiveDelta: (delta: string) => void;
  commitLiveTranscript: (text?: string) => void;
  setSummary: (summary: SummaryShape, summarizedUntil: string) => void;
  reset: () => void;
}

const initialState = {
  status: 'idle' as const,
  liveTranscript: '',
  committedTranscript: [],
  fullTranscript: '',
  lastSummarizedText: '',
  currentSummary: EMPTY_SUMMARY,
  lastSummaryUpdateAt: 0
};

export const useLiveNotesStore = create<LiveNotesState>((set, get) => ({
  ...initialState,
  setStatus: (status) => set({ status }),
  updateLiveDelta: (delta) => set({ liveTranscript: `${get().liveTranscript}${delta}` }),
  commitLiveTranscript: (override) => {
    const currentText = (override ?? get().liveTranscript).trim();
    if (!currentText) {
      set({ liveTranscript: '' });
      return;
    }

    const block: TranscriptBlock = {
      id: uid(),
      text: currentText,
      createdAt: Date.now()
    };

    set((state) => ({
      liveTranscript: '',
      committedTranscript: [...state.committedTranscript, block],
      fullTranscript: state.fullTranscript ? `${state.fullTranscript}\n${currentText}` : currentText
    }));
  },
  setSummary: (summary, summarizedUntil) =>
    set({
      currentSummary: summary,
      lastSummarizedText: summarizedUntil,
      lastSummaryUpdateAt: Date.now()
    }),
  reset: () => set({ ...initialState })
}));
